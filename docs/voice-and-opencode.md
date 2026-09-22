# Local voice and OpenCode runtime research

Checked 22 September 2026 against upstream documentation, published package metadata, and source. This is a design recommendation, not a working integration: no microphone recording, model inference, paid request, dependency installation, or packaging benchmark was performed.

## Recommendation

Use a Bun companion for the dashboard, integration API, jobs, and SQLite. Keep transcription in a persistent local speech worker. Start with push-to-talk or voice-activity detection that submits a completed utterance. Embed **OpenCode v2's SDK as the main agent runtime**, following the user's experience and preference. Codex CLI subprocess jobs are an optional artwork backend; Codex app-server is excluded from the proposed runtime. Give card design and image generation separate jobs so an image never blocks a valid card from entering play.

OpenCode can run inside that Bun process. Native speech models and their inference libraries still need platform-specific packaging. Plan an installable application bundle with a separate model download; a single portable file containing every dependency is not established by this research.

## OpenCode v2: the exact contracts

The current published SDK is `@opencode/sdk@2.0.12`. Its package metadata pins the other OpenCode runtime packages to `2.0.12`. The embedded entrypoint is `OpenCode.create()`. It executes the server router in memory without opening an HTTP listener. It provides `sessions`, `events`, explicit `close()`, and async disposal. [SDK documentation](https://opencode.ai/v2/docs/build/sdk/), [published package](https://registry.npmjs.org/@opencode/sdk/2.0.12).

Illustrative API shape, not executed:

```ts
import { OpenCode } from "@opencode/sdk";

await using runtime = await OpenCode.create({
  database: { path: "/application-data/opencode.db" },
});
const session = await runtime.sessions.create({
  location: { directory: "/application-data/agent-workspace" },
});
await runtime.sessions.prompt({
  sessionID: session.id,
  text: "Produce a card proposal using the supplied game rules.",
});
```

The SDK defaults to an in-memory database; `database.path` makes sessions persistent. Its README describes host lifetime and session recovery. Give OpenCode its own database and keep game state in the companion's database, rather than depending on OpenCode's internal tables. [SDK source documentation](https://github.com/anomalyco/opencode/blob/beta/packages/sdk/README.md).

The separate network contract is `@opencode/client`: `OpenCode.make({ baseUrl, headers })`, then `client.session.create()` and `client.session.prompt()`. `@opencode/client/service` provides `Service.discover()`, `Service.ensure()`, and authentication headers for a local background service. Event subscriptions have no replay or automatic reconnection; persist application jobs and reconnect explicitly if choosing this route. [Client documentation](https://opencode.ai/v2/docs/build/client/).

For this project, embedding is a reasonable first OpenCode implementation because the companion already owns process lifetime. A separate OpenCode service is also supported, but should be an explicit deployment choice. Neither contract requires launching a fresh shell command for every utterance.

## Can Bun actually ship it?

**Yes, upstream demonstrates compiled Bun distribution; no, an unmodified SDK import has not been proven to compile into our executable.**

OpenCode's CLI build uses `Bun.build({ compile: ... })` for macOS ARM64/x64 and Windows ARM64/x64, with baseline variants where applicable. It also includes custom build plugins that select a platform-specific Parcel watcher and embed the persistent PTY helper, plus native-library build definitions. This is meaningful evidence of feasibility and of the extra packaging work. [Upstream CLI build](https://github.com/anomalyco/opencode/blob/beta/packages/cli/script/build.ts).

The SDK transitively includes `@opencode/core`, whose published dependencies contain `bun-pty`, `@parcel/watcher`, native FFF libraries, tree-sitter components, an image-processing dependency, and PTY packages. Those are not equivalent to ordinary portable JavaScript. [Core package metadata](https://registry.npmjs.org/@opencode/core/2.0.12). Bun supports bundled N-API addons, but dynamically located addons require explicit bundling. Bun also supports compiling the web dashboard assets and SQLite access. [Bun executable documentation](https://bun.sh/docs/bundler/executables).

Proposed shipping layout:

| Component | Distribution |
| --- | --- |
| Dashboard, local API, jobs, SQLite | One Bun executable per OS/architecture, frontend embedded |
| Embedded OpenCode v2 | Same process; package native assets using an explicit per-platform build |
| Local speech runtime | Native worker plus required libraries, or a packaged Python/MLX worker for a Mac prototype |
| Speech weights | Separate versioned download/cache |
| Generated art and persistent databases | Writable application-data directory |

The packaging check should start the compiled SDK, create a session, open and reopen its database, and shut down cleanly on both macOS and Windows without making a model request. Native assets, extraction paths, signing, and runtime resource usage remain unverified here. OpenCode's own standalone binaries are available for both platforms; its current v2 docs do not support Windows package-manager installation. [Supported distributions](https://opencode.ai/v2/docs/).

## Provider accounts and images

OpenCode v2 supports API keys, OAuth, provider authentication commands, and environment credentials. Its current docs explicitly show an OpenAI “ChatGPT Pro/Plus (headless)” method. Saved accounts and tokens live in the server's SQLite database. This documents an OpenCode integration; it does not establish a general third-party ChatGPT sign-in entitlement for our product. [Account documentation](https://opencode.ai/v2/docs/cli/providers).

Provider flexibility is substantial: native adapters cover major hosted providers, custom OpenAI-compatible endpoints are configurable, and Ollama, LM Studio, and vLLM have local discovery. Provider-specific capabilities still need checking for the selected account and model. [Provider documentation](https://opencode.ai/v2/docs/providers/).

Do not promise that every connected model generates images. The documented built-in tools do not provide a universal image-generation command, while plugin/MCP tools can extend the catalog. There is also a Copilot-specific image-generation schema in current source, which is evidence of provider-specific handling, not proof of a universal image API. [Tools](https://opencode.ai/v2/docs/tools/), [Copilot image schema](https://github.com/anomalyco/opencode/blob/beta/packages/core/src/github-copilot/responses/tool/image-generation.ts).

For the optional Codex CLI artwork backend, the investigation checked local Codex CLI 0.155.1 and received `imageGeneration: true` from a read-only provider-capability probe; its generated protocol includes image results and saved paths. No image was generated, so the complete `codex exec` artifact-return path still needs verification. Keep `generateCard` and `generateArtwork` as separate application capabilities. OpenCode can call an explicit artwork tool that delegates to the chosen provider or CLI worker without changing the game's card contract.

## Parakeet: model and runtime choices

Select **`nvidia/parakeet-tdt-0.6b-v3`** for German and English. It supports 25 European languages with automatic language detection, punctuation, and timestamps. Version v2 is English-only. The v3 input contract is mono 16 kHz audio. [NVIDIA model card](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3).

| Runtime | Verified capability | Practical assessment |
| --- | --- | --- |
| NVIDIA NeMo-Speech.cpp | Official C++ local runtime; Parakeet v3 GGUF support; HTTP transcription; macOS Metal and Windows/CPU/GPU packaging paths | Most promising distribution candidate for completed utterances; verify actual selected release on target machines |
| `parakeet-mlx` | Apple Silicon implementation; Python API; v3 default; `transcribe_stream` with draft/finalized tokens | Fast path for Mac experimentation; requires Python/MLX and a bundled worker strategy |
| sherpa-onnx | Published v3 int8 ONNX conversion; CPU and NVIDIA examples; native Node bindings distributed for Windows x64 and macOS ARM64/x64 | Strong cross-platform alternative; verify Bun binding/loading compatibility and latency |

Sources: [NVIDIA runtime](https://github.com/NVIDIA/NeMo-Speech.cpp), [native installation](https://github.com/NVIDIA/NeMo-Speech.cpp/blob/main/docs/install.md), [Parakeet MLX](https://github.com/senstella/parakeet-mlx), [sherpa model documentation](https://k2-fsa.github.io/sherpa/onnx/pretrained_models/offline-transducer/nemo-transducer-models.html), [published native Node package](https://registry.npmjs.org/sherpa-onnx-node/1.13.8).

The distinction between “streaming audio” and a streaming model matters. NVIDIA's runtime explicitly classifies Parakeet TDT v3 as offline, with full-utterance inference, and rejects streaming requests for it. Its general realtime endpoint does not make Parakeet streaming. [NVIDIA model support](https://github.com/NVIDIA/NeMo-Speech.cpp/blob/main/docs/asr/models.md). The MLX adapter implements incremental transcription using attention windows and draft/finalized tokens; its documented default only preserves exact computation in the first encoder layer. Treat that as an implementation tradeoff to evaluate, not a guaranteed equivalent to full-utterance decoding. [MLX streaming documentation](https://github.com/senstella/parakeet-mlx#streaming-transcription).

Current download sizes are approximately 714 MB for NVIDIA's Q8 GGUF, 670 MB for the sherpa int8 encoder/decoder/joiner, and 2.51 GB for the default MLX model weights. These are storage sizes, not measured RAM requirements. Native libraries, tensor conversion, activations, audio buffers, and simultaneous game rendering add overhead. [Official model files](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3/tree/main), [sherpa files](https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/tree/main), [MLX files](https://huggingface.co/mlx-community/parakeet-tdt-0.6b-v3/tree/main).

The Mac Python implementation currently declares Python 3.10+, MLX, NumPy, librosa, and Hugging Face Hub; its CLI also requires ffmpeg. The native sherpa examples document shared-library paths in addition to the Node addon. Neither is automatically absorbed into a Bun executable. [MLX package](https://github.com/senstella/parakeet-mlx/blob/master/pyproject.toml), [MLX README](https://github.com/senstella/parakeet-mlx), [sherpa native examples](https://github.com/k2-fsa/sherpa-onnx/blob/master/nodejs-addon-examples/README.md).

## Audio path and latency

Proposed first flow: dashboard microphone selection → push-to-talk or VAD → mono PCM at 16 kHz → persistent local Parakeet worker → final transcript event → card-design job. The native NVIDIA worker can load a model once and serve completed WAV uploads through `POST /v1/audio/transcriptions`; use that offline route with Parakeet. [Local server contract](https://github.com/NVIDIA/NeMo-Speech.cpp/blob/main/docs/server.md).

A browser dashboard can request the microphone through `getUserMedia()` on localhost and process frames through `AudioWorklet`. Capture needs explicit browser/OS permission, and the page must remain alive. A browser hotkey also does not establish a system-wide push-to-talk key while the game has focus; that later needs a native shortcut/capture path or a game-to-companion trigger. [Microphone API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet).

Use a small in-memory audio buffer and keep raw recordings transient by default. Store accepted transcripts, source labels, card proposals, job states, and art paths in SQLite. Twitch integrations should submit the original text when available, rather than re-transcribing their synthesized voice; audio-only sources can use an explicit input device or upload route. These are product choices, not framework requirements.

Perceived delay includes speech endpoint detection, ASR, classifier/LLM routing, proposal generation, validation, and the next game-safe insertion point. Batch throughput figures cannot predict that delay. Keep the ASR model and selected agent runtime warm, cap utterance length, cancel obsolete work, and show the transcript promptly. Measure short German/English phrases while the game is running before setting a latency promise. No local RAM, startup, first-token, or transcription latency was measured in this research.

## Distribution terms and remaining checks

OpenCode's published SDK is MIT. Parakeet v3 weights use CC BY 4.0, which permits redistribution and adaptation with attribution, a license link, and notice of changes. Parakeet MLX, sherpa-onnx's package, and NeMo-Speech.cpp identify Apache-2.0 licensing. Include the relevant notices for the selected runtime, conversions, and native dependencies; a top-level package license does not replace their notices. [SDK metadata](https://registry.npmjs.org/@opencode/sdk/2.0.12), [NVIDIA model license](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3), [CC BY terms](https://creativecommons.org/licenses/by/4.0/), [MLX license](https://github.com/senstella/parakeet-mlx/blob/master/LICENSE), [sherpa package](https://registry.npmjs.org/sherpa-onnx-node/1.13.8), [NVIDIA runtime](https://github.com/NVIDIA/NeMo-Speech.cpp).

Before choosing the release package: compare the native NVIDIA worker and sherpa on short German/English utterances, measure game frame-time contention, and compile a minimal persistent OpenCode host for macOS and Windows. These are bounded feasibility checks still to do, not evidence already obtained.
