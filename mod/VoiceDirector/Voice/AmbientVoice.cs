using Godot;
using Steamworks;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Multiplayer.Serialization;
using MegaCrit.Sts2.Core.Multiplayer.Transport;
using MegaCrit.Sts2.Core.Platform;
using MegaCrit.Sts2.Core.Runs;
using VoiceDirector.Contracts;
using VoiceDirector.Multiplayer;

namespace VoiceDirector.Voice;

public sealed class VoicePacket : INetMessage
{
    public string RunId = "";
    public byte[] Compressed = [];
    public bool ShouldBroadcast => false;
    public bool ShouldBuffer => false;
    public NetTransferMode Mode => NetTransferMode.Reliable;
    public LogLevel LogLevel => LogLevel.VeryDebug;
    public void Serialize(PacketWriter writer)
    {
        writer.WriteString(RunId); writer.WriteInt(Compressed.Length); writer.WriteBytes(Compressed, Compressed.Length);
    }
    public void Deserialize(PacketReader reader)
    {
        RunId = reader.ReadString();
        var length = reader.ReadInt();
        if (RunId.Length > 64 || length is < 1 or > 65536) throw new InvalidDataException("Invalid microphone packet.");
        Compressed = new byte[length]; reader.ReadBytes(Compressed, length);
    }
}

public static class AmbientVoice
{
    private sealed class AudioBuffer
    {
        public readonly List<byte> Pcm = [];
        public DateTimeOffset LastPacket;
    }
    private static readonly Dictionary<ulong, AudioBuffer> Buffers = [];
    private static readonly Queue<VoiceSegment> Segments = [];
    private static VoiceSettings _settings = LocalFiles.Read<VoiceSettings>("voice.json") ?? new(false);
    private static INetGameService? _net;
    private static bool _recording;
    private static string? _error;
    private static long _nextPoll;
    private const int SampleRate = 16000;
    public static VoiceStatus Status() => new(_settings.Enabled, _recording, _error);
    public static VoiceStatus Configure(VoiceSettings settings)
    {
        _settings = settings; _error = null;
        LocalFiles.Write("voice.json", settings);
        if (!settings.Enabled) Stop();
        return Status();
    }
    public static void Attach(INetGameService net)
    {
        Detach(); _net = net;
        net.RegisterMessageHandler<VoicePacket>(Receive);
    }
    public static void Detach()
    {
        Stop();
        _net?.UnregisterMessageHandler<VoicePacket>(Receive);
        _net = null; Buffers.Clear(); Segments.Clear();
    }
    public static void Initialize()
    {
        ((SceneTree)Engine.GetMainLoop()).ProcessFrame += Tick;
    }
    private static void Stop()
    {
        if (!_recording) return;
        _recording = false;
        try { SteamUser.StopVoiceRecording(); } catch (Exception e) { _error = e.Message; }
    }
    private static void Tick()
    {
        var active = CardTransfer.Active && Director.Settings.Enabled && (!CardTransfer.IsMultiplayer || _net?.IsConnected == true);
        if (!active) { Stop(); Buffers.Clear(); Segments.Clear(); return; }
        var now = System.Environment.TickCount64;
        if (now < _nextPoll) return;
        _nextPoll = now + 50;
        try
        {
            if (_settings.Enabled && _error is null && !_recording) { SteamUser.StartVoiceRecording(); _recording = true; }
            if (_recording)
            {
                var available = SteamUser.GetAvailableVoice(out var count);
                if (available == EVoiceResult.k_EVoiceResultOK && count > 0)
                {
                    if (count > 65536) throw new InvalidDataException("Microphone audio exceeded the packet limit.");
                    var bytes = new byte[count];
                    var result = SteamUser.GetVoice(true, bytes, count, out var written);
                    if (result == EVoiceResult.k_EVoiceResultOK && written > 0)
                    {
                        var packet = new VoicePacket { RunId = CardTransfer.RunId, Compressed = bytes.AsSpan(0, (int)written).ToArray() };
                        if (CardTransfer.IsAuthority) Receive(packet, _net!.NetId); else _net!.SendMessage(packet);
                    }
                    else if (result is not (EVoiceResult.k_EVoiceResultNoData or EVoiceResult.k_EVoiceResultOK)) throw new InvalidOperationException("Steam microphone: " + result);
                }
                else if (available is not (EVoiceResult.k_EVoiceResultNoData or EVoiceResult.k_EVoiceResultOK)) throw new InvalidOperationException("Steam microphone: " + available);
            }
            if (CardTransfer.IsAuthority)
                foreach (var (player, buffer) in Buffers)
                    if (buffer.Pcm.Count >= 3200 && DateTimeOffset.UtcNow - buffer.LastPacket > TimeSpan.FromMilliseconds(600)) Flush(player, buffer);
        }
        catch (Exception e) { _error = e.Message; Stop(); }
    }
    private static void Receive(VoicePacket packet, ulong sender)
    {
        if (!CardTransfer.Active || !CardTransfer.IsAuthority || !Director.Settings.Enabled || packet.RunId != CardTransfer.RunId ||
            Director.Run?.Players.Any(p => p.NetId == sender) != true) return;
        try
        {
            var pcm = new byte[65536];
            var result = SteamUser.DecompressVoice(packet.Compressed, (uint)packet.Compressed.Length, pcm, (uint)pcm.Length, out var written, SampleRate);
            if (result != EVoiceResult.k_EVoiceResultOK) { _error = "Steam voice decode: " + result; return; }
            if (!Buffers.TryGetValue(sender, out var buffer)) Buffers[sender] = buffer = new();
            buffer.Pcm.AddRange(pcm.AsSpan(0, (int)written).ToArray());
            buffer.LastPacket = DateTimeOffset.UtcNow;
            if (buffer.Pcm.Count >= SampleRate * 2 * 4) Flush(sender, buffer);
        }
        catch (Exception e) { _error = e.Message; }
    }
    private static void Flush(ulong sender, AudioBuffer buffer)
    {
        var ended = buffer.LastPacket;
        var name = sender == LocalContext.NetId ? "You" : PlatformUtil.GetPlayerNameRaw(_net!.Platform, sender);
        Segments.Enqueue(new(Guid.NewGuid().ToString("N"), CardTransfer.RunId, sender.ToString(), name,
            ended.AddSeconds(-buffer.Pcm.Count / (double)(SampleRate * 2)), ended, Convert.ToBase64String(buffer.Pcm.ToArray())));
        buffer.Pcm.Clear();
        while (Segments.Count > 16) Segments.Dequeue();
    }
    public static VoiceSegment[] Drain()
    {
        if (!CardTransfer.IsAuthority || !CardTransfer.Active) return [];
        var result = Segments.ToArray(); Segments.Clear(); return result;
    }
}
