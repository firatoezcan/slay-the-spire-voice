using System.Runtime.CompilerServices;
using System.Text.Json;
using HarmonyLib;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Saves.Runs;

namespace VoiceDirector.Cards;

public sealed class CardLineage
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string RunId { get; set; } = "";
    public bool Wildcard { get; set; }
    public bool Resolved { get; set; }
    public bool Protected { get; set; }
    public int LastTurn { get; set; } = -1;
    public string LastCombat { get; set; } = "";
    public bool Reserved { get; set; }
}

public static class Lineage
{
    public const string Property = "VoiceDirector_Lineage";
    private static readonly ConditionalWeakTable<CardModel, CardLineage> Table = new();
    public static CardLineage Get(CardModel card) => Table.GetOrCreateValue(card.DeckVersion ?? card);
    public static void Attach(CardModel card, CardLineage state) { Table.Remove(card); Table.Add(card, state); }
    public static void Initialize()
    {
        var type = typeof(SavedPropertiesTypeCache);
        var forward = (Dictionary<string, int>)AccessTools.Field(type, "_propertyNameToNetIdMap").GetValue(null)!;
        var reverse = (List<string>)AccessTools.Field(type, "_netIdToPropertyNameMap").GetValue(null)!;
        if (!forward.ContainsKey(Property)) { forward.Add(Property, reverse.Count); reverse.Add(Property); }
        AccessTools.PropertySetter(type, "NetIdBitSize").Invoke(null, [(int)Math.Ceiling(Math.Log2(reverse.Count))]);
    }
}

[HarmonyPatch(typeof(CardModel), nameof(CardModel.ToSerializable))]
public static class SaveLineage
{
    public static void Postfix(CardModel __instance, SerializableCard __result)
    {
        if (__instance.IsCanonical) return;
        __result.Props ??= new SavedProperties();
        __result.Props.strings ??= [];
        __result.Props.strings.RemoveAll(p => p.name == Lineage.Property);
        __result.Props.strings.Add(new(Lineage.Property, JsonSerializer.Serialize(Lineage.Get(__instance), LocalFiles.Json)));
    }
}

[HarmonyPatch(typeof(SavedProperties), nameof(SavedProperties.FillInternal))]
public static class RestoreLineage
{
    public static void Postfix(SavedProperties __instance, object model)
    {
        if (model is not CardModel card) return;
        var saved = __instance.strings?.FirstOrDefault(p => p.name == Lineage.Property).value;
        if (string.IsNullOrEmpty(saved)) return;
        var state = JsonSerializer.Deserialize<CardLineage>(saved, LocalFiles.Json)!;
        state.Reserved = false;
        Lineage.Attach(card, state);
    }
}
