using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text;
using System.Security.Cryptography;
using HarmonyLib;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Saves.Runs;

namespace VoiceDirector.Cards;

public sealed class CardLineage
{
    public string Id { get; set; } = "";
    public string RunId { get; set; } = "";
    public bool Wildcard { get; set; }
    public bool Resolved { get; set; }
    public int LastTurn { get; set; } = -1;
    public string LastCombat { get; set; } = "";
    [JsonIgnore] public bool Reserved { get; set; }
}

public static class Lineage
{
    public const string Property = "VoiceDirector_Lineage";
    public const string DefinitionProperty = "VoiceDirector_Definition";
    private static readonly ConditionalWeakTable<CardModel, CardLineage> Table = new();
    private static readonly Dictionary<string, int> Acquisitions = [];
    private static RunState? _run;
    public static string StableId(string input) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input))).ToLowerInvariant()[..32];
    public static CardLineage Get(CardModel card)
    {
        var original = card.DeckVersion ?? card;
        var state = Table.GetOrCreateValue(original);
        if (state.Id.Length == 0 && original.IsMutable && original.Owner is not null &&
            MegaCrit.Sts2.Core.GameActions.Multiplayer.NetCombatCardDb.Instance.TryGetCardId(original, out var id))
        {
            state.Id = StableId($"{Director.CombatId}/{original.Owner.NetId}/combat/{id}");
            state.RunId = Director.RunId;
        }
        return state;
    }
    public static void Attach(CardModel card, CardLineage state) { Table.Remove(card); Table.Add(card, state); }
    public static void Initialize()
    {
        var type = typeof(SavedPropertiesTypeCache);
        var forward = (Dictionary<string, int>)AccessTools.Field(type, "_propertyNameToNetIdMap").GetValue(null)!;
        var reverse = (List<string>)AccessTools.Field(type, "_netIdToPropertyNameMap").GetValue(null)!;
        foreach (var property in new[] { Property, DefinitionProperty })
            if (!forward.ContainsKey(property)) { forward.Add(property, reverse.Count); reverse.Add(property); }
        AccessTools.PropertySetter(type, "NetIdBitSize").Invoke(null, [(int)Math.Ceiling(Math.Log2(reverse.Count))]);
    }
    public static void InitializeRun(RunState run, string runId)
    {
        if (_run != run) { _run = run; Acquisitions.Clear(); }
        foreach (var player in run.Players)
            for (var index = 0; index < player.Deck.Cards.Count; index++)
            {
                var card = player.Deck.Cards[index];
                var state = Get(card);
                if (state.Id.Length == 0) state.Id = StableId($"{runId}/{player.NetId}/initial/{index}/{card.Id}");
                state.RunId = runId;
            }
    }
    public static void Acquired(CardModel card)
    {
        var state = Get(card);
        var runId = Multiplayer.CardTransfer.RunId;
        if (state.Id.Length > 0 || runId.Length == 0 || card.Owner is null) return;
        var run = Director.Run;
        var key = $"{runId}/{card.Owner.NetId}/{run?.CurrentActIndex}/{run?.CurrentRoomCount}";
        var ordinal = Acquisitions.GetValueOrDefault(key);
        do { state.Id = StableId($"{key}/acquired/{++ordinal}"); }
        while (card.Owner.Deck.Cards.Any(c => c != card && Get(c).Id == state.Id));
        Acquisitions[key] = ordinal;
        state.RunId = runId;
    }
}

[HarmonyPatch(typeof(CardPile), nameof(CardPile.AddInternal))]
public static class AssignAcquiredCardIdentity
{
    public static void Postfix(CardPile __instance, CardModel card)
    { if (__instance.Type == PileType.Deck) Lineage.Acquired(card); }
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
        if (__instance is GeneratedCard card)
        {
            __result.Props.strings.RemoveAll(p => p.name == Lineage.DefinitionProperty);
            __result.Props.strings.Add(new(Lineage.DefinitionProperty, GeneratedCardSerialization.Encode(card.Definition)));
        }
    }
}

[HarmonyPatch(typeof(CardModel), nameof(CardModel.FromSerializable))]
public static class RestoreSavedDefinition
{
    public static void Prefix(SerializableCard save)
    {
        var json = save.Props?.strings?.FirstOrDefault(p => p.name == Lineage.DefinitionProperty).value;
        if (string.IsNullOrEmpty(json)) return;
        var definition = GeneratedCardSerialization.Decode(json);
        DefinitionRegistry.Register(definition);
        if (DefinitionRegistry.Canonical(definition.Id).Id != save.Id) throw new InvalidDataException("Saved card definition does not match its model ID.");
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
