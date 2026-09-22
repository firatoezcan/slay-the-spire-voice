# Networking, microphone input, and the first experiment

Researched 2026-09-22. Source inspection only: no reference mod was launched, no microphone recording was made, and no generated card was exercised in-game.

The expanded proposal is in [PITCH.md](../PITCH.md). Read [the runtime investigation](runtime-cards-and-art.md) for the later installed-game findings, and [the AI director note](ai-director-research.md) for Codex, Jev, SQLite and external integrations.

## Network access already exists in STS2 mods

These are three distinct examples, with concrete implementations checked locally:

| Pattern | What the source actually does | Relevance |
| --- | --- | --- |
| Mod sends HTTP | Communication_Mod runs a background sender, calls `HttpClient.PostAsync` with JSON to `http://127.0.0.1:5000/update_state`, reads the response, and uses `Godot.Callable.From(...).CallDeferred()` to execute the returned action. | Direct precedent for asking a local generation service for a card. |
| Mod hosts HTTP | sts2-ai-mod uses `HttpListener`, exposing `GET /state`, `GET /state/wait`, `GET /map`, and `POST /action`. Its initializer selects port **57541**, overriding the server constructor's default of 8080. | A companion can submit results to a running mod. Its `GodotMainThread` helper shows deferred dispatch. |
| Mod connects over WebSocket | neuro-sts2 discovers a server URL, creates a WebSocket, queues messages, dispatches incoming messages from its processing loop, and reconnects after closure. | A persistent channel could carry generation requests, progress, and completed cards. |

Sources: [Communication_Mod sender](https://github.com/Manuelbbl/Communication_Mod_STS2/blob/main/Communication_Mod_eng/Communication_ModCode/MainFile.cs), [HTTP server](https://github.com/ndwang/sts2-ai-mod/blob/main/HttpServer.cs), [actual HTTP startup](https://github.com/ndwang/sts2-ai-mod/blob/main/Plugin.cs), [main-thread helper](https://github.com/ndwang/sts2-ai-mod/blob/main/Utilities/GodotMainThread.cs), [WebSocket connection](https://github.com/VedalAI/neuro-sts2/blob/main/NeuroSdk/Websocket/WebsocketConnection.cs).

These demonstrate network integration in source; they are not compatibility tests against our installed game. Communication_Mod's shared sender fields and the HTTP mod's background state reads also need a fresh threading design before reuse. For our implementation, capture game context and apply completed cards on the game thread; perform network waits separately. Godot documents that active scene-tree access is not thread-safe and recommends deferred calls. [Godot threading reference](https://docs.godotengine.org/en/stable/tutorials/performance/thread_safe_apis.html).

## Where the microphone can live

Two approaches are worth considering:

| Approach | What it buys us | What needs checking |
| --- | --- | --- |
| A local companion captures audio and handles transcription/generation | An independent place to develop audio, model integration, and streaming; the mod receives a small card specification. | Companion packaging, microphone permission, and latency. |
| The mod captures audio through Godot | One in-game interface for listening and generation. | Whether STS2's runtime enables audio input, permission handling in the shipped macOS app, and compatibility with the game's Godot build. |

Godot provides `AudioStreamMicrophone`, `AudioEffectRecord` for recordings, and `AudioEffectCapture` for raw PCM frames suitable for streaming. Audio input must be enabled. These engine APIs establish an available mechanism, not proof that microphone capture already works inside an STS2 mod. [Recording guide](https://docs.godotengine.org/en/stable/tutorials/audio/recording_with_microphone.html), [AudioEffectCapture reference](https://docs.godotengine.org/en/stable/classes/class_audioeffectcapture.html). The stable docs can move ahead of the game's embedded engine; confirm signatures against its local assemblies.

## Proposed first architecture

This is a recommendation for the first prototype, not an implemented or settled product design:

```text
Microphone → local companion → transcription + card generation
                                     ↓
                              validated card data
                                     ↓
                         mod applies it on the game thread
                                     ↓
                            a new playable card instance
```

Start with HTTP and a local companion. Keep provider credentials with the companion. Let the model produce a card specification: a name, cost, target, and ordered effects such as damage, block, draw, or applying a supported power. Implement those effects with the game's card commands. The effect vocabulary determines what generated cards can do; new mechanics require extending that vocabulary. BLANKthespire's [contract](https://github.com/ryanrinkel/BLANKthespire/tree/main/mod/contract) and [runtime](https://github.com/ryanrinkel/BLANKthespire/tree/main/mod/BlankTheSpireCode/Engine) provide a concrete example of this design.

Both true runtime types/IDs and a pre-registered type with per-instance generated data are worth distinguishing. Different generated cards need independent names, descriptions, costs, effects, portraits, and saved state. The [runtime investigation](runtime-cards-and-art.md) identifies the extra registry work for new IDs and confirms concrete portrait-refresh hooks.

For the first voice demo, a listening button or push-to-talk makes input easy to observe; ambient listening is another input setting. The selected gameplay modes are [Wildcard and Living Deck](game-modes.md): one same-rarity replacement in every card reward, or automatic one-for-one replacements of existing deck cards under tunable rules. Multiplayer would additionally need synchronized specs and deterministic application; it is outside the first proposed experiment.

## First experiment, in order

1. **Prove a runtime card.** Create a genuinely new type/ID after initialization using fixed data; instantiate it during combat. Verify display/effects, copying, upgrades, and save/reload after reconstructing the canonical definition. Use placeholder art.
2. **Connect the local service.** Have it return the same specifications over HTTP. Keep play responsive while waiting; reject late results after their intended run/combat is gone and apply each result once.
3. **Add speech and generation.** A short utterance produces a validated spec and a playable card. Display listening/generating/error state and measure the time from speech ending to card appearing.
4. **Add generated artwork.** Start one artwork job on first successful play, then update/cache the portrait without blocking card resolution. Exercise the portrait-refresh path with a fixed local image in the first engine experiment.

The first experiment resolves the largest uncertainty: live creation of distinct cards. The closest generated-card reference currently loads fixed slots at startup and explicitly requires a restart after importing a class. [BLANKthespire card slots](https://github.com/ryanrinkel/BLANKthespire/blob/main/mod/BlankTheSpireCode/Engine/ForgedCards.cs), [installation behavior](https://github.com/ryanrinkel/BLANKthespire/blob/main/INSTALL.md).

## This Mac

Read-only checks found an installed **Slay the Spire 2 v0.107.1** under the standard Steam directory. Its app bundle contains ARM64 and x86-64 data directories, and the ARM64 directory contains `sts2.dll`. Its runtime configuration targets .NET 9 and includes runtime 9.0.7. These observations come from the local `release_info.json` and `sts2.runtimeconfig.json`, not from a launch.

`dotnet`, `godot`, and `godot-mono` were not available on the current shell's PATH. The development SDK/editor setup still needs doing. Reference mods target different dependency versions and some contain Windows-specific paths; none has been compiled against the installed game. Pin a compatible game/BaseLib/toolchain combination when starting the prototype. No game files or settings were changed.
