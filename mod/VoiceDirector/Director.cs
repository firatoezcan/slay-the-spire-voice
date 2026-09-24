using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using VoiceDirector.Cards;
using VoiceDirector.Contracts;

namespace VoiceDirector;

public static class Director
{
    public static DirectorSettings Settings { get; private set; } = LocalFiles.Read<DirectorSettings>("director.json") ?? new();
    public static RunState? Run => RunManager.Instance?.DebugOnlyGetState();
    public static Player? Player => Run?.Players.FirstOrDefault(p => p.NetId == MegaCrit.Sts2.Core.Context.LocalContext.NetId);
    public static string RunId => Multiplayer.CardTransfer.RunId;
    public static string CombatId => $"{RunId}:{Run?.CurrentActIndex}:{Run?.CurrentMapPoint?.coord}:{Run?.CurrentRoomCount}";
    public static int Turn => Player?.PlayerCombatState?.TurnNumber ?? 0;
    public static readonly EventLog Events = new();
    private static readonly Dictionary<string, CandidateRequest> Candidates = LocalFiles.Read<Dictionary<string, CandidateRequest>>("candidates.json") ?? [];
    public static string? RewardInstance { get; set; }
    public static bool Busy { get; private set; }

    public static DirectorSettings Configure(DirectorSettings value)
    {
        if (Multiplayer.CardTransfer.IsMultiplayer && !Multiplayer.CardTransfer.IsAuthority)
            throw new InvalidOperationException("The host controls mod settings for this run.");
        DirectorSettingsRules.Validate(value);
        LocalFiles.Write("director.json", value);
        Settings = value;
        Multiplayer.CardTransfer.PublishSettings();
        return Settings;
    }
    internal static void ApplyHostSettings(DirectorSettings value) { DirectorSettingsRules.Validate(value); Settings = value; }
    internal static void RestoreLocalSettings() => Settings = LocalFiles.Read<DirectorSettings>("director.json") ?? new();

    public static CardModel Resolve(string id, bool combat = false)
    {
        var run = Run ?? throw new InvalidOperationException("Start a run first.");
        var cards = run.Players.SelectMany(player => combat ? player.PlayerCombatState?.AllCards ?? [] : player.Deck.Cards);
        return cards.FirstOrDefault(c => Lineage.Get(c).Id == id) ?? throw new ArgumentException("Card instance is no longer available.");
    }
    public static void Prepare(CandidateRequest request)
    {
        if (!Multiplayer.CardTransfer.IsAuthority) throw new InvalidOperationException("Only the host generates cards.");
        RequireRun(request.RunId);
        var card = Resolve(request.InstanceId);
        var state = Lineage.Get(card);
        if (!card.IsTransformable || card.Enchantment is not null || card.Affliction is not null)
            throw new InvalidOperationException("This card or its permanent modifiers cannot be transformed.");
        if (state.Resolved && state.Wildcard) throw new InvalidOperationException("This wildcard is already resolved.");
        if (request.Definition.Rarity != card.Rarity.ToString()) throw new ArgumentException("Replacement must preserve rarity.");
        CardRules.ValidateCandidate(request.Definition);
        DefinitionRegistry.Register(request.Definition);
        Multiplayer.CardTransfer.PublishDefinition(request.Definition.Id);
        Candidates[request.InstanceId] = request;
        LocalFiles.Write("candidates.json", Candidates);
        Events.Emit("candidate-ready", card, request.Definition.Id);
    }
    public static void RequireRun(string id)
    {
        if (!Multiplayer.CardTransfer.Active || string.IsNullOrEmpty(id) || id != RunId) throw new InvalidOperationException("Stale or unavailable run.");
    }

    public static async Task<CardModel> Drawn(CardModel card, PlayerChoiceContext context)
    {
        var definition = await Multiplayer.CardChoices.Draw(card, context, () => PickForDraw(card));
        return definition is null ? card : await Commit(card, definition);
    }
    private static string? PickForDraw(CardModel card)
    {
        var state = Lineage.Get(card);
        var turn = card.Owner.PlayerCombatState?.TurnNumber ?? 0;
        if (!Settings.Enabled || Busy || card.DeckVersion is null || state.Reserved) return null;
        if (!card.IsTransformable || !card.DeckVersion.IsTransformable || card.Enchantment is not null || card.Affliction is not null) return null;
        if (Settings.Mode == "wildcard" && (!state.Wildcard || state.Resolved)) return null;
        if (state.Wildcard && state.Resolved) return null;
        if (card.Rarity is not (CardRarity.Common or CardRarity.Uncommon or CardRarity.Rare or CardRarity.Basic)) return null;
        if (state.LastCombat == CombatId && turn - state.LastTurn <= Settings.CooldownTurns) return null;
        if (card.Owner.Deck.Cards.Count(c => Lineage.Get(c).LastCombat == CombatId && Lineage.Get(c).LastTurn == turn) >= Settings.MaxPerTurn) return null;
        if (!Candidates.TryGetValue(state.Id, out var candidate) || candidate.RunId != RunId) return null;
        // Persisted candidates must still satisfy today's admission policy.
        try { CardRules.ValidateCandidate(candidate.Definition); }
        catch (ArgumentException) { Candidates.Remove(state.Id); LocalFiles.Write("candidates.json", Candidates); return null; }
        return candidate.Definition.Id;
    }

    public static async Task<CardModel> Commit(CardModel original, string definitionId)
    {
        var state = Lineage.Get(original);
        var turn = original.Owner.PlayerCombatState?.TurnNumber ?? 0;
        if (Busy || state.Reserved || (state.Wildcard && state.Resolved)) throw new InvalidOperationException("Card is not eligible.");
        if (state.LastCombat == CombatId && state.LastTurn == turn) throw new InvalidOperationException("Card already transformed this turn.");
        var canonical = DefinitionRegistry.Canonical(definitionId);
        CardRules.ValidateCandidate(DefinitionRegistry.Get(definitionId));
        var persistent = original.DeckVersion ?? original;
        if (!original.IsTransformable || !persistent.IsTransformable || original.Pile is null || persistent.Pile is null)
            throw new InvalidOperationException("Card cannot be transformed in its current state.");
        if (canonical.Rarity != original.Rarity) throw new InvalidOperationException("Rarity mismatch.");
        if (original.Enchantment is not null || original.Affliction is not null) throw new InvalidOperationException("Cards with permanent modifiers cannot be transformed.");
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
            state.LastTurn = turn;
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
