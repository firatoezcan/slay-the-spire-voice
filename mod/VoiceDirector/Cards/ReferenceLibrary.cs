using Godot;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Models;
using VoiceDirector.Contracts;

namespace VoiceDirector.Cards;

public static class ReferenceLibrary
{
    private static readonly Dictionary<string, ArtReferenceSheet> Sheets = [];
    private static IEnumerable<CardModel> NativeCards => ModelDb.AllCards.Where(c => c.GetType().Assembly == typeof(CardModel).Assembly &&
        c.Rarity is CardRarity.Basic or CardRarity.Common or CardRarity.Uncommon or CardRarity.Rare);

    public static CardReference[] Cards() => NativeCards.Select(c =>
    {
        var upgraded = c.ToMutable();
        if (upgraded.IsUpgradable) { upgraded.UpgradeInternal(); upgraded.FinalizeUpgradeInternal(); }
        return new CardReference(c.Id.ToString(), c.Title, c.Pool.Title,
            c.Rarity.ToString(), c.Type.ToString(), c.EnergyCost.Canonical, c.GetDescriptionForPile(PileType.None),
            upgraded.GetDescriptionForPile(PileType.None), c.CanonicalKeywords.Select(k => k.ToString()).ToArray());
    }).ToArray();

    public static ArtReferenceSheet Art(string modelId)
    {
        var original = NativeCards.FirstOrDefault(c => c.Id.ToString() == modelId)
            ?? throw new ArgumentException("Choose an existing game card for the art reference.");
        if (Sheets.TryGetValue(original.Pool.Title, out var existing)) return existing;
        var cards = NativeCards.Where(c => c.Pool == original.Pool && c.HasPortrait).OrderBy(c => c.Id.Entry).ToArray();
        if (cards.Length == 0) throw new InvalidOperationException("No original portraits are available in this card pool.");
        const int columns = 8, width = 192, height = 144, gap = 4;
        using var sheet = Image.CreateEmpty(columns * (width + gap), ((cards.Length + columns - 1) / columns) * (height + gap), false, Image.Format.Rgba8);
        sheet.Fill(new Color("27232b"));
        var atlases = new Dictionary<ulong, Image>();
        try
        {
            for (var i = 0; i < cards.Length; i++)
            {
                var texture = cards[i].Portrait;
                Image image;
                if (texture is AtlasTexture atlas)
                {
                    var key = atlas.Atlas.GetInstanceId();
                    if (!atlases.TryGetValue(key, out var atlasImage))
                    {
                        atlasImage = atlas.Atlas.GetImage();
                        if (atlasImage.IsCompressed() && atlasImage.Decompress() != Error.Ok) throw new InvalidOperationException("The game's art atlas could not be decoded.");
                        atlases[key] = atlasImage;
                    }
                    // AtlasTexture.GetImage blits before decompressing and produces black tiles.
                    image = atlasImage.GetRegion((Rect2I)atlas.Region);
                }
                else image = texture.GetImage();
                using var portrait = image;
                if (portrait is null || portrait.IsEmpty()) throw new InvalidOperationException($"Portrait unavailable: {cards[i].Title}");
                if (portrait.IsCompressed() && portrait.Decompress() != Error.Ok) throw new InvalidOperationException($"Portrait cannot be decoded: {cards[i].Title}");
                portrait.Convert(Image.Format.Rgba8);
                portrait.Resize(width, height, Image.Interpolation.Lanczos);
                sheet.BlitRect(portrait, new Rect2I(0, 0, width, height), new Vector2I((i % columns) * (width + gap), (i / columns) * (height + gap)));
            }
        }
        finally { foreach (var atlas in atlases.Values) atlas.Dispose(); }
        return Sheets[original.Pool.Title] = new(original.Pool.Title, cards.Select(c => c.Id.ToString()).ToArray(), Convert.ToBase64String(sheet.SavePngToBuffer()));
    }
}
