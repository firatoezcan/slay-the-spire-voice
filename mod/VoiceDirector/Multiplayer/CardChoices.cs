using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.Entities.Multiplayer;
using MegaCrit.Sts2.Core.GameActions;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using VoiceDirector.Cards;

namespace VoiceDirector.Multiplayer;

public sealed record CardOffer(ulong PlayerId, uint ChoiceId, string? DefinitionId);
public sealed record RewardOffer(ulong PlayerId, string InstanceId, string DefinitionId);

// The host supplies a decision; the card owner sends it through the game's existing choice stream.
// This preserves per-player ordering, native action resumption, and replay recording.
public static class CardChoices
{
    private static readonly Dictionary<uint, TaskCompletionSource<string?>> Offers = [];
    private static CancellationTokenSource _session = new();
    public static void Clear()
    {
        _session.Cancel(); _session.Dispose(); _session = new();
        foreach (var pending in Offers.Values) pending.TrySetCanceled();
        Offers.Clear();
    }
    public static void Receive(CardOffer offer)
    {
        if (offer.PlayerId != LocalContext.NetId) return;
        if (!Offers.TryGetValue(offer.ChoiceId, out var pending))
        {
            if (Offers.Count >= 64) throw new InvalidDataException("Too many pending card choices.");
            Offers[offer.ChoiceId] = pending = new();
        }
        pending.TrySetResult(offer.DefinitionId);
    }
    public static async Task<string?> Draw(CardModel card, PlayerChoiceContext context, Func<string?> choose)
    {
        var replay = RunManager.Instance.NetService.Type == NetGameType.Replay;
        var owner = card.Owner;
        var choices = RunManager.Instance.PlayerChoiceSynchronizer;
        var choiceId = choices.ReserveChoiceId(owner);
        string? definition = null;
        if (CardTransfer.IsAuthority)
        {
            definition = choose();
            if (definition is not null) CardTransfer.PublishDefinition(definition);
            if (!LocalContext.IsMe(owner))
                CardTransfer.Control(TransferKind.CardOffer, new CardOffer(owner.NetId, choiceId, definition), owner.NetId);
        }
        await context.SignalPlayerChoiceBegun(PlayerChoiceOptions.None);
        PlayerChoiceResult result;
        if (!replay && LocalContext.IsMe(owner))
        {
            if (!CardTransfer.IsAuthority)
            {
                if (!Offers.TryGetValue(choiceId, out var pending)) Offers[choiceId] = pending = new();
                try { definition = await pending.Task.WaitAsync(_session.Token); }
                finally { Offers.Remove(choiceId); }
            }
            result = PlayerChoiceResult.FromCanonicalCard(definition is null ? null : DefinitionRegistry.Canonical(definition));
            choices.SyncLocalChoice(owner, choiceId, result);
        }
        else result = await choices.WaitForRemoteChoice(owner, choiceId).WaitAsync(_session.Token);
        await context.SignalPlayerChoiceEnded();
        var selected = result.AsCanonicalCard() is GeneratedCard generated ? generated.DefinitionId : null;
        if (CardTransfer.IsAuthority && selected != definition) throw new InvalidDataException("The card choice differs from the host decision.");
        return selected;
    }
    public static void CompleteReward(CardModel card, string definitionId)
    {
        if (!CardTransfer.IsAuthority) throw new InvalidOperationException("Only the host can provide a generated card.");
        CardTransfer.PublishDefinition(definitionId);
        if (LocalContext.IsMe(card.Owner)) RewardHooks.Receive(definitionId);
        else CardTransfer.Control(TransferKind.RewardOffer, new RewardOffer(card.Owner.NetId, Lineage.Get(card).Id, definitionId), card.Owner.NetId);
    }
    public static void Receive(RewardOffer offer)
    {
        if (offer.PlayerId == LocalContext.NetId && Director.RewardInstance == offer.InstanceId)
            RewardHooks.Receive(offer.DefinitionId);
    }
}
