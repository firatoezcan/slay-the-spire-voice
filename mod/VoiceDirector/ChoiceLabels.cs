using System.Text.RegularExpressions;
using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.ControllerInput;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using MegaCrit.Sts2.Core.Map;
using MegaCrit.Sts2.Core.Nodes.Potions;
using MegaCrit.Sts2.Core.Nodes.Relics;
using MegaCrit.Sts2.Core.Nodes.Screens.ScreenContext;

namespace VoiceDirector;

public static class ChoiceLabels
{
    private static readonly AccessTools.FieldRef<NCardHolder, bool> CardClickable = AccessTools.FieldRefAccess<NCardHolder, bool>("_isClickable");
    private static NCardHolder? CardHolder(Node node)
    {
        for (Node? parent = node; parent is not null; parent = parent.GetParent())
            if (parent is NCardHolder holder) return holder;
        return null;
    }
    public static void Activate(NClickableControl button)
    {
        // Card holders listen to controller selection or mouse events, not ForceClick's Released signal.
        if (CardHolder(button) is { } holder)
            holder._GuiInput(new InputEventAction { Action = MegaInput.select, Pressed = true });
        else button.ForceClick();
    }
    public static IEnumerable<Node> Walk(Node root)
    {
        yield return root;
        foreach (var child in root.GetChildren()) foreach (var node in Walk(child)) yield return node;
    }
    public static bool Available(NClickableControl button)
    {
        if (!GodotObject.IsInstanceValid(button) || !button.IsVisibleInTree() || !button.IsEnabled || Director.RewardInstance is not null) return false;
        if (CardHolder(button) is { } holder && !CardClickable(holder)) return false;
        if (button is NMapPoint map && !(NMapScreen.Instance is { } mapScreen &&
            ((mapScreen.IsDebugTravelEnabled && !mapScreen.IsTraveling) || (mapScreen.IsTravelEnabled && map.State == MapPointState.Travelable)))) return false;
        var screen = ActiveScreenContext.Instance.GetCurrentScreen() as Node;
        // Combat controls also live in the global bar; overlays restrict actions to their own subtree.
        return screen is not null && (screen.GetType().Name == "NCombatRoom" || screen == button || screen.IsAncestorOf(button));
    }
    public static string? Describe(NClickableControl button)
    {
        if (button is NMapPoint map) return $"Travel to {map.Point.PointType} · row {map.Point.coord.row + 1}, path {map.Point.coord.col + 1}";
        if (button is NPotionHolder potion) return potion.HasPotion ? $"Use or discard {potion.Potion!.Model.Title.GetFormattedText()}" : null;
        if (button is NRelicInventoryHolder relic) return $"Inspect {relic.Relic.Model.Title.GetFormattedText()}";
        for (Node? parent = button; parent is not null; parent = parent.GetParent())
            if (parent is NCardHolder holder && holder.CardModel is { } card)
            {
                var peers = Walk(holder.GetParent()).OfType<NCardHolder>().Where(h => h.CardModel is not null).ToArray();
                return $"Select {card.Title} · {(card.Pile?.Type.ToString() ?? "option").ToLowerInvariant()} {Array.IndexOf(peers, holder) + 1}";
            }
        var texts = Walk(button).Select(n => n switch { Label label => label.Text, RichTextLabel rich => rich.Text, _ => "" })
            .Select(t => Regex.Replace(t, @"\[/?[^\]]+\]", "").Trim()).Where(t => t.Length > 0).Distinct().ToArray();
        var count = texts.FirstOrDefault(t => int.TryParse(t, out _));
        var name = button.GetType().Name;
        var known = name switch
        {
            "NDrawPileButton" => $"View draw pile ({count ?? "0"} cards)",
            "NDiscardPileButton" => $"View discard pile ({count ?? "0"} cards)",
            "NExhaustPileButton" => $"View exhausted cards ({count ?? "0"})",
            "NTopBarDeckButton" => $"View deck ({count ?? "0"} cards)",
            "NTopBarMapButton" => "Open map",
            "NTopBarPauseButton" => "Pause menu",
            "NTopBarBossIcon" => "View act boss",
            "NTopBarRoomIcon" => "View current room",
            "NTopBarFloorIcon" => $"View current floor ({count})",
            "NTopBarHp" => $"View health ({texts.FirstOrDefault()})",
            "NTopBarGold" => $"View gold ({count})",
            "NTopBarPortraitTip" => "View character",
            "NPotionShortcutButton" => Director.Player?.PotionSlots.Any(p => p is not null) == true ? "Choose a potion" : null,
            "NEndTurnButton" => "End turn",
            _ => null
        };
        if (known is not null || name == "NPotionShortcutButton") return known;
        // Display actual game copy, never node names, generated control IDs, or isolated counters.
        var meaningful = texts.Where(t => t.Any(char.IsLetter) && !t.StartsWith('@') && t != "Hitbox").ToArray();
        return meaningful.Length > 0 ? string.Join(" · ", meaningful.Take(2)) : null;
    }
}
