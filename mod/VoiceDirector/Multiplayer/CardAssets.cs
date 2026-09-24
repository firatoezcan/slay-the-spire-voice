using System.Security.Cryptography;
using VoiceDirector.Cards;
using VoiceDirector.Contracts;

namespace VoiceDirector.Multiplayer;

public sealed record CardAssetReceipt(string TransferId, string AssetId, TransferKind Kind, byte[]? Bytes);

public static class CardAssetPackets
{
    public static string Digest(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
    public static int Limit(TransferKind kind) => kind switch
    {
        TransferKind.Definition => GeneratedCardSerialization.MaxDefinitionBytes,
        TransferKind.Artwork => ArtworkRules.MaxBytes,
        _ => throw new InvalidDataException("Expected a card asset.")
    };
    public static CardTransferMessage[] Create(TransferKind kind, string id, byte[] bytes, string sessionId)
    {
        if (bytes.Length is <= 0 || bytes.Length > Limit(kind)) throw new InvalidDataException("Card asset exceeds the transfer limit.");
        var count = (ushort)((bytes.Length + CardTransferMessage.ChunkBytes - 1) / CardTransferMessage.ChunkBytes);
        var transferId = Guid.NewGuid().ToString("N");
        var digest = Digest(bytes);
        return Enumerable.Range(0, count).Select(index =>
        {
            var offset = index * CardTransferMessage.ChunkBytes;
            return new CardTransferMessage { Kind = kind, SessionId = sessionId, AssetId = id, TransferId = transferId, Digest = digest,
                Index = (ushort)index, Count = count, Length = bytes.Length,
                Data = bytes.AsSpan(offset, Math.Min(CardTransferMessage.ChunkBytes, bytes.Length - offset)).ToArray() };
        }).ToArray();
    }
}

// Each receiving connection owns its assembly buffer. No partial bytes reach the card registry.
public sealed class CardAssetReceiver
{
    private sealed class Incoming(CardTransferMessage first)
    {
        public readonly CardTransferMessage First = first;
        public readonly byte[][] Chunks = new byte[first.Count][];
        public readonly long Created = System.Environment.TickCount64;
        public int Received;
    }
    private readonly Dictionary<string, Incoming> _incoming = [];
    private readonly Dictionary<string, long> _completed = [];
    public void Clear() { _incoming.Clear(); _completed.Clear(); }
    public CardAssetReceipt? Receive(CardTransferMessage message)
    {
        var now = System.Environment.TickCount64;
        foreach (var old in _incoming.Where(p => now - p.Value.Created > 30000).Select(p => p.Key).ToArray()) _incoming.Remove(old);
        foreach (var old in _completed.Where(p => now - p.Value > 60000).Select(p => p.Key).ToArray()) _completed.Remove(old);
        if (_completed.ContainsKey(message.TransferId)) return new(message.TransferId, message.AssetId, message.Kind, null);
        if (!Guid.TryParseExact(message.TransferId, "N", out _) || message.Length is <= 0 || message.Length > CardAssetPackets.Limit(message.Kind) ||
            message.Count != (message.Length + CardTransferMessage.ChunkBytes - 1) / CardTransferMessage.ChunkBytes || message.Index >= message.Count ||
            message.Data.Length != Math.Min(CardTransferMessage.ChunkBytes, message.Length - message.Index * CardTransferMessage.ChunkBytes))
            throw new InvalidDataException("Invalid card asset dimensions.");
        if (!_incoming.TryGetValue(message.TransferId, out var incoming))
        {
            if (_incoming.Count >= 16) throw new InvalidDataException("Too many unfinished card transfers.");
            _incoming[message.TransferId] = incoming = new(message);
        }
        var first = incoming.First;
        if (first.SessionId != message.SessionId || first.Kind != message.Kind || first.AssetId != message.AssetId || first.Digest != message.Digest || first.Length != message.Length || first.Count != message.Count)
            throw new InvalidDataException("Card transfer headers changed.");
        if (incoming.Chunks[message.Index] is null) { incoming.Chunks[message.Index] = message.Data; incoming.Received++; }
        if (incoming.Received != message.Count) return null;
        _incoming.Remove(message.TransferId);
        var bytes = incoming.Chunks.SelectMany(c => c).ToArray();
        if (CardAssetPackets.Digest(bytes) != message.Digest) throw new InvalidDataException("Card transfer is incomplete or damaged.");
        return new(message.TransferId, message.AssetId, message.Kind, bytes);
    }
    // Acknowledge only after the caller has successfully validated and installed the complete asset.
    public void Applied(CardAssetReceipt receipt) => _completed[receipt.TransferId] = System.Environment.TickCount64;
}
