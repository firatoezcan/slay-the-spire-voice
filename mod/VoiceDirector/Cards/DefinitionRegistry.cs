using System.Reflection;
using System.Reflection.Emit;
using System.Text.Json;
using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.CardPools;
using MegaCrit.Sts2.Core.Multiplayer.Serialization;
using VoiceDirector.Contracts;

namespace VoiceDirector.Cards;

public static class DefinitionRegistry
{
    private static readonly Dictionary<string, CardDefinition> Definitions = [];
    private static readonly Dictionary<string, Type> Types = [];
    private static readonly Dictionary<string, ImageTexture> Portraits = [];
    private static readonly Dictionary<string, string> Entries = [];
    public const string WireEntry = "VOICE_DIRECTOR_GENERATED";
    private static readonly ModuleBuilder Module = AssemblyBuilder.DefineDynamicAssembly(new AssemblyName("VoiceDirector.Generated"), AssemblyBuilderAccess.Run).DefineDynamicModule("Cards");
    public static CardDefinition Get(string id) => Definitions[id];
    public static CardDefinition[] All() => Definitions.Values.ToArray();
    public static CardModel Canonical(string id) => ModelDb.GetById<CardModel>(ModelDb.GetId(Types[id]));
    public static bool TryGet(ModelId id, out CardDefinition definition)
    {
        definition = null!;
        return id.Category == "CARD" && Entries.TryGetValue(id.Entry, out var key) && Definitions.TryGetValue(key, out definition!);
    }

    public static void Restore()
    {
        if (!ModelDb.Contains(typeof(GeneratedPool))) ModelDb.Inject(typeof(GeneratedPool));
        RegisterIds(ModelDb.GetId<GeneratedPool>());
        Add("_entryNameToNetIdMap", "_netIdToEntryNameMap", "EntryIdBitSize", WireEntry);
        ModelDb.GetById<CardPoolModel>(ModelDb.GetId<GeneratedPool>()).InitId(ModelDb.GetId<GeneratedPool>());
        var folder = Path.Combine(LocalFiles.Root, "definitions");
        if (!Directory.Exists(folder)) return;
        foreach (var file in Directory.EnumerateFiles(folder, "*.json").Order())
            Register(JsonSerializer.Deserialize<CardDefinition>(File.ReadAllText(file), LocalFiles.Json) ?? throw new InvalidDataException(file));
    }

    public static void Register(CardDefinition definition)
    {
        CardRules.Validate(definition);
        _ = GeneratedCardSerialization.Encode(definition);
        if (Definitions.TryGetValue(definition.Id, out var existing))
        {
            if (JsonSerializer.Serialize(existing, LocalFiles.Json) != JsonSerializer.Serialize(definition, LocalFiles.Json))
                throw new ArgumentException("A definition ID cannot be reused with different rules.");
            return;
        }
        LocalFiles.Write($"definitions/{definition.Id}.json", definition);
        Definitions.Add(definition.Id, definition);
        var builder = Module.DefineType("VD_" + definition.Id, TypeAttributes.Public | TypeAttributes.Sealed, typeof(GeneratedCard));
        var constructor = builder.DefineConstructor(MethodAttributes.Public, CallingConventions.Standard, Type.EmptyTypes).GetILGenerator();
        constructor.Emit(OpCodes.Ldarg_0);
        constructor.Emit(OpCodes.Ldstr, definition.Id);
        constructor.Emit(OpCodes.Call, typeof(GeneratedCard).GetConstructor(BindingFlags.Instance | BindingFlags.NonPublic, null, [typeof(string)], null)!);
        constructor.Emit(OpCodes.Ret);
        var type = builder.CreateType()!;
        Types.Add(definition.Id, type);
        ModelDb.Inject(type);
        Entries.Add(ModelDb.GetId(type).Entry, definition.Id);
        Canonical(definition.Id).InitId(ModelDb.GetId(type));
    }

    private static void RegisterIds(ModelId id)
    {
        Add("_categoryNameToNetIdMap", "_netIdToCategoryNameMap", "CategoryIdBitSize", id.Category);
        Add("_entryNameToNetIdMap", "_netIdToEntryNameMap", "EntryIdBitSize", id.Entry);
    }
    private static void Add(string forward, string reverse, string bits, string value)
    {
        var type = typeof(ModelIdSerializationCache);
        var map = (Dictionary<string, int>)AccessTools.Field(type, forward).GetValue(null)!;
        var list = (List<string>)AccessTools.Field(type, reverse).GetValue(null)!;
        if (!map.ContainsKey(value)) { map.Add(value, list.Count); list.Add(value); }
        AccessTools.PropertySetter(type, bits).Invoke(null, [(int)Math.Ceiling(Math.Log2(list.Count))]);
    }

    public static ImageTexture Portrait(string id)
    {
        if (Portraits.TryGetValue(id, out var texture)) return texture;
        var image = Image.CreateEmpty(256, 192, false, Image.Format.Rgba8);
        image.Fill(new Color(0.12f, 0.09f, 0.21f));
        var file = Path.Combine(LocalFiles.Root, "art", id + ".png");
        if (File.Exists(file)) image.LoadPngFromBuffer(File.ReadAllBytes(file));
        return Portraits[id] = ImageTexture.CreateFromImage(image);
    }
    public static void SetArt(string id, byte[] png)
    {
        _ = Get(id);
        ArtworkRules.Validate(png);
        using var image = new Image();
        if (image.LoadPngFromBuffer(png) != Error.Ok) throw new ArgumentException("Artwork must be a PNG.");
        Directory.CreateDirectory(Path.Combine(LocalFiles.Root, "art"));
        var file = Path.Combine(LocalFiles.Root, "art", id + ".png");
        File.WriteAllBytes(file + ".pending", png);
        File.Move(file + ".pending", file, true);
        Portrait(id).SetImage(image);
    }
}

public sealed class GeneratedPool : CardPoolModel
{
    public override string Title => "Voice";
    public override string EnergyColorName => "colorless";
    public override string CardFrameMaterialPath => ModelDb.GetById<CardPoolModel>(ModelDb.GetId<ColorlessCardPool>()).CardFrameMaterialPath;
    public override Color DeckEntryCardColor => new("8062ad");
    public override bool IsColorless => true;
    public override IEnumerable<CardModel> AllCards => DefinitionRegistry.All().Select(d => DefinitionRegistry.Canonical(d.Id));
    protected override CardModel[] GenerateAllCards() => AllCards.ToArray();
}

[HarmonyPatch(typeof(ModelIdSerializationCache), nameof(ModelIdSerializationCache.Init))]
public static class RestoreDefinitionsPatch
{
    public static void Postfix() => DefinitionRegistry.Restore();
}
