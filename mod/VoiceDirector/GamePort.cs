using System.Collections.Concurrent;
using System.Reflection;
using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.DevConsole.ConsoleCommands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.GameActions;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
using MegaCrit.Sts2.Core.Runs;
using VoiceDirector.Cards;
using VoiceDirector.Contracts;

namespace VoiceDirector;

public sealed class GamePort : IGamePort
{
    private readonly ConcurrentDictionary<string, Operation> _operations = new();
    private readonly Dictionary<string, NClickableControl> _choices = [];
    private long _revision;
    private string _snapshotContent = "";
    private readonly Dictionary<string, AbstractConsoleCmd> _console = typeof(CardModel).Assembly.GetTypes()
        .Where(t => !t.IsAbstract && typeof(AbstractConsoleCmd).IsAssignableFrom(t) && t.GetConstructor(Type.EmptyTypes) is not null)
        .Select(t => (AbstractConsoleCmd)Activator.CreateInstance(t)!).ToDictionary(c => c.CmdName);

    public Task<GameSnapshot> Snapshot() => GameThread.Run(() =>
    {
        var player = Director.Player;
        var runId = Director.RunId;
        _choices.Clear();
        var root = (Engine.GetMainLoop() as SceneTree)?.Root;
        if (root is not null)
            foreach (var button in ChoiceLabels.Walk(root).OfType<NClickableControl>().Where(b => ChoiceLabels.Available(b) && ChoiceLabels.Describe(b) is not null))
                _choices[button.GetInstanceId().ToString()] = button;
        var cards = Director.Run?.Players.SelectMany(p => p.Deck.Cards.Concat(p.PlayerCombatState?.AllCards ?? [])).Select(View).ToArray() ?? [];
        var creatures = player?.Creature.CombatState?.Creatures.Select(c => new CreatureView(c.CombatId.ToString() ?? "player", c.Name, c.CurrentHp, c.MaxHp, c.Block, c.IsEnemy)).ToArray() ?? [];
        var choices = _choices.Select(kv => new ChoiceView(kv.Key, kv.Value.GetType().Name, ChoiceLabels.Describe(kv.Value)!, true)).ToList();
        if (Director.RewardInstance is { } reward)
            choices.AddRange(new[] { "keep", "transform", "lucky" }.Select(c => new ChoiceView("wildcard:" + c, "wildcard", c, true)));
        var phase = Multiplayer.CardTransfer.Ended ? "ended" : RewardHooks.Waiting ? "wildcard-acquired" : player?.PlayerCombatState is not null && !CombatManager.Instance.IsOverOrEnding ? "combat" : Director.Run?.CurrentRoom?.GetType().Name ?? "menu";
        var state = new GameSnapshot(runId, 0, phase, Director.Turn, cards, creatures, choices.ToArray(),
            phase == "combat" ? ["play", "endTurn", "choose", "usePotion"] : ["choose"], Director.Settings, Multiplayer.CardTransfer.IsAuthority);
        var serialized = System.Text.Json.JsonSerializer.Serialize(state, LocalFiles.Json);
        if (serialized != _snapshotContent) { _revision++; _snapshotContent = serialized; }
        return state with { Revision = _revision };
    });
    internal static CardInstance View(CardModel card)
    {
        var state = Lineage.Get(card);
        return new(state.Id, card.Id.ToString(), (card as GeneratedCard)?.DefinitionId, card.Title, card.Rarity.ToString(), card.Type.ToString(),
            card.EnergyCost.GetWithModifiers(CostModifiers.All), card.CurrentUpgradeLevel, card.Pile?.Type.ToString() ?? "None", card.GetDescriptionForPile(card.Pile?.Type ?? PileType.None),
            state.Wildcard, state.Resolved, state.LastTurn,
            card.Owner.NetId.ToString(), card.Owner == Director.Player ? "You" : MegaCrit.Sts2.Core.Platform.PlatformUtil.GetPlayerNameRaw(RunManager.Instance.NetService.Platform, card.Owner.NetId), MegaCrit.Sts2.Core.Context.LocalContext.IsMe(card.Owner));
    }
    private Creature? Target(string? id) => id is null ? null : Director.Player?.Creature.CombatState?.Creatures.FirstOrDefault(c => c.CombatId.ToString() == id)
        ?? throw new ArgumentException("Target is no longer available.");

    private Task<Operation> Execute(string id, string kind, Func<Task> action, bool dispatchOnly = false)
    {
        if (string.IsNullOrWhiteSpace(id)) throw new ArgumentException("Request ID is required.");
        var operation = new Operation(id, kind, "queued", null, DateTimeOffset.UtcNow, null);
        if (!_operations.TryAdd(id, operation)) return Task.FromResult(_operations[id]);
        _ = GameThread.RunAsync(async () =>
        {
            try
            {
                _operations[id] = operation with { Status = "running" };
                await action();
                _operations[id] = operation with { Status = dispatchOnly ? "dispatched" : "succeeded", CompletedAt = dispatchOnly ? null : DateTimeOffset.UtcNow };
            }
            catch (Exception e) { _operations[id] = operation with { Status = "failed", Error = e.GetBaseException().Message, CompletedAt = DateTimeOffset.UtcNow }; }
            return true;
        });
        return Task.FromResult(operation);
    }
    public Task<Capabilities> Capabilities() => GameThread.Run(() => new Capabilities("0.107.1", Director.Player is not null, CardRules.EffectKinds, CardRules.Powers, false));
    public Task<CardSyncStatus> CardSync() => GameThread.Run(() => Multiplayer.CardTransfer.Status());
    public Task<CardSyncStatus> ResyncCards(CardSyncRequest request) => GameThread.Run(() =>
    {
        if (!ulong.TryParse(request.PlayerId, out var peer)) throw new ArgumentException("Choose a connected player.");
        Multiplayer.CardTransfer.Resync(peer);
        return Multiplayer.CardTransfer.Status();
    });
    public Task<CardDefinition[]> Definitions() => GameThread.Run(DefinitionRegistry.All);
    public Task<CardReference[]> CardReferences() => GameThread.Run(ReferenceLibrary.Cards);
    public Task<ArtReferenceSheet> ArtReference(ArtReferenceRequest request) => GameThread.Run(() => ReferenceLibrary.Art(request.ModelId));
    public Task<CardValidation> ValidateCard(CardDefinition request)
    {
        try { CardRules.ValidateCandidate(request); return Task.FromResult(new CardValidation(true, null)); }
        catch (ArgumentException e) { return Task.FromResult(new CardValidation(false, e.Message)); }
    }
    public Task<GameEvent[]> Events() => GameThread.Run(Director.Events.All);
    public Task<Operation[]> Operations() => Task.FromResult(_operations.Values.OrderByDescending(o => o.CreatedAt).Take(500).ToArray());
    public Task<ConsoleCommand[]> ConsoleCommands() => Task.FromResult(_console.Values.Select(c => new ConsoleCommand(c.CmdName, c.Args, c.Description, c.DebugOnly)).ToArray());
    public Task<string[]> Complete(ConsoleCompletionRequest request) => GameThread.Run(() =>
    {
        if (!_console.TryGetValue(request.Command, out var command)) return _console.Keys.Where(k => k.StartsWith(request.Command)).ToArray();
        var result = command.GetArgumentCompletions(Director.Player, request.Arguments);
        return result.Candidates.ToArray();
    });
    public Task<ConsoleArgument[]> ConsoleArguments(ConsoleCompletionRequest request) => GameThread.Run(() =>
        _console.TryGetValue(request.Command, out var command) ? ConsoleForms.Arguments(command, request.Arguments) : throw new ArgumentException("Unknown console command."));
    public Task<Operation> Console(ConsoleRequest request) => Execute(request.RequestId, "console", async () =>
    {
        if (!Director.Settings.DebugConsole) throw new InvalidOperationException("Debug console is disabled.");
        if (!_console.TryGetValue(request.Command, out var command)) throw new ArgumentException("Unknown console command.");
        var result = command.Process(Director.Player, ConsoleForms.ResolveArguments(command, request.Arguments));
        if (!result.success) throw new InvalidOperationException(result.msg);
        if (result.task is not null) await result.task;
    });
    public Task<Operation> Play(PlayRequest request) => Execute(request.RequestId, "play", () =>
    {
        Director.RequireRun(request.RunId);
        var card = Director.Resolve(request.InstanceId, true);
        if (card.Owner != Director.Player) throw new InvalidOperationException("Choose a card from your own hand.");
        if (!card.TryManualPlay(Target(request.TargetId))) throw new InvalidOperationException("Card cannot be played now.");
        return Task.CompletedTask;
    }, true);
    public Task<Operation> EndTurn(ActionRequest request) => Execute(request.RequestId, "end-turn", () =>
    {
        Director.RequireRun(request.RunId);
        var player = Director.Player!;
        if (player.PlayerCombatState is null || CombatManager.Instance.IsOverOrEnding) throw new InvalidOperationException("No active player turn.");
        RunManager.Instance.ActionQueueSynchronizer.RequestEnqueue(new EndPlayerTurnAction(player, Director.Turn));
        return Task.CompletedTask;
    }, true);
    public Task<Operation> Choose(ChoiceRequest request) => Execute(request.RequestId, "choose", () =>
    {
        if (request.RunId != Director.RunId) throw new InvalidOperationException("Stale run.");
        if (request.ChoiceId.StartsWith("wildcard:")) { RewardHooks.Choose(request.ChoiceId[9..]); return Task.CompletedTask; }
        if (!_choices.TryGetValue(request.ChoiceId, out var button) || !ChoiceLabels.Available(button))
            throw new InvalidOperationException("Choice is no longer available; refresh state.");
        ChoiceLabels.Activate(button);
        return Task.CompletedTask;
    }, true);
    public Task<Operation> UsePotion(PotionRequest request) => Execute(request.RequestId, "potion", () =>
    {
        Director.RequireRun(request.RunId);
        var player = Director.Player!;
        if (request.Slot < 0 || request.Slot >= player.PotionSlots.Count || player.PotionSlots[request.Slot] is not { } potion) throw new ArgumentException("Empty potion slot.");
        potion.EnqueueManualUse(Target(request.TargetId));
        return Task.CompletedTask;
    }, true);
    public Task<Operation> Prepare(CandidateRequest request) => Execute("candidate:" + request.RunId + ":" + request.InstanceId + ":" + request.Definition.Id, "prepare", () => { Director.Prepare(request); return Task.CompletedTask; });
    public Task<Operation> Transform(TransformRequest request) => Execute(request.RequestId, "transform", async () =>
    {
        Director.RequireRun(request.RunId);
        await RewardHooks.Complete(request.InstanceId, request.DefinitionId);
    });
    public Task<Operation> Art(ArtRequest request) => Execute("art:" + request.DefinitionId, "art", () =>
    {
        if (!Multiplayer.CardTransfer.IsAuthority) throw new InvalidOperationException("Only the host supplies artwork.");
        var png = CardArtwork.Prepare(Convert.FromBase64String(request.PngBase64));
        DefinitionRegistry.SetArt(request.DefinitionId, png);
        Multiplayer.CardTransfer.PublishArtwork(request.DefinitionId);
        return Task.CompletedTask;
    });
    public Task<DirectorSettings> Configure(DirectorSettings request) => GameThread.Run(() => Director.Configure(request));
    public Task<VoiceStatus> VoiceStatus() => GameThread.Run(Voice.AmbientVoice.Status);
    public Task<VoiceStatus> ConfigureVoice(VoiceSettings request) => GameThread.Run(() => Voice.AmbientVoice.Configure(request));
    public Task<VoiceSegment[]> VoiceSegments() => GameThread.Run(Voice.AmbientVoice.Drain);
}
