namespace VoiceDirector.Contracts;

public sealed record DirectorSettings(string Mode = "living-deck", int MaxPerTurn = 1,
    int CooldownTurns = 0, double Strength = 0.5, double Synergy = 0.5, bool Enabled = true, bool DebugConsole = false);
public sealed record CreatureView(string Id, string Name, decimal Health, decimal MaxHealth, decimal Block, bool Enemy);
public sealed record ChoiceView(string Id, string Kind, string Label, bool Enabled);
public sealed record GameSnapshot(string RunId, long Revision, string Phase, int Turn,
    CardInstance[] Cards, CreatureView[] Creatures, ChoiceView[] Choices, string[] Actions,
    DirectorSettings Settings, bool Host, string? Error = null);
public sealed record Operation(string Id, string Kind, string Status, string? Error, DateTimeOffset CreatedAt, DateTimeOffset? CompletedAt);
public sealed record GameEvent(string Id, string RunId, string Kind, string? InstanceId, string? DefinitionId, string Message, DateTimeOffset At);
public sealed record ActionRequest(string RunId, string RequestId);
public sealed record PlayRequest(string RunId, string RequestId, string InstanceId, string? TargetId);
public sealed record ChoiceRequest(string RunId, string RequestId, string ChoiceId);
public sealed record PotionRequest(string RunId, string RequestId, int Slot, string? TargetId);
public sealed record ConsoleRequest(string RequestId, string Command, string[] Arguments);
public sealed record ConsoleCommand(string Name, string Arguments, string Description, bool DebugOnly);
public sealed record ConsoleCompletionRequest(string Command, string[] Arguments);
public sealed record ConsoleOption(string Value, string Label);
public sealed record ConsoleArgument(string Name, string Label, string Kind, bool Required, string DefaultValue, ConsoleOption[] Options);
public sealed record ConsoleResult(bool Success, string Message);
public sealed record Capabilities(string GameVersion, bool Connected, string[] Effects, string[] Powers, bool SinglePlayerOnly);
public sealed record CardSyncPeer(string PlayerId, bool Connected, int Pending, int Received, string? Error);
public sealed record CardSyncStatus(string Role, string RunId, bool Active, CardSyncPeer[] Peers);
public sealed record CardSyncRequest(string PlayerId);

public interface IGamePort
{
    Task<GameSnapshot> Snapshot();
    Task<Capabilities> Capabilities();
    Task<CardDefinition[]> Definitions();
    Task<CardReference[]> CardReferences();
    Task<ArtReferenceSheet> ArtReference(ArtReferenceRequest request);
    Task<CardValidation> ValidateCard(CardDefinition request);
    Task<GameEvent[]> Events();
    Task<Operation[]> Operations();
    Task<ConsoleCommand[]> ConsoleCommands();
    Task<string[]> Complete(ConsoleCompletionRequest request);
    Task<ConsoleArgument[]> ConsoleArguments(ConsoleCompletionRequest request);
    Task<Operation> Play(PlayRequest request);
    Task<Operation> EndTurn(ActionRequest request);
    Task<Operation> Choose(ChoiceRequest request);
    Task<Operation> UsePotion(PotionRequest request);
    Task<Operation> Console(ConsoleRequest request);
    Task<Operation> Prepare(CandidateRequest request);
    Task<Operation> Transform(TransformRequest request);
    Task<Operation> Art(ArtRequest request);
    Task<DirectorSettings> Configure(DirectorSettings request);
    Task<CardSyncStatus> CardSync();
    Task<CardSyncStatus> ResyncCards(CardSyncRequest request);
    Task<VoiceStatus> VoiceStatus();
    Task<VoiceStatus> ConfigureVoice(VoiceSettings request);
    Task<VoiceSegment[]> VoiceSegments();
}
