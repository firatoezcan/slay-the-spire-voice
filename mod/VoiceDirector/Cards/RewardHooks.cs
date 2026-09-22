using System.Reflection;
using System.Runtime.CompilerServices;
using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Rewards;

namespace VoiceDirector.Cards;

public static class RewardHooks
{
    private sealed class Binding { public CardModel? Card; public CardModel? Acquired; public string Key = ""; }
    private static readonly ConditionalWeakTable<CardReward, Binding> Bindings = new();
    private static CardReward? _active;
    private static TaskCompletionSource? _prompt;
    private static Label? _status;
    private static bool _pending;
    private static readonly Dictionary<string, int> Slots = LocalFiles.Read<Dictionary<string, int>>("reward-slots.json") ?? [];

    public static void BindSet(RewardsSet set)
    {
        if (Director.Player is null || !Director.Settings.Enabled || Director.Settings.Mode != "wildcard") return;
        for (var index = 0; index < set.Rewards.Count; index++)
        {
            if (set.Rewards[index] is not CardReward reward) continue;
            var binding = Bindings.GetOrCreateValue(reward);
            binding.Key = $"{Director.RunId}:{Director.CombatId}:{set.Id}:{index}";
            Bind(reward);
        }
    }
    public static void Bind(CardReward reward)
    {
        if (Director.Player is null || !Director.Settings.Enabled || Director.Settings.Mode != "wildcard") return;
        var binding = Bindings.GetOrCreateValue(reward);
        var cards = reward.Cards.ToArray();
        if (cards.Length == 0 || binding.Key.Length == 0) return;
        if (binding.Card is not null && cards.Contains(binding.Card)) return;
        if (binding.Card is not null) Lineage.Get(binding.Card).Wildcard = false;
        var slot = Slots.TryGetValue(binding.Key, out var saved) ? Math.Min(saved, cards.Length - 1) : Random.Shared.Next(cards.Length);
        binding.Card = cards[slot];
        Lineage.Get(binding.Card).Wildcard = true;
        Lineage.Get(binding.Card).RunId = Director.RunId;
        if (binding.Key.Length > 0) { Slots[binding.Key] = slot; LocalFiles.Write("reward-slots.json", Slots); }
    }
    public static void Start(CardReward reward) { Bind(reward); _active = reward; }
    public static async Task<CardPileAddResult> ObserveAddition(Task<CardPileAddResult> task, CardModel card)
    {
        var result = await task;
        if (_active is not null && Bindings.TryGetValue(_active, out var binding) && binding.Card == card && result.success)
        {
            var state = Lineage.Get(card);
            Lineage.Attach(result.cardAdded, state);
            binding.Acquired = result.cardAdded;
        }
        return result;
    }
    public static async Task<bool> AfterSelection(Task<bool> task, CardReward reward)
    {
        try
        {
            var success = await task;
            if (Bindings.TryGetValue(reward, out var binding) && binding.Acquired is { } card && !Lineage.Get(card).Resolved)
                await Prompt(card);
            return success;
        }
        finally { if (_active == reward) _active = null; }
    }
    private static async Task Prompt(CardModel card)
    {
        Director.RewardInstance = Lineage.Get(card).Id;
        _pending = false;
        _prompt = new TaskCompletionSource();
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
        try { await _prompt.Task; }
        finally { Director.RewardInstance = null; _prompt = null; _status = null; layer.QueueFree(); }
    }
    public static void Choose(string choice)
    {
        if (_prompt is null) throw new InvalidOperationException("No wildcard acquisition is active.");
        if (choice == "keep") { _prompt.TrySetResult(); return; }
        if (choice is not ("transform" or "lucky")) throw new ArgumentException("Unknown wildcard choice.");
        if (_pending) return;
        _pending = true;
        _status!.Text = "Generating… You can keep the wildcard while waiting. See the web debugger for progress.";
        Director.Events.Emit(choice == "lucky" ? "lucky-requested" : "transform-requested", Director.Resolve(Director.RewardInstance!), "Post-take generation requested.");
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
