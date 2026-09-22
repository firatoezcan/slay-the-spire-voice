using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using VoiceDirector.Cards;
using VoiceDirector.Contracts;

namespace VoiceDirector;

public static class Director
{
    public static DirectorSettings Settings { get; private set; } = LocalFiles.Read<DirectorSettings>("director.json") ?? new();
    public static RunState? Run => RunManager.Instance?.DebugOnlyGetState();
    public static Player? Player => Run?.Players.Count == 1 && RunManager.Instance.NetService.Type == NetGameType.Singleplayer ? Run.Players[0] : null;
    private static RunState? _lastRun;
    private static string _runId = "";
    public static string RunId
    {
        get
        {
            if (Run is not { } run || Player is not { } player) return "";
            var saved = player.Deck.Cards.Select(c => Lineage.Get(c).RunId).FirstOrDefault(id => id.Length > 0);
            if (run != _lastRun) { _lastRun = run; _runId = saved ?? Guid.NewGuid().ToString("N"); }
            if (saved is not null) _runId = saved;
            foreach (var card in player.Deck.Cards) Lineage.Get(card).RunId = _runId;
            return _runId;
        }
    }
    public static string CombatId => $"{RunId}:{Run?.CurrentActIndex}:{Run?.CurrentMapPoint?.coord}:{Run?.CurrentRoomCount}";
    public static int Turn => Player?.PlayerCombatState?.TurnNumber ?? 0;
    public static readonly EventLog Events = new();
    private static readonly Dictionary<string, CandidateRequest> Candidates = LocalFiles.Read<Dictionary<string, CandidateRequest>>("candidates.json") ?? [];
    public static string? RewardInstance { get; set; }
    public static bool Busy { get; private set; }

    public static DirectorSettings Configure(DirectorSettings value)
    {
        if (value.Mode is not ("wildcard" or "living-deck") || value.DrawChance is < 0 or > 1 || value.MaxPerTurn is < 1 or > 10 || value.CooldownTurns is < 0 or > 20 || value.Strength is < 0 or > 1 || value.Synergy is < 0 or > 1)
            throw new ArgumentException("Settings are outside supported ranges.");
        LocalFiles.Write("director.json", value);
        return Settings = value;
    }

    public static CardModel Resolve(string id, bool combat = false)
    {
        var player = Player ?? throw new InvalidOperationException("A single-player run is required.");
        var cards = combat ? player.PlayerCombatState?.AllCards ?? [] : player.Deck.Cards;
        return cards.FirstOrDefault(c => Lineage.Get(c).Id == id) ?? throw new ArgumentException("Card instance is no longer available.");
    }
    public static void Prepare(CandidateRequest request)
    {
        RequireRun(request.RunId);
        var card = Resolve(request.InstanceId);
        var state = Lineage.Get(card);
        if (state.Protected || !card.IsTransformable || card.Enchantment is not null || card.Affliction is not null)
            throw new InvalidOperationException("This card is protected from transformation.");
        if (state.Resolved && state.Wildcard) throw new InvalidOperationException("This wildcard is already resolved.");
        if (request.Definition.Rarity != card.Rarity.ToString()) throw new ArgumentException("Replacement must preserve rarity.");
        CardRules.ValidateCandidate(request.Definition);
        DefinitionRegistry.Register(request.Definition);
        Candidates[request.InstanceId] = request;
        LocalFiles.Write("candidates.json", Candidates);
        Events.Emit("candidate-ready", card, request.Definition.Id);
    }
    public static void RequireRun(string id)
    {
        if (string.IsNullOrEmpty(id) || id != RunId) throw new InvalidOperationException("Stale or unavailable run.");
    }

    public static async Task<CardModel> Drawn(CardModel card)
    {
        var state = Lineage.Get(card);
        if (!Settings.Enabled || Busy || card.DeckVersion is null || state.Protected || state.Reserved) return card;
        if (!card.IsTransformable || !card.DeckVersion.IsTransformable || card.Enchantment is not null || card.Affliction is not null) return card;
        if (Settings.Mode == "wildcard" && (!state.Wildcard || state.Resolved)) return card;
        if (state.Wildcard && state.Resolved) return card;
        if (card.Rarity is not (CardRarity.Common or CardRarity.Uncommon or CardRarity.Rare or CardRarity.Basic)) return card;
        if (state.LastCombat == CombatId && Turn - state.LastTurn <= Settings.CooldownTurns) return card;
        if ((Player?.Deck.Cards.Count(c => Lineage.Get(c).LastCombat == CombatId && Lineage.Get(c).LastTurn == Turn) ?? 0) >= Settings.MaxPerTurn) return card;
        if (!Candidates.TryGetValue(state.Id, out var candidate) || candidate.RunId != RunId) return card;
        // Persisted candidates must still satisfy today's admission policy.
        try { CardRules.ValidateCandidate(candidate.Definition); }
        catch (ArgumentException) { Candidates.Remove(state.Id); LocalFiles.Write("candidates.json", Candidates); return card; }
        if (Random.Shared.NextDouble() >= Settings.DrawChance) return card;
        return await Commit(card, candidate.Definition.Id);
    }

    public static async Task<CardModel> Commit(CardModel original, string definitionId)
    {
        var state = Lineage.Get(original);
        if (Busy || state.Reserved || state.Protected || (state.Wildcard && state.Resolved)) throw new InvalidOperationException("Card is not eligible.");
        if (state.LastCombat == CombatId && state.LastTurn == Turn) throw new InvalidOperationException("Card already transformed this turn.");
        var canonical = DefinitionRegistry.Canonical(definitionId);
        CardRules.ValidateCandidate(DefinitionRegistry.Get(definitionId));
        var persistent = original.DeckVersion ?? original;
        if (!original.IsTransformable || !persistent.IsTransformable || original.Pile is null || persistent.Pile is null)
            throw new InvalidOperationException("Card cannot be transformed in its current state.");
        if (canonical.Rarity != original.Rarity) throw new InvalidOperationException("Rarity mismatch.");
        if (original.Enchantment is not null || original.Affliction is not null) throw new InvalidOperationException("Cards with permanent modifiers are protected.");
        Busy = state.Reserved = true;
        try
        {
            var deck = original.DeckVersion ?? original;
            var replacement = deck.Owner.RunState.CreateCard(canonical, deck.Owner);
            for (var n = 0; n < deck.CurrentUpgradeLevel && replacement.IsUpgradable; n++) CardCmd.Upgrade(replacement, CardPreviewStyle.None);
            Lineage.Attach(replacement, state);
            var deckResult = await CardCmd.Transform(deck, replacement, CardPreviewStyle.None);
            if (deckResult is not { success: true, cardAdded: { } newDeck }) throw new InvalidOperationException("Deck transformation was refused.");
            Lineage.Attach(newDeck, state);
            CardModel result = newDeck;
            if (original.DeckVersion is not null)
            {
                var combatReplacement = original.CombatState!.CreateCard(newDeck.CanonicalInstance, original.Owner);
                for (var n = 0; n < newDeck.CurrentUpgradeLevel && combatReplacement.IsUpgradable; n++) CardCmd.Upgrade(combatReplacement, CardPreviewStyle.None);
                Lineage.Attach(combatReplacement, state);
                var combatResult = await CardCmd.Transform(original, combatReplacement, CardPreviewStyle.None);
                if (combatResult is not { success: true, cardAdded: { } newCombat }) throw new InvalidOperationException("Combat transformation failed after deck replacement.");
                newCombat.DeckVersion = newDeck;
                result = newCombat;
            }
            state.Resolved = state.Wildcard || state.Resolved;
            state.LastTurn = Turn;
            state.LastCombat = CombatId;
            Candidates.Remove(state.Id);
            LocalFiles.Write("candidates.json", Candidates);
            Events.Emit("transformed", result, "A ready candidate replaced this card.");
            return result;
        }
        finally { Busy = state.Reserved = false; }
    }
}

public sealed class EventLog
{
    private readonly List<GameEvent> _items = [];
    private readonly HashSet<string> _artRequests = [];
    public GameEvent[] All() => _items.ToArray();
    public void Emit(string kind, CardModel? card, string message)
    {
        var definition = (card as GeneratedCard)?.DefinitionId;
        if (kind == "art-requested" && (definition is null || !_artRequests.Add(definition))) return;
        _items.Add(new(Guid.NewGuid().ToString("N"), Director.RunId, kind,
            card is null ? null : Lineage.Get(card).Id, definition, message, DateTimeOffset.UtcNow));
        if (_items.Count > 2000) _items.RemoveRange(0, 1000);
    }
}
