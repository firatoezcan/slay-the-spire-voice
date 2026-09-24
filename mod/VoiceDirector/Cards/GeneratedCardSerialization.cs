using System.Reflection;
using System.Reflection.Emit;
using System.Text;
using System.Text.Json;
using HarmonyLib;
using MegaCrit.Sts2.Core.Entities.Models;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Multiplayer.Serialization;
using VoiceDirector.Contracts;

namespace VoiceDirector.Cards;

// The fixed entry keeps the native model table identical despite different local card caches.
// Definitions travel with their IDs, including in saved-run lobby packets and checksums.
public static class GeneratedCardSerialization
{
    public const int MaxDefinitionBytes = 24 * 1024;
    public static string Encode(CardDefinition definition)
    {
        var json = JsonSerializer.Serialize(definition, LocalFiles.Json);
        if (Encoding.UTF8.GetByteCount(json) > MaxDefinitionBytes) throw new ArgumentException("Card definition exceeds the multiplayer limit.");
        return json;
    }
    public static CardDefinition Decode(string json)
    {
        if (Encoding.UTF8.GetByteCount(json) > MaxDefinitionBytes) throw new InvalidDataException("Card definition exceeds the multiplayer limit.");
        var definition = JsonSerializer.Deserialize<CardDefinition>(json, LocalFiles.Json) ?? throw new InvalidDataException("Missing card definition.");
        CardRules.Validate(definition);
        return definition;
    }
    public static string ReadEntry(int netId, PacketReader reader)
    {
        var entry = ModelIdSerializationCache.GetEntryForNetId(netId);
        if (entry != DefinitionRegistry.WireEntry) return entry;
        var definition = Decode(reader.ReadString());
        DefinitionRegistry.Register(definition);
        return DefinitionRegistry.Canonical(definition.Id).Id.Entry;
    }
}

[HarmonyPatch(typeof(AbstractModel), nameof(AbstractModel.InitId))]
public static class GeneratedSortingIds
{
    public static bool Prefix(AbstractModel __instance)
    {
        if (__instance is not GeneratedCard) return true;
        __instance.AssertCanonical();
        AccessTools.PropertySetter(typeof(AbstractModel), nameof(AbstractModel.CategorySortingId)).Invoke(__instance,
            [ModelIdSerializationCache.GetNetIdForCategory(__instance.Id.Category)]);
        AccessTools.PropertySetter(typeof(AbstractModel), nameof(AbstractModel.EntrySortingId)).Invoke(__instance,
            [ModelIdSerializationCache.GetNetIdForEntry(DefinitionRegistry.WireEntry)]);
        return false;
    }
}

[HarmonyPatch(typeof(DeterministicModelComparer), nameof(DeterministicModelComparer.Compare))]
public static class CompareGeneratedModels
{
    public static bool Prefix(AbstractModel? model1, AbstractModel? model2, ref int __result)
    {
        if (model1 is not GeneratedCard || model2 is not GeneratedCard || model1.Id == model2.Id) return true;
        __result = string.CompareOrdinal(model1.Id.Entry, model2.Id.Entry);
        return false;
    }
}

[HarmonyPatch(typeof(PacketWriterExtensions), nameof(PacketWriterExtensions.WriteModelEntry))]
public static class WriteGeneratedEntry
{
    public static bool Prefix(PacketWriter writer, ModelId id)
    {
        if (!DefinitionRegistry.TryGet(id, out var definition)) return true;
        writer.WriteInt(ModelIdSerializationCache.GetNetIdForEntry(DefinitionRegistry.WireEntry), ModelIdSerializationCache.EntryIdBitSize);
        writer.WriteString(GeneratedCardSerialization.Encode(definition));
        return false;
    }
}

[HarmonyPatch(typeof(PacketWriterExtensions), nameof(PacketWriterExtensions.WriteFullModelId))]
public static class WriteGeneratedModelId
{
    public static bool Prefix(PacketWriter writer, ModelId id)
    {
        if (!DefinitionRegistry.TryGet(id, out var definition)) return true;
        writer.WriteInt(ModelIdSerializationCache.GetNetIdForCategory(id.Category), ModelIdSerializationCache.CategoryIdBitSize);
        writer.WriteInt(ModelIdSerializationCache.GetNetIdForEntry(DefinitionRegistry.WireEntry), ModelIdSerializationCache.EntryIdBitSize);
        writer.WriteString(GeneratedCardSerialization.Encode(definition));
        return false;
    }
}

[HarmonyPatch]
public static class ReadGeneratedEntry
{
    public static IEnumerable<MethodBase> TargetMethods()
    {
        yield return AccessTools.Method(typeof(PacketReaderExtensions), nameof(PacketReaderExtensions.ReadFullModelId));
        yield return typeof(PacketReaderExtensions).GetMethod(nameof(PacketReaderExtensions.ReadModelIdAssumingType))!.MakeGenericMethod(typeof(CardModel));
    }
    public static IEnumerable<CodeInstruction> Transpiler(IEnumerable<CodeInstruction> source)
    {
        var lookup = AccessTools.Method(typeof(ModelIdSerializationCache), nameof(ModelIdSerializationCache.GetEntryForNetId));
        foreach (var instruction in source)
        {
            if (instruction.Calls(lookup))
            {
                var load = new CodeInstruction(OpCodes.Ldarg_0);
                load.labels.AddRange(instruction.labels);
                load.blocks.AddRange(instruction.blocks);
                yield return load;
                yield return new CodeInstruction(OpCodes.Call, AccessTools.Method(typeof(GeneratedCardSerialization), nameof(GeneratedCardSerialization.ReadEntry)));
            }
            else yield return instruction;
        }
    }
}
