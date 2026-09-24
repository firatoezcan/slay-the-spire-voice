using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.Helpers;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Multiplayer;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Multiplayer.Serialization;
using MegaCrit.Sts2.Core.Multiplayer.Transport;
using MegaCrit.Sts2.Core.Runs;
using VoiceDirector.Cards;
using VoiceDirector.Contracts;

namespace VoiceDirector.Multiplayer;

public enum TransferKind : byte { RequestSession, Session, RequestAssets, Definition, Artwork, Received, Settings, CardOffer, RewardOffer }

// The same mod assembly and protocol version are required on every peer.
public sealed class CardTransferMessage : INetMessage
{
    public TransferKind Kind;
    public string SessionId = "";
    public string AssetId = "";
    public string TransferId = "";
    public string Digest = "";
    public ushort Index;
    public ushort Count = 1;
    public int Length;
    public byte[] Data = [];
    public const int ChunkBytes = 12 * 1024;
    public bool ShouldBroadcast => false;
    public bool ShouldBuffer => true;
    public NetTransferMode Mode => NetTransferMode.Reliable;
    public LogLevel LogLevel => LogLevel.VeryDebug;

    public void Serialize(PacketWriter writer)
    {
        if (Data.Length > ChunkBytes) throw new InvalidDataException("Card transfer chunk is too large.");
        writer.WriteByte((byte)Kind);
        writer.WriteString(SessionId);
        writer.WriteString(AssetId);
        writer.WriteString(TransferId);
        writer.WriteString(Digest);
        writer.WriteUShort(Index);
        writer.WriteUShort(Count);
        writer.WriteInt(Length);
        writer.WriteUShort((ushort)Data.Length);
        writer.WriteBytes(Data, Data.Length);
    }

    public void Deserialize(PacketReader reader)
    {
        Kind = (TransferKind)reader.ReadByte();
        SessionId = reader.ReadString();
        AssetId = reader.ReadString();
        TransferId = reader.ReadString();
        Digest = reader.ReadString();
        Index = reader.ReadUShort();
        Count = reader.ReadUShort();
        Length = reader.ReadInt();
        var size = reader.ReadUShort();
        if (!Enum.IsDefined(Kind) || size > ChunkBytes || SessionId.Length > 64 || AssetId.Length > 64 || TransferId.Length > 64 || Digest.Length > 64)
            throw new InvalidDataException("Invalid Voice Director transfer header.");
        Data = new byte[size];
        reader.ReadBytes(Data, size);
    }
}

public sealed record CardAsset(string Id, string DefinitionDigest, string? ArtworkDigest);
public sealed record CardSession(string RunId, CardAsset[] Cards, DirectorSettings Settings)
{
    public void Validate()
    {
        if (!Guid.TryParseExact(RunId, "N", out _) || Cards is null || Cards.Length > 24 || Cards.Any(card => card is null))
            throw new InvalidDataException("Invalid card session.");
        DirectorSettingsRules.Validate(Settings);
        static bool DigestValid(string? digest) => digest is not null && System.Text.RegularExpressions.Regex.IsMatch(digest, "^[a-f0-9]{64}$");
        if (Cards.Select(card => card.Id).Distinct().Count() != Cards.Length || Cards.Any(card => !CardRules.IsDefinitionId(card.Id) ||
            !DigestValid(card.DefinitionDigest) || (card.ArtworkDigest is not null && !DigestValid(card.ArtworkDigest))))
            throw new InvalidDataException("Invalid card manifest.");
    }
}
public sealed record AssetRequest(string Id, bool Definition, bool Artwork);

public static class CardTransfer
{
    private sealed class Peer
    {
        public readonly HashSet<string> Pending = [];
        public int Received;
        public string? Error;
    }
    private static INetGameService? _net;
    private static RunState? _run;
    private static bool _launched;
    private static readonly CardAssetReceiver Receiver = new();
    private static readonly Dictionary<ulong, Peer> Peers = [];
    private static readonly Dictionary<ulong, long> LastRequest = [];
    private static readonly HashSet<string> Published = [];
    public static string RunId { get; private set; } = "";
    public static bool Ended { get; private set; }
    public static bool IsAuthority => _net?.Type is NetGameType.Singleplayer or NetGameType.Host;
    public static bool IsMultiplayer => _net?.Type is NetGameType.Host or NetGameType.Client;
    public static bool Active => _launched && !Ended && (_net?.Type is NetGameType.Singleplayer or NetGameType.Host or NetGameType.Client) && _run is not null && RunId.Length > 0;
    private static ulong HostId => _net is NetClientGameService client ? client.HostNetId : _net?.NetId ?? 0;
    internal static ulong AuthorityId => HostId;
    private static string Digest(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

    public static void Attach(RunManager manager)
    {
        Detach();
        _net = manager.NetService;
        _run = manager.DebugOnlyGetState();
        if (IsMultiplayer) _net.RegisterMessageHandler<CardTransferMessage>(Handle);
        Voice.AmbientVoice.Attach(_net);
    }
    public static void Launch()
    {
        if (_net is null || _run is null) return;
        _launched = true;
        if (_net.Type == NetGameType.Replay)
        {
            RunId = _run.Players.SelectMany(p => p.Deck.Cards).Select(c => Lineage.Get(c).RunId).FirstOrDefault(id => id.Length > 0) ?? "";
            return;
        }
        if (IsAuthority)
        {
            RunId = _run.Players.SelectMany(p => p.Deck.Cards).Select(c => Lineage.Get(c).RunId).FirstOrDefault(id => id.Length > 0)
                ?? Guid.NewGuid().ToString("N");
            Lineage.InitializeRun(_run, RunId);
            if (IsMultiplayer)
                foreach (var player in _run.Players.Where(p => p.NetId != _net.NetId)) SendSession(player.NetId);
        }
        else if (IsMultiplayer) _net.SendMessage(new CardTransferMessage { Kind = TransferKind.RequestSession });
    }
    public static void Detach()
    {
        Voice.AmbientVoice.Detach();
        if (_net is not null && IsMultiplayer) _net.UnregisterMessageHandler<CardTransferMessage>(Handle);
        if (_net?.Type == NetGameType.Client) Director.RestoreLocalSettings();
        _net = null;
        _run = null;
        _launched = false;
        Ended = false;
        RunId = "";
        Receiver.Clear(); Peers.Clear(); LastRequest.Clear(); Published.Clear();
        CardChoices.Clear();
        RewardHooks.Clear();
    }
    public static void End()
    {
        Ended = true;
        Voice.AmbientVoice.Detach();
    }
    public static CardSyncStatus Status() => new(_net?.Type.ToString().ToLowerInvariant() ?? "offline", RunId, Active,
        Peers.Select(p => new CardSyncPeer(p.Key.ToString(),
            RunManager.Instance.RunLobby?.ConnectedPlayerIds.Contains(p.Key) == true, p.Value.Pending.Count, p.Value.Received, p.Value.Error)).ToArray());
    public static void Resync(ulong peer)
    {
        if (!Active || !IsAuthority || !IsMultiplayer || RunManager.Instance.RunLobby?.ConnectedPlayerIds.Contains(peer) != true || peer == _net!.NetId)
            throw new InvalidOperationException("Card sync requires a connected player in your hosted run.");
        if (Peers.TryGetValue(peer, out var state)) { state.Pending.Clear(); state.Error = null; }
        SendSession(peer);
    }

    private static void Send(CardTransferMessage message, ulong? peer = null)
    {
        if (_net is null || !IsMultiplayer) return;
        message.SessionId = RunId;
        if (peer.HasValue) _net.SendMessage(message, peer.Value); else _net.SendMessage(message);
    }
    internal static void Control<T>(TransferKind kind, T payload, ulong? peer = null)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(payload, LocalFiles.Json);
        Send(new CardTransferMessage { Kind = kind, Data = bytes, Length = bytes.Length }, peer);
    }
    private static bool Offered(string id) => Published.Contains(id) || _run?.Players.SelectMany(p => p.Deck.Cards)
        .OfType<GeneratedCard>().Any(c => c.DefinitionId == id) == true;
    private static byte[]? Art(string id)
    {
        var file = Path.Combine(LocalFiles.Root, "art", id + ".png");
        return File.Exists(file) ? File.ReadAllBytes(file) : null;
    }
    private static CardAsset Describe(string id)
    {
        var art = Art(id);
        return new(id, Digest(Encoding.UTF8.GetBytes(GeneratedCardSerialization.Encode(DefinitionRegistry.Get(id)))), art is null ? null : Digest(art));
    }
    private static void SendSession(ulong peer)
    {
        if (!Active || !IsAuthority || _run is null) return;
        Peers.TryAdd(peer, new());
        var ids = _run.Players.SelectMany(p => p.Deck.Cards).OfType<GeneratedCard>().Select(c => c.DefinitionId).Concat(Published).Distinct().ToArray();
        if (ids.Length == 0) Control(TransferKind.Session, new CardSession(RunId, [], Director.Settings), peer);
        foreach (var batch in ids.Chunk(24)) Control(TransferKind.Session, new CardSession(RunId, batch.Select(Describe).ToArray(), Director.Settings), peer);
    }
    public static void PublishSettings()
    {
        if (Active && IsAuthority && IsMultiplayer) Control(TransferKind.Settings, Director.Settings);
    }
    public static void PublishDefinition(string id)
    {
        if (!Active || !IsAuthority || !IsMultiplayer) return;
        Published.Add(id);
        Transfer(TransferKind.Definition, id, Encoding.UTF8.GetBytes(GeneratedCardSerialization.Encode(DefinitionRegistry.Get(id))));
    }
    public static void PublishArtwork(string id)
    {
        if (!Active || !IsAuthority || !IsMultiplayer || Art(id) is not { } bytes) return;
        PublishDefinition(id);
        Transfer(TransferKind.Artwork, id, bytes);
    }
    private static void Transfer(TransferKind kind, string id, byte[] bytes, ulong? peer = null)
    {
        var packets = CardAssetPackets.Create(kind, id, bytes, RunId);
        var transferId = packets[0].TransferId;
        foreach (var playerId in peer.HasValue ? [peer.Value] : _run!.Players.Where(p => p.NetId != _net!.NetId && RunManager.Instance.RunLobby?.ConnectedPlayerIds.Contains(p.NetId) == true).Select(p => p.NetId))
        {
            if (!Peers.TryGetValue(playerId, out var state)) Peers[playerId] = state = new();
            state.Pending.Add(transferId);
        }
        foreach (var packet in packets) Send(packet, peer);
    }
    private static void Handle(CardTransferMessage message, ulong sender)
    {
        try
        {
            if (_run is null || _net is null) return;
            var scope = new CardSessionScope(RunId, HostId, IsAuthority, Active, _run.Players.Select(p => p.NetId).ToArray());
            if (!scope.Accepts(message, sender)) return;
            if (IsAuthority)
            {
                if (message.Kind == TransferKind.RequestSession)
                {
                    if (LastRequest.TryGetValue(sender, out var time) && System.Environment.TickCount64 - time < 1000) return;
                    LastRequest[sender] = System.Environment.TickCount64;
                    SendSession(sender);
                }
                else if (message.SessionId == RunId && message.Kind == TransferKind.RequestAssets)
                {
                    var requests = JsonSerializer.Deserialize<AssetRequest[]>(message.Data, LocalFiles.Json) ?? [];
                    if (requests.Length > 256) throw new InvalidDataException("Too many requested cards.");
                    foreach (var request in requests)
                    {
                        if (!Offered(request.Id)) continue;
                        if (request.Definition) Transfer(TransferKind.Definition, request.Id, Encoding.UTF8.GetBytes(GeneratedCardSerialization.Encode(DefinitionRegistry.Get(request.Id))), sender);
                        if (request.Artwork && Art(request.Id) is { } png) Transfer(TransferKind.Artwork, request.Id, png, sender);
                    }
                }
                else if (message.SessionId == RunId && message.Kind == TransferKind.Received && Peers.TryGetValue(sender, out var peer))
                {
                    if (peer.Pending.Remove(message.TransferId)) peer.Received++;
                }
                return;
            }
            // No client can supply another player's rules or artwork.
            if (sender != HostId) return;
            if (message.Kind == TransferKind.Session)
            {
                var session = JsonSerializer.Deserialize<CardSession>(message.Data, LocalFiles.Json) ?? throw new InvalidDataException("Missing card session.");
                session.Validate();
                if (session.RunId != message.SessionId) throw new InvalidDataException("Invalid card session.");
                Director.ApplyHostSettings(session.Settings ?? throw new InvalidDataException("Missing host settings."));
                if (RunId.Length > 0 && RunId != session.RunId) Receiver.Clear();
                RunId = session.RunId;
                Lineage.InitializeRun(_run, RunId);
                var requests = session.Cards.Select(asset =>
                {
                    var known = DefinitionRegistry.All().FirstOrDefault(d => d.Id == asset.Id);
                    var needsDefinition = known is null || Digest(Encoding.UTF8.GetBytes(GeneratedCardSerialization.Encode(known))) != asset.DefinitionDigest;
                    var art = known is null ? null : Art(asset.Id);
                    return new AssetRequest(asset.Id, needsDefinition, asset.ArtworkDigest is not null && (art is null || Digest(art) != asset.ArtworkDigest));
                }).Where(r => r.Definition || r.Artwork).ToArray();
                foreach (var batch in requests.Chunk(32)) Control(TransferKind.RequestAssets, batch);
                return;
            }
            if (message.SessionId != RunId || !Active) return;
            if (message.Kind == TransferKind.Settings)
                Director.ApplyHostSettings(JsonSerializer.Deserialize<DirectorSettings>(message.Data, LocalFiles.Json) ?? throw new InvalidDataException("Missing host settings."));
            if (message.Kind == TransferKind.CardOffer)
                CardChoices.Receive(JsonSerializer.Deserialize<CardOffer>(message.Data, LocalFiles.Json) ?? throw new InvalidDataException("Missing card choice."));
            if (message.Kind == TransferKind.RewardOffer)
                CardChoices.Receive(JsonSerializer.Deserialize<RewardOffer>(message.Data, LocalFiles.Json) ?? throw new InvalidDataException("Missing reward choice."));
            if (message.Kind is TransferKind.Definition or TransferKind.Artwork) ReceiveAsset(message);
        }
        catch (Exception e)
        {
            if (!Peers.TryGetValue(sender, out var peer)) Peers[sender] = peer = new();
            peer.Error = e.Message;
            GD.PrintErr("Voice Director card sync: " + e.Message);
        }
    }
    private static void ReceiveAsset(CardTransferMessage message)
    {
        var receipt = Receiver.Receive(message);
        if (receipt is null) return;
        if (receipt.Bytes is { } bytes)
        {
            if (message.Kind == TransferKind.Definition)
            {
                var definition = GeneratedCardSerialization.Decode(Encoding.UTF8.GetString(bytes));
                if (definition.Id != message.AssetId) throw new InvalidDataException("Card definition ID does not match its transfer.");
                DefinitionRegistry.Register(definition);
            }
            else DefinitionRegistry.SetArt(message.AssetId, bytes);
            Receiver.Applied(receipt);
        }
        Send(new CardTransferMessage { Kind = TransferKind.Received, TransferId = message.TransferId });
    }
}

// The loader assembly delegates implementation to VoiceDirector.Game.dll; expose its message type to the native scan.
[HarmonyPatch(typeof(ReflectionHelper), nameof(ReflectionHelper.GetSubtypesInMods), [typeof(Type)])]
public static class RegisterCardTransferMessage
{
    public static void Postfix(Type parentType, ref IEnumerable<Type> __result)
    {
        if (parentType == typeof(INetMessage)) __result = __result.Append(typeof(CardTransferMessage)).Append(typeof(Voice.VoicePacket)).Distinct();
    }
}

[HarmonyPatch(typeof(RunManager), "InitializeShared")]
public static class AttachCardTransfer
{
    public static void Postfix(RunManager __instance) => CardTransfer.Attach(__instance);
}
[HarmonyPatch(typeof(RunManager), nameof(RunManager.Launch))]
public static class LaunchCardTransfer
{
    public static void Prefix() => CardTransfer.Launch();
}
[HarmonyPatch(typeof(RunManager), nameof(RunManager.OnEnded))]
public static class EndCardTransfer
{
    public static void Prefix() => CardTransfer.End();
}
[HarmonyPatch(typeof(RunManager), nameof(RunManager.CleanUp))]
public static class DetachCardTransfer
{
    public static void Prefix() => CardTransfer.Detach();
}
