namespace VoiceDirector.Contracts;

public sealed record VoiceSettings(bool Enabled);
public sealed record VoiceStatus(bool Enabled, bool Listening, string? Error);
public sealed record VoiceSegment(string Id, string RunId, string PlayerId, string PlayerName,
    DateTimeOffset StartedAt, DateTimeOffset EndedAt, string PcmBase64);
