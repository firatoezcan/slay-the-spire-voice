namespace VoiceDirector.Multiplayer;

// A transport supplies sender identity. The contract decides which messages may cross into the run.
public sealed record CardSessionScope(string RunId, ulong HostId, bool IsAuthority, bool Active, ulong[] Players)
{
    public bool Accepts(CardTransferMessage message, ulong sender)
    {
        if (!Players.Contains(sender)) return false;
        if (IsAuthority)
        {
            if (sender == HostId) return false;
            if (message.Kind == TransferKind.RequestSession) return true;
            return Active && message.SessionId == RunId && message.Kind is TransferKind.RequestAssets or TransferKind.Received;
        }
        if (sender != HostId) return false;
        if (message.Kind == TransferKind.Session) return true;
        return Active && message.SessionId == RunId && message.Kind is TransferKind.Definition or TransferKind.Artwork or
            TransferKind.Settings or TransferKind.CardOffer or TransferKind.RewardOffer;
    }
}
