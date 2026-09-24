# Multiplayer protocol and host-only generation

Inspected 23 September 2026 against the installed macOS ARM64 game assembly used by this project, release v0.107.1. Findings below come from the installed assembly, the checked-out BaseLib source, and mod authors' source. This was a source investigation: no game was launched, no dependency was installed, and no multiplayer session was exercised. The additional decompilations live only in ignored `.research/decompiled/`.

The game already provides the transport needed for friends to install only the mod. The host can run Bun, Parakeet, and generation locally, then send validated card definitions, decisions, and artwork through the existing game connection. Every peer must execute gameplay changes at the same point in the game's synchronized flow. Running generation on the host does not make arbitrary host-side card mutations authoritative automatically.

The latest product clarification keeps the host dashboard available while the game is closed or idle. Generation and transcription are active only during a started host/singleplayer run. Joining clients need no companion process. This changes the original idea of stopping the entire web companion when a run ends.

## Mod settings

The host's `DirectorSettings` travel over the same reliable game connection as card data. Changing settings broadcasts their complete current value. Session messages also contain the settings, so joining or reconnecting players receive the current values. Clients accept settings from their active host and session, and their settings API reports that the host controls the run. Received values apply in memory; leaving the session restores that player's own saved settings.

This covers the mode, draw chance, per-turn limit, cooldown, strength, synergy, enabled state, and debug console option. Codex credentials, provider paths, and each player's microphone permission are local configuration.

## Native transport and message contracts

The relevant public interfaces in the installed build are:

```csharp
// MegaCrit.Sts2.Core.Multiplayer.Game
public interface INetGameService
{
    ulong NetId { get; }
    bool IsConnected { get; }
    NetGameType Type { get; }
    event Action<NetErrorInfo>? Disconnected;
    void SendMessage<T>(T message, ulong playerId) where T : INetMessage;
    void SendMessage<T>(T message) where T : INetMessage;
    void RegisterMessageHandler<T>(MessageHandlerDelegate<T> handler)
        where T : INetMessage;
    void UnregisterMessageHandler<T>(MessageHandlerDelegate<T> handler)
        where T : INetMessage;
    void SetBufferMessages(bool bufferMessages);
}

// MegaCrit.Sts2.Core.Multiplayer.Serialization
public interface INetMessage : IPacketSerializable
{
    bool ShouldBroadcast { get; }
    NetTransferMode Mode { get; }
    LogLevel LogLevel { get; }
    bool ShouldBuffer { get; }
}
// Implement IPacketSerializable with:
void Serialize(PacketWriter writer);
void Deserialize(PacketReader reader);
// Message handler shape: void Handler(T message, ulong senderId).
```

Sources: [INetGameService][net-service], [INetMessage][net-message], [NetMessageBus][message-bus].

`NetHostGameService.SendMessage(message)` sends to every connected peer marked ready for broadcasting. Its targeted overload sends to one peer. A client sends to its host. When a received client message has `ShouldBroadcast = true`, the host forwards it to the other ready clients with the original sender ID, before dispatching its own handlers. Sending does **not** invoke the sender's local handlers: locally chosen decisions need one explicit local application. Use reliable delivery for definitions, settings, requests, decisions, and image chunks. [Host service][host-service], [client service][client-service].

For host-authoritative mod messages, `ShouldBroadcast = false` is useful: clients' requests reach the host without automatic forwarding, and the host's explicit send still reaches all ready peers. Check the sender against the active host for host-issued decisions, and against the actual owner for owner requests. The flag is routing behavior, not authorization. The game's multiplayer implementer describes the host/client topology and ENet debugging transport in [his architecture article](https://straypixels.net/sts2-multiplayer-architecture/). Exact signatures and packet sizes in this note follow the installed assembly, because that article describes an earlier implementation.

`NetMessageBus.SerializeMessage` writes **one byte** for message type, then a 64-bit sender ID, then the message payload. `TryDeserializeMessage` instantiates the registered concrete type with `Activator.CreateInstance` and calls `Deserialize`. The practical message ID space is therefore 0–255 even though the lookup APIs use `int`. Keep a small fixed set of message types, with bounded payloads, rather than generating message classes per card. [Message bus][message-bus].

`PacketWriter.WriteString(string)` writes a 32-bit UTF-8 byte count followed by bytes. `WriteBytes(byte[], int)` does not add a length. Integers can use explicit bit widths; reader and writer must agree. Application code should validate message lengths and artwork chunk totals before allocating or applying data. [Packet writer][packet-writer], [packet reader][packet-reader].

## Message registration: native support, with a bootstrap caveat

`MessageTypes.Initialize()` combines `INetMessageSubtypes.All` and `ReflectionHelper.GetSubtypesInMods<INetMessage>()`, then constructs `NetTypeCache<INetMessage>`. `ActionTypes.Initialize()` does the same for `INetAction`. `NetTypeCache` sorts by the concrete type's **simple name** using ordinal comparison and assigns sequential IDs. Fixed custom message/action types can therefore join the native protocol without BaseLib. Avoid colliding simple names. Every peer needs the same registered message/action type set and ordering. [MessageTypes][message-types], [NetTypeCache][type-cache], [ActionTypes][action-types].

The existing architecture loads implementation code in `VoiceDirector.Game` through a bootstrap mod. Native reflection scans only `ModManager.GetLoadedMods().Select(m => m.assembly)` and caches that set. Loading an extra assembly is not enough to make its message/model/action types discoverable. Put the small fixed protocol types in the assembly recorded by the mod loader, or explicitly include them when native type caches initialize. Do not assume scanning all AppDomain assemblies is equivalent to the game's mod scan. [ReflectionHelper][reflection], [bootstrap](../mod/VoiceDirector.Bootstrap/Bootstrap.cs).

`OneTimeInitialization.ExecuteEssential()` calls `ModelDb.Init`, `ModelIdSerializationCache.Init`, `ModelDb.InitIds`, `MessageTypes.Initialize`, then `ActionTypes.Initialize`. Registration must be ready at those boundaries. [Startup initialization][startup].

Two concrete reference implementations are useful:

- [sts2_typing's ChatMessage](https://github.com/Shiroim/sts2_typing/blob/master/ChatMessage.cs) directly implements `INetMessage`, serializes a string, and requests reliable broadcast. [Its ChatPanel](https://github.com/Shiroim/sts2_typing/blob/master/ChatPanel.cs) registers/unregisters against the available service, sends through `SendMessage`, and applies its own local message separately. It also handles service changes between lobby and run.
- [BaseLib CustomMessage](../references/baselib/Abstracts/CustomMessage.cs) wraps `ICustomMessage` with a stable hash of its full type name; [CustomTargetedMessage](../references/baselib/Abstracts/CustomTargetedMessage.cs) adds room targeting. [Registration patches](../references/baselib/Patches/Networking/CustomMessagePatches.cs) attach handlers after `RunManager.InitializeShared` and detach after `CleanUp`. BaseLib reserves wrapper message IDs separately. [CustomLinkedRewardChoiceMessage](../references/baselib/Common/Rewards/LinkedRewardSet/CustomLinkedRewardChoiceMessage.cs) is a real gameplay use, applying a selected nested reward for the sending player. These are precedents, not a reason to add a new BaseLib dependency.

## Model ID compatibility and runtime generated cards

`InitialGameInfoMessage.Basic()` sends the game version, `ModelIdSerializationCache.Hash`, and installed mod lists. `JoinFlow.Begin(IClientConnectionInitializer, SceneTree)` rejects a game-version mismatch, a gameplay-mod mismatch, or a model-ID hash mismatch. Gameplay mod entries are `manifest.id + "-" + manifest.version`; cosmetic mod differences only warn. Keep `affects_gameplay = true` and increment the mod version for incompatible protocol changes. [Initial game info][initial-info], [JoinFlow][join-flow], [mod lists][mod-manager].

The model cache builds category/entry maps, reverse arrays, bit widths, and a compatibility value at startup from game types and loaded mod assemblies. It does not offer a public dynamic registration operation. `WriteModelEntry` silently writes `NONE` for an unknown entry; `ReadModelIdAssumingType<T>` turns the numeric entry back into a category-specific model ID. `WriteFullModelId` and `ReadFullModelId` handle category plus entry. [Model cache][model-cache], [model writers][model-writers], [model readers][model-readers].

At the start of this investigation, `DefinitionRegistry.Register` appended each generated ID to those private maps and recalculated bit widths. `Restore` loaded all personally cached definitions in filename order. It did not update the compatibility value. Consequently two peers can pass the native handshake and still have different entry mappings or packet widths. A fresh friend install and a host with old generated cards are a direct failure case. [DefinitionRegistry](../mod/VoiceDirector/Cards/DefinitionRegistry.cs).

Recommended protocol for the existing emitted-type design:

1. Register one fixed generated-card escape entry during startup on all peers. Keep generated definitions out of the native variable-width maps thereafter.
2. For a generated card, write the escape entry followed by bounded definition data; on read, validate/register the immutable definition and return its actual unique `ModelId`. Patch both entry-only and full-ID paths. Vanilla IDs retain their native representation.
3. Make the escaped payload independent of what is already cached. The same definition must produce the same bytes on every peer. Use a stable schema and deterministic serialization. Reject reuse of an ID with different rules.
4. Resolve generated models' sorting separately from native wire registration. `AbstractModel.InitId` expects an entry in the map; it cannot continue unchanged. A fixed sorting group with ordinal `ModelId.Entry` comparison can preserve definition ordering without growth of native wire IDs.

This is a proposed mod protocol, not an official runtime content API. A separate synchronized dynamic numeric registry would need a barrier before every mapping/bit-width change, plus join/load restoration before native card decoding. The fixed escape avoids that mutable global protocol state.

Sorting matters to gameplay: `DeterministicModelComparer` orders hooks by category sorting ID, entry sorting ID, owner, then card pile/index. Giving all generated cards one sorting ID can treat distinct ownerless canonicals as equal and changes ordering among owned cards. Do not derive sorting from local arrival order or an unchecked hash. [AbstractModel][abstract-model], [deterministic comparer][model-comparer].

The escaped data must work anywhere a model ID travels: serialized deck/combat cards, canonical-card choices, reward contents, run history, hover messages, reconnect snapshots, and replay data. Restricting the fix to `SerializableCard.Serialize` leaves other model references uncovered. Reconstruct definitions before `CardModel.FromSerializable` resolves the canonical model; otherwise the game substitutes `DeprecatedCard`. [CardModel][card-model], [SerializableCard][serializable-card].

## Reward choices execute on every peer

The actual sequence is:

1. `RewardsSetSynchronizer.SelectLocalReward(Reward)` sends the reward's room location, set ID, and reward index, then calls its local `SelectRewardForPlayer`.
2. `HandleRewardSelectedMessage` locates the sender's corresponding reward and executes the same path remotely.
3. `SelectRewardForPlayer` calls `reward.SelectUnsynchronized()`, which reaches `CardReward.OnSelect()` on every peer.
4. `CardReward.OnSelect` displays the card picker only where `LocalContext.IsMe(Player)`. All peers reserve the same owner choice ID; the owner sends the selected **index**, and the other peers await it.
5. Every peer then adds its corresponding offered card to that player's deck.

The normal reward flow does **not** simply send a fully acquired `SerializableCard` and let the other peers bypass `OnSelect`. A wildcard mark and any prepared offered replacement must match before the selected index is interpreted. A post-selection Keep/Transform/Lucky picker should execute only for the owning peer, while its decision and any subsequent transformation are awaited/applied by all peers. Bind reward state by owner and reward identity, not one global active reward. [RewardsSetSynchronizer][reward-sync], [CardReward][card-reward].

The relevant native choice API is:

```csharp
// MegaCrit.Sts2.Core.GameActions.Multiplayer.PlayerChoiceSynchronizer
uint ReserveChoiceId(Player player);
void SyncLocalChoice(Player player, uint choiceId, PlayerChoiceResult result);
Task<PlayerChoiceResult> WaitForRemoteChoice(Player player, uint choiceId);
```

`PlayerChoiceResult` supports canonical cards, existing combat/deck cards, fully serialized mutable cards, player IDs, and integer index lists. There is no arbitrary JSON/string payload variant. `FromIndex(int?)` fits Keep/Transform/Lucky. `FromMutableCard(CardModel?)` carries a full card through `SerializableCard`, if its custom identity/data serialization is already correct. [PlayerChoiceSynchronizer][choice-sync], [PlayerChoiceResult][choice-result], [NetPlayerChoiceResult][net-choice].

The receiver associates a choice with the actual message sender. Passing another player's object to `SyncLocalChoice` does not make a host send on that player's behalf. Host choices can use the host's own choice stream, but independent reward tasks for multiple owners can reserve host choice IDs in different orders across peers. For asynchronous AI outputs, use a custom result keyed by run/owner/request; keep native owner choices for UI input.

During combat, reserve native choice IDs in a deterministic context before pausing an action. The sequence counters enter checksums. `GameActionPlayerChoiceContext.SignalPlayerChoiceBegun` pauses the shared action; `SignalPlayerChoiceEnded` asks the action owner to resume through `ActionQueueSynchronizer`, then awaits that shared resumption. A custom network await is not automatically a native action pause. [Choice synchronizer][choice-sync], [game action choice context][action-choice-context].

## Draw decisions and stable identities

`ActionQueueSynchronizer.RequestEnqueue(GameAction)` routes clients' requests to the host, which orders and broadcasts the action; every peer reconstructs and executes it. `INetAction : IPacketSerializable` exposes `GameAction ToGameAction(Player player)`, and native action registration supports fixed custom implementations. Keep user-triggered combat mutations in that queue. A transformation attached to a native draw should run inside that already-shared draw flow, after all peers receive the same host decision. Receiving a message should fulfill pending data/decision work, not mutate the deck independently of the action. [Action queue][action-sync], [INetAction][net-action], [GameAction][game-action].

Useful identities:

| Item | Exact native mechanism | Lifetime / limitation |
| --- | --- | --- |
| Player | `Player.NetId` / `INetGameService.NetId` | Identifies the owner; client host is `NetClientGameService.HostNetId` |
| Existing combat card | `NetCombatCard.FromModel(card).CombatCardIndex`; `NetCombatCardDb.Instance.GetCardId(card)` | 16-bit wire index, reset every combat; cards acquire IDs from synchronized pile population |
| Existing deck card | `NetDeckCard.FromModel(card).DeckIndex` | 16-bit position in that owner's deck; changes when earlier cards are removed/inserted |
| Native choice | Owner plus `ReserveChoiceId(owner)` result | Must be reserved in the same logical order on each peer |
| Reward | Owner, reward set ID, index, room location | Synchronizer state includes its next reward IDs |
| Run | No UUID found in `RunState`/`SerializableRun` | Persist and distribute a mod-owned run ID |

Sources: [combat card reference][combat-card], [combat card database][combat-card-db], [deck card reference][deck-card], [run save][run-save], [RunManager][run-manager], [reward synchronization][reward-sync].

`SerializableRun.StartTime` exists, but `SetUpNewMultiplayer` initializes it with local UTC time on each machine. It is not a guaranteed common identifier before state exchange. Seed plus players also repeats when replaying a seed. A host-issued persistent mod run ID plus an active-session generation is safer for stale-response rejection.

For automatic draws, key a host decision by run ID, room/combat identity, owner, native combat card ID, and draw occurrence. Include explicit no-change decisions so all peers progress identically when no candidate is ready. The host makes the chance/candidate decision once; clients must not reroll with `Random.Shared` or independently test candidate availability. Do not use a deck index as an indefinitely valid asynchronous target. Cancel pending waits when the run ends or the relevant player disconnects. These are implementation recommendations inferred from the native identities and synchronization paths above.

`RunLocationTargetedMessageBuffer.RegisterMessageHandler<T>` accepts `T : INetMessage, IRunLocationTargetedMessage`. It buffers messages for locations not yet visited. It also dispatches messages for **previously visited** rooms; it does not reject old-room messages. Retain explicit current-run/combat/request checks. [Location buffer][location-buffer].

## Save/load, reconnect, and checksum boundaries

`SerializableCard` serializes model ID, upgrade level, enchantment, saved properties, and floor added. Its own documentation directs existing-card references to `NetCombatCard`/`NetDeckCard`. `SerializableRun` serializes the run's players/decks plus history and other state through the same packet system. Its `ExtraFields` is a fixed native structure, not an arbitrary mod dictionary. [SerializableCard][serializable-card], [SerializableRun][run-save], [extra fields][extra-fields].

`LoadRunLobby.HandleClientLoadJoinRequestMessage` sends a `ClientLoadJoinResponseMessage` containing the full `SerializableRun` before the run starts. `RunLobby.HandleClientRejoinRequestMessage` allows an existing member to reconnect, gets `RunManager.GetRejoinMessage`, and sends a `ClientRejoinResponseMessage` containing `SerializableRun` plus optional `NetFullCombatState`. Therefore definition decoding cannot depend on a run-scoped handler that is attached only after `Launch`: the load/rejoin packet is decoded earlier. Inline definitions in the model serializer handle that ordering; separate manifests require a deliberate pre-decode join barrier. [Load lobby][load-lobby], [run lobby][run-lobby], [load response][load-response], [rejoin response][rejoin-response].

The multiplayer implementer's May architecture article said joining a running lobby was denied. The installed build now distinguishes joining a new player from rejoining a known member; the local code above is the authority for this version.

At combat entry, `CombatStateSynchronizer.StartSync` broadcasts each owner's serialized player; the host additionally sends RNG/shared relic state. `WaitForSync` applies remote players' serialized state. This is another route that must preserve generated definitions and lineage, even if a previous transformation already executed on every peer. [CombatStateSynchronizer][combat-sync].

`ChecksumTracker.GenerateChecksum(NetFullCombatState)` uses `PacketWriter`, zeros the unused trailing bits, and hashes the bytes. Full state includes serialized combat cards and native choice/reward/action counters. Consequently:

- Inline definition serialization must be identical with empty or warm caches. Conditional “definition only if missing” encoding changes checksums.
- Artwork, job status, transport progress, and local UI state must stay out of gameplay serialization.
- Existing `CardLineage.Id = Guid.NewGuid()` cannot independently initialize corresponding cards on every peer. At minimum, establish shared/deterministic lineage before it reaches card serialization. The current `SaveLineage` patch adds lineage to every mutable card's `SavedProperties`.
- Fixed saved-property names must use matching IDs/widths across peers. `SavedPropertiesTypeCache` is separate from model IDs in this installed build, and its names are also compact numeric references.
- Reconnect restores native choice/reward/action counters, but a mod's pending request/draw counters are not automatically restored. Either persist those counters, derive a fresh session from the restored state, or explicitly synchronize them.

Sources: [ChecksumTracker][checksum], [NetFullCombatState][full-combat], [Lineage](../mod/VoiceDirector/Cards/Lineage.cs), [saved-property cache][property-cache].

Record custom decisions if combat replay is expected to reproduce them. Native `PlayerChoiceReceived` feeds game replay recording, whereas arbitrary mod message handlers are not automatically part of the native replay. A replay must not start AI services or wait for a live host. Existing immutable definitions should remain usable when policy for admitting new definitions changes. [Replay writer][replay-writer], [RunManager replay setup][run-manager].

## Artwork transfer

Generate art once on the host and send the resulting PNG bytes over the game connection. A host filesystem path or its loopback HTTP URL is unusable on a friend's machine. Keep each image associated with immutable definition identity and transfer bounded chunks; 32 KiB is a reasonable initial implementation choice, not a discovered game protocol limit. Track total size, chunk index/count, and a completion integrity value, then apply the completed texture on the game thread. Cache it locally for reload/rejoin and request missing art after gameplay state is ready.

Use the existing `DefinitionRegistry.SetArt` validation/texture path on receiving peers after complete assembly of an image. Avoid making card execution wait for artwork. First-play notifications from any owner should converge on one host job per definition. Send image transfers outside gameplay checksum data and avoid filling the reliable game channel with an entire large image in one synchronous operation. These are recommendations; native transport inspection establishes byte-message support but does not prove throughput or acceptable image chunk size in an actual Steam session. [DefinitionRegistry](../mod/VoiceDirector/Cards/DefinitionRegistry.cs), [host service][host-service], [packet writer][packet-writer].

## Run lifecycle and local qualification

`RunManager.IsInProgress` is `State != null`, including setup and a brief cleanup interval. `RunManager.Launch()` sets `LocalContext.NetId`, disables message buffering, then invokes `event Action<RunState> RunStarted`. Register network handlers during/after `InitializeShared` so buffered run traffic has consumers before `Launch` flushes it. Treat `RunStarted`/successful launch as the permission to activate generation/transcription for `NetGameType.Host` or `Singleplayer`; skip `Client` and `Replay`. [RunManager][run-manager], [BaseLib registration precedent](../references/baselib/Patches/Networking/CustomMessagePatches.cs).

`CleanUp(bool graceful = true)` sets `IsCleaningUp`, disposes synchronizers, disconnects the service, then clears state in `finally`. Cancel mod waits and active generation immediately at this boundary; unregister using the service captured at registration. `OnEnded(bool)` records a completed run separately, so completion may precede leaving the scene. The host dashboard can remain idle under the revised product requirement.

The installed build supports two local peers without an extra direct-connect mod:

- With `--fastmp`, `NMultiplayerHostSubmenu.StartHostAsync` uses `NetHostGameService.StartENetHost(33771, 4)` and host network ID 1.
- In the Join screen, `FastMpJoin()` uses `ENetClientConnectionInitializer(clientId, "127.0.0.1", 33771)`. Default client ID is 1000; `--clientId=2000` selects another client identity.
- `CommandLineHelper` trims leading hyphens and accepts `key=value`, so these exact switches are supported. These switches select transport; the Host/Join UI still performs normal lobby/run startup.

Sources: [host submenu][host-menu], [join screen][join-screen], [command-line parsing][command-line], [ENet initializer][enet-initializer], [ENet host][enet-host].

A useful qualification session uses separate mod data directories and a client with no companion launcher or existing definitions. Verify different personal definition caches, another player's reward transformation, draw transformations on both owners, opening-hand timing, a draw chain, first-play art transfer, save/quit/load, known-player rejoin, and run cancellation while generation is pending. Check both visible card state and native divergence logs. Deliberately exercise a card count near a native ID bit-width boundary to confirm generated definitions no longer grow that mapping. This investigation did not execute those scenarios.

[net-service]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.INetGameService.decompiled.cs
[net-message]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Serialization.INetMessage.decompiled.cs
[message-bus]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.NetMessageBus.decompiled.cs
[host-service]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.NetHostGameService.decompiled.cs
[client-service]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.NetClientGameService.decompiled.cs
[packet-writer]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Serialization.PacketWriter.decompiled.cs
[packet-reader]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Serialization.PacketReader.decompiled.cs
[message-types]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Serialization.MessageTypes.decompiled.cs
[type-cache]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Serialization.NetTypeCache%601.decompiled.cs
[action-types]: ../.research/decompiled/MegaCrit.Sts2.Core.GameActions.Multiplayer.ActionTypes.decompiled.cs
[reflection]: ../.research/decompiled/MegaCrit.Sts2.Core.Helpers.ReflectionHelper.decompiled.cs
[startup]: ../.research/decompiled/MegaCrit.Sts2.Core.Helpers.OneTimeInitialization.decompiled.cs
[initial-info]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Messages.Lobby.InitialGameInfoMessage.decompiled.cs
[join-flow]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.JoinFlow.decompiled.cs
[mod-manager]: ../.research/decompiled/MegaCrit.Sts2.Core.Modding.ModManager.decompiled.cs
[model-cache]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Serialization.ModelIdSerializationCache.decompiled.cs
[model-writers]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Serialization.PacketWriterExtensions.decompiled.cs
[model-readers]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Serialization.PacketReaderExtensions.decompiled.cs
[abstract-model]: ../.research/decompiled/MegaCrit.Sts2.Core.Models.AbstractModel.decompiled.cs
[model-comparer]: ../.research/decompiled/MegaCrit.Sts2.Core.Entities.Models.DeterministicModelComparer.decompiled.cs
[card-model]: ../.research/decompiled/MegaCrit.Sts2.Core.Models.CardModel.decompiled.cs
[serializable-card]: ../.research/decompiled/MegaCrit.Sts2.Core.Saves.Runs.SerializableCard.decompiled.cs
[reward-sync]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.RewardsSetSynchronizer.decompiled.cs
[card-reward]: ../.research/decompiled/MegaCrit.Sts2.Core.Rewards.CardReward.decompiled.cs
[choice-sync]: ../.research/decompiled/MegaCrit.Sts2.Core.GameActions.Multiplayer.PlayerChoiceSynchronizer.decompiled.cs
[choice-result]: ../.research/decompiled/MegaCrit.Sts2.Core.GameActions.PlayerChoiceResult.decompiled.cs
[net-choice]: ../.research/decompiled/MegaCrit.Sts2.Core.Entities.Multiplayer.NetPlayerChoiceResult.decompiled.cs
[action-choice-context]: ../.research/decompiled/MegaCrit.Sts2.Core.GameActions.Multiplayer.GameActionPlayerChoiceContext.decompiled.cs
[action-sync]: ../.research/decompiled/MegaCrit.Sts2.Core.GameActions.Multiplayer.ActionQueueSynchronizer.decompiled.cs
[net-action]: ../.research/decompiled/MegaCrit.Sts2.Core.GameActions.Multiplayer.INetAction.decompiled.cs
[game-action]: ../.research/decompiled/MegaCrit.Sts2.Core.GameActions.GameAction.decompiled.cs
[combat-card]: ../.research/decompiled/MegaCrit.Sts2.Core.Entities.Multiplayer.NetCombatCard.decompiled.cs
[combat-card-db]: ../.research/decompiled/MegaCrit.Sts2.Core.GameActions.Multiplayer.NetCombatCardDb.decompiled.cs
[deck-card]: ../.research/decompiled/MegaCrit.Sts2.Core.Entities.Multiplayer.NetDeckCard.decompiled.cs
[run-save]: ../.research/decompiled/MegaCrit.Sts2.Core.Saves.SerializableRun.decompiled.cs
[run-manager]: ../.research/decompiled/MegaCrit.Sts2.Core.Runs.RunManager.decompiled.cs
[location-buffer]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.RunLocationTargetedMessageBuffer.decompiled.cs
[extra-fields]: ../.research/decompiled/MegaCrit.Sts2.Core.Saves.Runs.SerializableExtraRunFields.decompiled.cs
[load-lobby]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.Lobby.LoadRunLobby.decompiled.cs
[run-lobby]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.Lobby.RunLobby.decompiled.cs
[load-response]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Messages.Lobby.ClientLoadJoinResponseMessage.decompiled.cs
[rejoin-response]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Messages.Lobby.ClientRejoinResponseMessage.decompiled.cs
[combat-sync]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.CombatStateSynchronizer.decompiled.cs
[checksum]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.ChecksumTracker.decompiled.cs
[full-combat]: ../.research/decompiled/MegaCrit.Sts2.Core.Entities.Multiplayer.NetFullCombatState.decompiled.cs
[property-cache]: ../.research/decompiled/MegaCrit.Sts2.Core.Saves.Runs.SavedPropertiesTypeCache.decompiled.cs
[host-menu]: ../.research/decompiled/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu.NMultiplayerHostSubmenu.decompiled.cs
[join-screen]: ../.research/decompiled/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu.NJoinFriendScreen.decompiled.cs
[command-line]: ../.research/decompiled/MegaCrit.Sts2.Core.Helpers.CommandLineHelper.decompiled.cs
[enet-initializer]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Connection.ENetClientConnectionInitializer.decompiled.cs
[enet-host]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Transport.ENet.ENetHost.decompiled.cs
[replay-writer]: ../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Replay.CombatReplayWriter.decompiled.cs
