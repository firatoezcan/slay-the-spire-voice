using System.Buffers.Binary;

namespace VoiceDirector.Contracts;

public static class DirectorSettingsRules
{
    public static void Validate(DirectorSettings value)
    {
        ArgumentNullException.ThrowIfNull(value);
        if (value.Mode is not ("wildcard" or "living-deck") ||
            value.MaxPerTurn is < 1 or > 10 || value.CooldownTurns is < 0 or > 20 ||
            !double.IsFinite(value.Strength) || value.Strength is < 0 or > 1 ||
            !double.IsFinite(value.Synergy) || value.Synergy is < 0 or > 1)
            throw new ArgumentException("Settings are outside supported ranges.");
    }
}

// The host prepares one portrait; every participant installs these exact PNG bytes.
public static class ArtworkRules
{
    public const int Width = 512;
    public const int Height = 384;
    public const int MaxBytes = 2 * 1024 * 1024;
    public const int MaxSourceBytes = 16 * 1024 * 1024;
    public static void ValidateSource(byte[] png)
    {
        ArgumentNullException.ThrowIfNull(png);
        if (png.Length is < 33 or > MaxSourceBytes || !png.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }) ||
            !png.AsSpan(12, 4).SequenceEqual("IHDR"u8) || BinaryPrimitives.ReadUInt32BigEndian(png.AsSpan(8, 4)) != 13)
            throw new ArgumentException("Artwork must be a PNG no larger than 16 MiB.");
        var width = BinaryPrimitives.ReadUInt32BigEndian(png.AsSpan(16, 4));
        var height = BinaryPrimitives.ReadUInt32BigEndian(png.AsSpan(20, 4));
        if (width is < 1 or > 4096 || height is < 1 or > 4096)
            throw new ArgumentException("Artwork dimensions must be between 1 and 4096 pixels.");
    }
    public static void Validate(byte[] png)
    {
        ValidateSource(png);
        if (png.Length > MaxBytes || BinaryPrimitives.ReadUInt32BigEndian(png.AsSpan(16, 4)) != Width ||
            BinaryPrimitives.ReadUInt32BigEndian(png.AsSpan(20, 4)) != Height)
            throw new ArgumentException("Prepared artwork must be a 512 by 384 PNG no larger than 2 MiB.");
    }
}
