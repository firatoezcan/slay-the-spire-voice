using Godot;
using VoiceDirector.Contracts;

namespace VoiceDirector.Cards;

public static class CardArtwork
{
    // Generation output enters here once, before either local application or network delivery.
    public static byte[] Prepare(byte[] source)
    {
        ArtworkRules.ValidateSource(source);
        using var image = new Image();
        if (image.LoadPngFromBuffer(source) != Error.Ok) throw new ArgumentException("Artwork could not be decoded.");
        image.Resize(ArtworkRules.Width, ArtworkRules.Height);
        var png = image.SavePngToBuffer();
        ArtworkRules.Validate(png);
        return png;
    }
}
