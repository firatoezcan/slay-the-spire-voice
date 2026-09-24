# Ambient multiplayer voice: capture, Parakeet, and classification

Researched 23 September 2026. Sources include the installed speech adapter and `sherpa-onnx-node@1.13.2`, matching upstream native source, Godot 4.5 source/docs, Apple/Microsoft documentation, and TypeSafe's current API. No microphone capture, model inference, paid request, credential inspection, or application-code change was performed.

## Result and intended flow

The user selected **`gpt-6-luna` at `xhigh`** for classification only and **`gpt-6-astra`** for the rest of the flow. The current contract and use-case research are in [Jev classification research](jev-classification-research.md). Luna returns probabilities only. Creation at **P(yes) ≥0.95** proceeds to Astra's separate judgment at **P(yes) ≥0.90**. These are application thresholds on model estimates, not calibrated probabilities. Jev is not a runtime dependency.

`apps/companion/src/ambient/classifier.ts` sends original conversation from the trailing two minutes, divided into earlier context and the latest 15-second focus, plus current game facts. It omits decision history, scores, summaries, and proposed interpretations. Luna labels noise and accidental input; Astra receives kept original words and eligible targets. The source now connects capture, transcription, classification, generation, and transcript-linked dashboard decisions. Independent multiplayer transport remains to be verified.

The installed Codex CLI accepted `gpt-6-luna` at `xhigh` in actual requests on 23 September. `model_instructions_file` supplies the custom base instructions; tools, web search, plugin discovery, and workspace instruction loading are disabled for these requests. Authentication remains the user's existing Codex login. The profile starts an independent CLI process. [Official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

Observed request measurements, without generation or game mutations:

| Input | Input tokens | Elapsed time | Result |
| --- | ---: | ---: | --- |
| Empty transcript and targets | 4,920 | 4.9 s | Ignore |
| Current game snapshot and unrelated German speech | 6,665 | 5.3 s | Ignore, confidence 0.99 |

These are individual local observations, not latency guarantees. The CLI still adds context beyond the custom prompt. Its skill budget and disabled Code Mode host emit notices even though the request completes; the profile does not claim a completely empty tool/context envelope.

The existing Parakeet model can support continuous listening through repeated bounded offline decodes. It cannot incrementally decode an indefinitely growing stream. The preferred capture candidate is the **Steam Voice SDK already distributed with the game**, with a new mod-owned audio message to the host. This reuses a platform capability; the installed game does not expose an existing player-voice pipeline to hook. Microphone capture and macOS permission behavior through Steam remain an in-game verification step. No separate capture helper is selected.

Proposed ownership:

```text
Each player's enabled microphone
  -> Steam Voice capture -> compressed packets tagged with sequence/time
  -> authenticated game transport -> host Steam Voice decode to mono 16 kHz
  -> host's bounded per-player audio buffers
  -> persistent local Parakeet worker -> timestamped transcript segments
  -> rolling 15-second transcript -> gpt-6-luna xhigh >= 0.95
  -> independent LLM intent gate >= 0.90 -> generation queue
```

The host is the only machine that needs Parakeet weights and the authenticated Codex CLI. Friends receive generated card data through the game connection.

## Existing game voice: checked before designing capture

The installed macOS assembly is the previously identified **STS2 v0.107.1**. Its class inventory has no player voice/chat/capture class; the assembly symbol scan has no `GetVoice`, `DecompressVoice`, `StartVoiceRecording`, `Microphone`, or `PushToTalk` references. The voice-named methods were decompiled rather than assumed to be voice chat:

| Installed symbol | Actual behavior |
| --- | --- |
| `NDevotedSculptorVfx.StartVoice()` | Restarts a GPU particle effect on a monster animation event |
| `NCreditsScreen.InitVoices()` | Populates the voice-actor credits labels |
| `NAudioManager` | FMOD music/SFX/loop playback and volume controls |
| `SettingsSave`, `PrefsSave` | Music/SFX/ambience/master volume and background mute; no microphone, open-mic, or push-to-talk setting |
| `SteamHost`, `SteamClient`, `SteamUtil.ProcessMessages` | Generic SteamNetworkingSockets byte-message transport, with peer identity and channel; no voice decode/playback route |

Local evidence: [monster effect](../.research/decompiled/MegaCrit.Sts2.Core.Nodes.Vfx.NDevotedSculptorVfx.decompiled.cs), [credits](../.research/decompiled/MegaCrit.Sts2.Core.Nodes.Screens.Credits.NCreditsScreen.decompiled.cs), [audio manager](../.research/decompiled/MegaCrit.Sts2.Core.Nodes.Audio.NAudioManager.decompiled.cs), [settings](../.research/decompiled/MegaCrit.Sts2.Core.Saves.SettingsSave.decompiled.cs), [preferences](../.research/decompiled/MegaCrit.Sts2.Core.Saves.PrefsSave.decompiled.cs), [Steam transport](../.research/decompiled/MegaCrit.Sts2.Core.Multiplayer.Transport.Steam.SteamUtil.decompiled.cs). These ignored decompilations are private research artifacts and must not be committed.

The developer's April 17, 2026 Q&A also says they do not plan voice chat. That dated statement supports the installed-code finding, but does not prove every later beta has identical features. The current Steam news response inspected during this research contains newer beta announcements and no matching voice-chat announcement; no newer game assembly was downloaded or inspected. [Mega Crit's official Q&A](https://www.megacrit.com/news/2026-4-17-neowsletter-issue-21/).

Steam Friends/overlay voice is a separate service. Valve describes it as WebRTC voice routed through Steam servers. The game networking callback is not a feed of those conversations. No supported API for subscribing to friends-chat decoded per-user PCM was found in the inspected sources. [Steam Friends voice description](https://steamcommunity.com/updates/chatupdate).

**Therefore there is no verified existing in-game per-player PCM hook, voice-mode setting, or capture lifecycle to reuse in this installed build.** `SteamUtil.ProcessMessages` does provide the authenticated sender for new mod packets through `handler.OnPacketReceived(peerSteamId, bytes, mode, channel)`, which is a useful transport boundary for our own audio messages.

## Preferred capture candidate: Steam Voice SDK

The installed `Steamworks.NET.dll` exposes these exact C# signatures:

```csharp
void SteamUser.StartVoiceRecording();
void SteamUser.StopVoiceRecording();
EVoiceResult SteamUser.GetAvailableVoice(out uint pcbCompressed);
EVoiceResult SteamUser.GetVoice(bool bWantCompressed, byte[] pDestBuffer,
    uint cbDestBufferSize, out uint nBytesWritten);
EVoiceResult SteamUser.DecompressVoice(byte[] pCompressed, uint cbCompressed,
    byte[] pDestBuffer, uint cbDestBufferSize, out uint nBytesWritten,
    uint nDesiredSampleRate);
uint SteamUser.GetVoiceOptimalSampleRate();
```

[Installed wrapper](../.research/decompiled/Steamworks.SteamUser.decompiled.cs). Each calls the client Steam interface through `CSteamAPIContext.GetSteamUser()` after `InteropHelp.TestIfAvailableClient()`.

Valve explicitly supports starting recording for an entire gameplay session. Our ambient toggle owns `StartVoiceRecording`/`StopVoiceRecording`, and polling reads compressed packets. Steam Voice itself supplies **no transport**: the mod must send those packets to the host. The host can call `DecompressVoice(..., 16000)` to obtain mono PCM16 for conversion to Parakeet's normalized floats. Keep host-local microphone packets in the same per-player processing path. [Valve's integration flow](https://partner.steamgames.com/doc/features/voice), [decoder contract](https://partner.steamgames.com/doc/api/ISteamUser#DecompressVoice).

Poll each game frame or otherwise frequently enough to avoid capture gaps. Valve recommends an 8 KiB-or-larger compressed destination and a 20 KiB initial decoded destination, growing as necessary. These are allocation recommendations, **not documented maximum packet sizes**. `GetAvailableVoice` reports pending compressed size; `DecompressVoice` reports required output size on `BufferTooSmall`. Use bounded allocations/reassembly in our transport and preserve each compressed blob for decoding. On stop, drain until `NotRecording` because capture may retain a short tail. [Buffer and polling contracts](https://partner.steamgames.com/doc/api/ISteamUser#GetVoice).

The installed `EVoiceResult` values are `OK`, `NotInitialized`, `NotRecording`, `NoData`, `BufferTooSmall`, `DataCorrupted`, `Restricted`, `UnsupportedCodec`, `ReceiverOutOfDate`, and `ReceiverDidNotAnswer`, with the `k_EVoiceResult` prefix. Treat no-data as normal polling; resize within application limits for a short buffer; expose initialization/restriction/codec errors rather than reporting silence as success. [Installed enum](../.research/decompiled/Steamworks.EVoiceResult.decompiled.cs).

No input-device selector appears in this interface. Do not connect a Godot device selector to this path and imply it selects Steam's microphone. The wrapper and public documentation establish a client API, but do not conclusively establish which process owns hardware capture/TCC authorization on this Mac. Verify startup, positive audio, stop/drain, and permission attribution in the actual game before considering this path complete. Avoid `SetInGameVoiceSpeaking(true)` for ambient collection: that API suppresses the microphone in Steam Friends voice, which would interfere with the conversation we want players to keep having. [Steam Friends API](https://partner.steamgames.com/doc/api/ISteamFriends#SetInGameVoiceSpeaking).

## Jev is TypeSafe AI, with an exact probability field

The current model is **`jev-1.13.0`**; `jev-latest` and `jev-preview` currently resolve to it. Pin the version when tuning thresholds. Published pricing is **$0.042 per million input tokens**, with output tokens free. The documented limits are 1,200 requests/minute and 250,000 input tokens/second, subject to change. It accepts text/JSON, not audio, and performs best in English; German game conversation needs representative evaluation. [Current model contract](https://docs.typesafe.ai/models).

The HTTP call is `POST https://api.typesafe.ai/v1/systemone`, with `Authorization: Bearer <API_KEY>` and a JSON body containing `model`, `state`, and `questions`. For the requested yes/no gate, use a `noul` question and read `answers.<questionId>.noul`, a number from zero to one. Its optional `criteria` object has `true` and `false` descriptions. [HTTP reference](https://docs.typesafe.ai/api).

Illustrative request contract, not executed:

```json
{
  "model": "jev-1.13.0",
  "state": {
    "transcript": [
      { "speaker": "player-1", "startMs": 0, "endMs": 2500, "text": "..." }
    ],
    "eligibleAction": "generate_card"
  },
  "questions": {
    "card_intent": {
      "type": "noul",
      "instructions": "Does the conversation contain a current, actionable intent to create or transform a game card?",
      "criteria": {
        "true": "A participant expresses a concrete current card idea or request.",
        "false": "Only unrelated talk, a quotation, a negated or withdrawn request, or an already handled idea."
      }
    }
  }
}
```

The precise positive rubric should follow the game's ambient creativity rules; the example is a transport/threshold illustration, not a new requirement that players use explicit command language.

The official JavaScript package is **`@typesafe-ai/sdk@0.6.0`**, declaring Node ≥20 and no package dependencies. It exports `TypeSafeClient`, `noul`, `choice`, and `score`; the call is `client.systemOne({state, model, questions})`. `TYPESAFE_API_KEY` supplies authentication, `defaultModel` configures a pinned default, and the transport uses global `fetch` or an injected implementation. Bun compatibility follows from these primitives but was not exercised here. Ordinary Bun `fetch` against the documented HTTP contract is also possible. [SDK guide](https://docs.typesafe.ai/sdk/javascript), [package metadata](https://registry.npmjs.org/@typesafe-ai/sdk/0.6.0), [client source](https://github.com/typesafe-ai/typesafe-sdk-js/blob/v0.6.0/src/client.ts).

Keep the key in the host companion. The SDK rejects browser use by default; do not expose it to the React dashboard or multiplayer clients. SDK defaults include a 10-second per-attempt timeout and retries; use a total request deadline/cancellation tied to the transcript revision so old classifications do not arrive as new decisions. This investigation did not verify whether a key is configured. [Client configuration](https://docs.typesafe.ai/sdk/javascript/api/interfaces/TypeSafeClientConfig), [request/retry types](https://github.com/typesafe-ai/typesafe-sdk-js/blob/v0.6.0/src/types.ts).

### What 95% and 90% actually mean

Jev's `noul` is its probability of the affirmative proposition. Choice and Score instead expose a separate `confidence` statistic describing concentration of their probability distribution. A confidently selected negative answer must never pass the affirmative gate. `score` is a position on a supplied rubric, not an interchangeable probability. [Primitive semantics](https://docs.typesafe.ai/primitives), [confidence](https://docs.typesafe.ai/confidence).

TypeSafe describes its probabilities as calibrated and explicitly explains that calibration concerns groups of predictions, not a guarantee about one answer. That is a vendor claim, not measured calibration for German speech, game jargon, overlapping speakers, or ASR errors. Its limitations also warn that equivalent Noul/Choice formulations and separately asked negations need not yield equivalent probabilities. [Calibration explanation](https://docs.typesafe.ai/introduction/machine-learning-primer), [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).

Implement the requested policy literally: `jevAffirmativeProbability >= 0.95`, then a separately generated `intent=true` and `intentConfidence >= 0.90`. Give the second assessment the same frozen transcript and necessary game context, without Jev's score or reasoning, to reduce anchoring. Its confidence is an LLM-reported assessment until calibrated; a separate invocation does not establish statistical independence. Do not multiply the scores or advertise an accuracy derived from them.

Every gate result should retain the transcript revision, time interval, model version, prompt/rubric version, and affirmative decision. Missing/invalid output, unavailable credentials, timeouts, or failures leave that candidate unapproved. Deduplicate by the accepted speech evidence and candidate identity, so one phrase does not trigger on every overlapping 15-second window. These are application design recommendations.

For scale only: one 1,000-input-token Jev evaluation per second for an hour is approximately **$0.1512/hour** at the published rate. Actual tokens and cadence remain unmeasured. Evaluate only when transcript content changes; host aggregation avoids multiplying requests by player count unnecessarily.

## Installed Parakeet: continuous capture, bounded recognition

The installed weights are at:

`/Users/firatoezcan/.omp/agent/cache/tiny-models/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`

All four expected files exist: `encoder.int8.onnx`, `decoder.int8.onnx`, `joiner.int8.onnx`, and `tokens.txt`. The companion pins sherpa **1.13.2**. Its current worker holds a CPU `OfflineRecognizer` with two threads, creates a fresh stream for each request, accepts normalized 16 kHz mono samples, decodes synchronously, and returns only `.text`. The caller permits one job globally and rejects overlapping submissions through `busy`; it also limits inputs to 0.1–30 seconds. [Current manifest](../apps/companion/package.json), [worker](../apps/companion/src/providers/speech-worker.ts), [caller](../apps/companion/src/providers/speech.ts).

The installed JS comment says “Accept a chunk,” but the matching native header explicitly says `OfflineStream::AcceptWaveform` may be called **once**, with all samples. Its implementation finalizes feature input immediately. Therefore, repeatedly appending transport chunks to one offline stream is not a valid streaming implementation. `decodeAsync()` is available, but it changes execution scheduling, not the model's offline semantics. [Native contract at v1.13.2](https://github.com/k2-fsa/sherpa-onnx/blob/v1.13.2/sherpa-onnx/csrc/offline-stream.h), [native implementation](https://github.com/k2-fsa/sherpa-onnx/blob/v1.13.2/sherpa-onnx/csrc/offline-stream.cc), [JS wrapper](https://github.com/k2-fsa/sherpa-onnx/blob/v1.13.2/scripts/node-addon-api/lib/non-streaming-asr.js).

The same installed package contains `Vad` and `CircularBuffer`. VAD exposes `acceptWaveform`, `isDetected`, queued speech segments through `front/pop`, `flush`, and `reset`. Configuration supports Silero or Ten-VAD, including minimum silence/speech, window size, and maximum speech duration. The VAD model is a separate file; none is present in the checked Parakeet directory. The upstream microphone example demonstrates continuous capture into a VAD, then a new offline recognizer stream per segment. [VAD implementation](https://github.com/k2-fsa/sherpa-onnx/blob/v1.13.2/scripts/node-addon-api/lib/vad.js), [VAD microphone example](https://github.com/k2-fsa/sherpa-onnx/blob/v1.13.2/nodejs-addon-examples/test_vad_microphone.js), [offline ASR composition](https://github.com/k2-fsa/sherpa-onnx/blob/v1.13.2/nodejs-addon-examples/test_vad_asr_non_streaming_nemo_ctc_microphone.js).

Proposed continuous behavior: retain a separate bounded buffer and VAD state per player; emit completed speech promptly and force bounded windows during uninterrupted speech. A starting experiment could decode a maximum four-second speech window with a short overlap. Maintain draft/final segment revisions and reconcile overlap using token timestamps before adding text to the rolling transcript. The four-second value is a proposal, not a measured optimum or a model requirement.

The result type includes token timestamps/durations, but the current worker drops them. Preserve those plus the audio segment's host timeline offset; a rolling 15 seconds means speech captured during `[now-15s, now]`, not whatever finished inference recently. Keep player identity separate rather than mixing everyone's PCM before ASR. Queue fairly across players and bound backlog; the current global rejection behavior needs to become scheduling. Timestamp output quality and multi-player CPU throughput still require local measurement. [Installed-compatible result types](https://github.com/k2-fsa/sherpa-onnx/blob/v1.13.2/scripts/node-addon-api/lib/types.js).

## Native capture references retained for comparison

The following Godot/Apple findings describe alternative platform APIs. They are research references, not a second selected capture implementation alongside Steam Voice.

Godot's path is `AudioStreamPlayer` using `AudioStreamMicrophone`, routed to a dedicated bus containing `AudioEffectCapture`. Enable `audio/driver/enable_input` before microphone playback. C# uses `ProjectSettings.SetSetting(...)`, `AudioServer.GetInputDeviceList()`, and `AudioServer.InputDevice` for the selector. The setting affects the running application; no project file rewrite is necessary to express it. Actual activation remains a platform check. [Microphone resource](https://docs.godotengine.org/en/4.5/classes/class_audiostreammicrophone.html), [AudioServer](https://docs.godotengine.org/en/4.5/classes/class_audioserver.html).

`AudioEffectCapture` gives stereo float PCM in a ring buffer. Set `BufferLength` before initialization; its default is only 0.1 seconds. Drain it frequently with `GetFramesAvailable()`/`GetBuffer()`, and monitor `GetDiscardedFrames()` for overflow. Consume into a bounded queue; do not run ASR or wait on network inside the frame callback. Suppress local monitoring on the dedicated bus to avoid playing the user's microphone through speakers. [Capture API](https://docs.godotengine.org/en/4.5/classes/class_audioeffectcapture.html).

Use **`AudioServer.GetMixRate()`** for captured bus frames. Godot's microphone playback obtains the device's input rate and resamples to the engine mix rate before bus effects. `GetInputMixRate()` can differ and would mislabel the captured frames. Downmix `(left+right)/2`, then use a stateful resampler with filtering to reach mono 16 kHz; preserve filter/phase state across packets. Do not change the game's global audio mix rate just for ASR. [Resampling implementation](https://github.com/godotengine/godot/blob/4.5/servers/audio/audio_stream.cpp), [mix-rate settings](https://github.com/godotengine/godot/blob/4.5/doc/classes/ProjectSettings.xml).

Windows WASAPI and Linux PulseAudio initialize capture in `input_start()`, supporting the intended activation after the game has started. Godot's ALSA driver has no input overrides, so Linux support must report the actual active driver rather than assume all drivers capture. [WASAPI](https://github.com/godotengine/godot/blob/4.5/drivers/wasapi/audio_driver_wasapi.cpp), [PulseAudio](https://github.com/godotengine/godot/blob/4.5/drivers/pulseaudio/audio_driver_pulseaudio.cpp), [ALSA interface](https://github.com/godotengine/godot/blob/4.5/drivers/alsa/audio_driver_alsa.h).

Windows also needs OS microphone access enabled for desktop apps; blocked access may produce silence. Show that condition separately from “no speech.” Device removal or selection changes should clear/resynchronize that player's audio timeline and restart capture cleanly. [Microsoft microphone permissions](https://support.microsoft.com/en-us/windows/privacy/turn-on-app-permissions-for-your-microphone-in-windows), [Godot input setting](https://github.com/godotengine/godot/blob/4.5/doc/classes/ProjectSettings.xml).

### macOS native capture constraints

The installed STS2 bundle was inspected during the main investigation: it has neither `NSMicrophoneUsageDescription` nor `com.apple.security.device.audio-input`. Apple requires the purpose string and the appropriate entitlement before microphone access, together with the user's per-app authorization. A mod DLL cannot provide the game's missing bundle metadata or signature entitlement. [Apple authorization requirements](https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media), [purpose string](https://developer.apple.com/documentation/bundleresources/information-property-list/nsmicrophoneusagedescription), [audio-input entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.device.audio-input).

If direct native microphone capture is revisited, a separately identified and signed capture `.app` would need those entries and its own permission request. `NSWorkspace.openApplication`/LaunchServices can launch that app without editing the Steam installation. Correct TCC attribution remains a signed-build verification requirement. No helper has been selected or created; the Steam SDK candidate is evaluated first. [App launch API](https://developer.apple.com/documentation/appkit/nsworkspace/openapplication(at:configuration:completionhandler:)).

For that native API route, `.audio` authorization and an `AVAudioEngine.inputNode` tap provide capture. `AVAudioConverter.convert(to:error:withInputFrom:)` supports sample-rate conversion; the simpler `convert(to:from:)` explicitly does not. A tap's buffer size is a request, not a guarantee, and callbacks may arrive off the main thread. [Audio tap](https://developer.apple.com/documentation/avfaudio/avaudionode/installtap(onbus:buffersize:format:block:)), [converter](https://developer.apple.com/documentation/avfaudio/avaudioconverter).

Godot's CoreAudio backend also initializes input conditionally at driver startup, unlike WASAPI/PulseAudio, so toggling `enable_input` after startup does not establish a working native microphone path. These findings concern native game-process capture and must not be used to claim that Steam's separate Voice API cannot work. [CoreAudio initialization](https://github.com/godotengine/godot/blob/4.5/drivers/coreaudio/audio_driver_coreaudio.mm).

## Remaining implementation checks

The next bounded checks are Steam Voice activation and permission behavior in-game; compressed peer-to-host transport and PCM decoding; continuous per-player buffering without dropped frames; Parakeet timestamp overlap reconciliation and host throughput; then German/English Jev/LLM decisions against recorded *consented* examples. Keep the selected thresholds fixed at 0.95/0.90 while measuring their observed precision. No new model, language restriction, or alternative provider is implied by this research.
