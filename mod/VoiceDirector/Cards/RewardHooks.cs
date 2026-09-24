using System.Reflection;
using System.Runtime.CompilerServices;
using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.GameActions;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Rewards;
using VoiceDirector.Multiplayer;

namespace VoiceDirector.Cards;

public static class RewardHooks
{
    private sealed class Binding { public CardModel? Card; public CardModel? Acquired; public string Key = ""; }
    private sealed class Pending(CardModel card)
    {
        public readonly CardModel Card = card;
        public readonly TaskCompletionSource<int> Choice = new();
        public readonly TaskCompletionSource<string?> Definition = new();
        public readonly TaskCompletionSource Completed = new();
        public bool Requested;
    }
    private static readonly ConditionalWeakTable<CardReward, Binding> Bindings = new();
    private static readonly ConditionalWeakTable<CardModel, Binding> CardBindings = new();
    private static readonly Dictionary<string, Pending> PendingRewards = [];
    private static Pending? _prompt;
    private static Label? _status;
    public static bool Waiting => PendingRewards.Count > 0;
    public static void Clear()
    {
        foreach (var pending in PendingRewards.Values)
        { pending.Choice.TrySetCanceled(); pending.Definition.TrySetCanceled(); pending.Completed.TrySetCanceled(); }
        PendingRewards.Clear();
        _prompt = null; _status = null; Director.RewardInstance = null;
    }

    public static void BindSet(RewardsSet set)
    {
        if (Director.Run is null || !Director.Settings.Enabled || Director.Settings.Mode != "wildcard") return;
        for (var index = 0; index < set.Rewards.Count; index++)
        {
            if (set.Rewards[index] is not CardReward reward) continue;
            var binding = Bindings.GetOrCreateValue(reward);
            binding.Key = $"{Director.RunId}:{Director.CombatId}:{reward.Player.NetId}:{set.Id}:{index}";
            Bind(reward);
        }
    }
    public static void Bind(CardReward reward)
    {
        if (Director.Run is null || !Director.Settings.Enabled || Director.Settings.Mode != "wildcard") return;
        var binding = Bindings.GetOrCreateValue(reward);
        var cards = reward.Cards.ToArray();
        if (cards.Length == 0 || binding.Key.Length == 0) return;
        if (binding.Card is not null && cards.Contains(binding.Card)) return;
        if (binding.Card is not null) { Lineage.Get(binding.Card).Wildcard = false; CardBindings.Remove(binding.Card); }
        var slot = (int)(Convert.ToUInt32(Lineage.StableId(binding.Key)[..8], 16) % cards.Length);
        binding.Card = cards[slot];
        var lineage = Lineage.Get(binding.Card);
        if (lineage.Id.Length == 0) lineage.Id = Lineage.StableId($"{binding.Key}/{slot}");
        Lineage.Get(binding.Card).Wildcard = true;
        Lineage.Get(binding.Card).RunId = Director.RunId;
        CardBindings.Add(binding.Card, binding);
    }
    public static void Start(CardReward reward) => Bind(reward);
    public static async Task<CardPileAddResult> ObserveAddition(Task<CardPileAddResult> task, CardModel card)
    {
        var result = await task;
        if (CardBindings.TryGetValue(card, out var binding) && result.success)
        {
            var state = Lineage.Get(card);
            Lineage.Attach(result.cardAdded, state);
            binding.Acquired = result.cardAdded;
        }
        return result;
    }
    public static async Task<bool> AfterSelection(Task<bool> task, CardReward reward)
    {
        var success = await task;
        if (Bindings.TryGetValue(reward, out var binding) && binding.Acquired is { } card && !Lineage.Get(card).Resolved)
            await ResolveChoice(card);
        return success;
    }
    private static async Task ResolveChoice(CardModel card)
    {
        var id = Lineage.Get(card).Id;
        var pending = new Pending(card);
        PendingRewards.Add(id, pending);
        var local = LocalContext.IsMe(card.Owner) && RunManager.Instance.NetService.Type != NetGameType.Replay;
        var synchronizer = RunManager.Instance.PlayerChoiceSynchronizer;
        var choiceId = synchronizer.ReserveChoiceId(card.Owner);
        CanvasLayer? layer = null;
        try
        {
            if (local) layer = Prompt(pending);
            var choice = local ? await pending.Choice.Task : (await synchronizer.WaitForRemoteChoice(card.Owner, choiceId)).AsIndex();
            if (local) synchronizer.SyncLocalChoice(card.Owner, choiceId, PlayerChoiceResult.FromIndex(choice));
            if (choice == 0) return;
            if (choice is not (1 or 2)) throw new InvalidDataException("Unknown wildcard choice.");
            pending.Requested = true;
            var definitionChoiceId = synchronizer.ReserveChoiceId(card.Owner);
            if (CardTransfer.IsAuthority)
                Director.Events.Emit(choice == 2 ? "lucky-requested" : "transform-requested", card, "Post-take generation requested.");
            PlayerChoiceResult result;
            if (local)
            {
                var definition = await pending.Definition.Task;
                result = PlayerChoiceResult.FromCanonicalCard(definition is null ? null : DefinitionRegistry.Canonical(definition));
                synchronizer.SyncLocalChoice(card.Owner, definitionChoiceId, result);
            }
            else result = await synchronizer.WaitForRemoteChoice(card.Owner, definitionChoiceId);
            if (result.AsCanonicalCard() is GeneratedCard generated) await Director.Commit(card, generated.DefinitionId);
        }
        catch (Exception error) { pending.Completed.TrySetException(error); throw; }
        finally
        {
            PendingRewards.Remove(id);
            pending.Completed.TrySetResult();
            if (local) { Director.RewardInstance = null; _prompt = null; _status = null; layer?.QueueFree(); }
        }
    }
    public static async Task Complete(string instanceId, string definitionId)
    {
        if (!PendingRewards.TryGetValue(instanceId, out var pending) || !pending.Requested)
            throw new InvalidOperationException("This player is no longer waiting for a wildcard transformation.");
        var definition = DefinitionRegistry.Get(definitionId);
        VoiceDirector.Contracts.CardRules.ValidateCandidate(definition);
        if (definition.Rarity != pending.Card.Rarity.ToString()) throw new InvalidOperationException("Rarity mismatch.");
        CardChoices.CompleteReward(pending.Card, definitionId);
        await pending.Completed.Task;
    }
    public static void Receive(string definitionId)
    {
        if (_prompt is { Requested: true }) _prompt.Definition.TrySetResult(definitionId);
    }
    private static CanvasLayer Prompt(Pending pending)
    {
        var card = pending.Card;
        Director.RewardInstance = Lineage.Get(card).Id;
        _prompt = pending;
        var layer = new CanvasLayer { Layer = 100 };
        var shade = new ColorRect { Color = new Color(0, 0, 0, 0.8f), MouseFilter = Control.MouseFilterEnum.Stop };
        shade.SetAnchorsAndOffsetsPreset(Control.LayoutPreset.FullRect);
        var center = new CenterContainer(); center.SetAnchorsAndOffsetsPreset(Control.LayoutPreset.FullRect);
        var panel = new VBoxContainer { CustomMinimumSize = new Vector2(900, 0) };
        panel.AddThemeFontSizeOverride("font_size", 28);
        panel.AddThemeConstantOverride("separation", 12);
        panel.AddChild(new Label { Text = "WILDCARD ACQUIRED", HorizontalAlignment = HorizontalAlignment.Center });
        panel.AddChild(new Label { Text = card.Title, HorizontalAlignment = HorizontalAlignment.Center });
        _status = new Label { Text = "Keep its one transformation for a later draw, or resolve it now.", AutowrapMode = TextServer.AutowrapMode.WordSmart };
        panel.AddChild(_status);
        foreach (var option in new[] { ("Keep wildcard", "keep"), ("Transform", "transform"), ("I'm feeling lucky", "lucky") })
        {
            var button = new Button { Text = option.Item1, CustomMinimumSize = new Vector2(0, 72) };
            button.Pressed += () => Choose(option.Item2);
            panel.AddChild(button);
        }
        center.AddChild(panel); shade.AddChild(center); layer.AddChild(shade);
        ((SceneTree)Engine.GetMainLoop()).Root.AddChild(layer);
        Director.Events.Emit("wildcard-acquired", card, "Choose whether to transform now.");
        return layer;
    }
    public static void Choose(string choice)
    {
        var pending = _prompt ?? throw new InvalidOperationException("No wildcard acquisition is active.");
        if (choice == "keep") { pending.Choice.TrySetResult(0); pending.Definition.TrySetResult(null); return; }
        if (choice is not ("transform" or "lucky")) throw new ArgumentException("Unknown wildcard choice.");
        if (!pending.Choice.TrySetResult(choice == "lucky" ? 2 : 1)) return;
        if (_status is not null) _status.Text = "Generating… You can keep the wildcard while waiting. See the web debugger for progress.";
    }
}

[HarmonyPatch(typeof(RewardsSetSynchronizer), nameof(RewardsSetSynchronizer.BeginRewardsSet))]
public static class BindRewardSetPatch { public static void Postfix(RewardsSet set) => RewardHooks.BindSet(set); }
[HarmonyPatch(typeof(CardReward), nameof(CardReward.Populate))]
public static class BindWildcardPatch { public static void Postfix(CardReward __instance) => RewardHooks.Bind(__instance); }
[HarmonyPatch(typeof(CardReward), "OnSelect")]
public static class WildcardAcquisitionPatch
{
    public static void Prefix(CardReward __instance) => RewardHooks.Start(__instance);
    public static void Postfix(CardReward __instance, ref Task<bool> __result) => __result = RewardHooks.AfterSelection(__result, __instance);
}
[HarmonyPatch(typeof(CardPileCmd), nameof(CardPileCmd.Add), [typeof(CardModel), typeof(PileType), typeof(CardPilePosition), typeof(AbstractModel), typeof(bool)])]
public static class AcquiredCardPatch
{
    public static void Postfix(CardModel card, PileType newPileType, ref Task<CardPileAddResult> __result)
    { if (newPileType == PileType.Deck) __result = RewardHooks.ObserveAddition(__result, card); }
}
[HarmonyPatch(typeof(CardModel), "get_Title")]
public static class WildcardTitlePatch
{
    public static void Postfix(CardModel __instance, ref string __result)
    { if (!__instance.IsCanonical && Lineage.Get(__instance) is { Wildcard: true, Resolved: false }) __result += " ◈"; }
}
