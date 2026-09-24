# Host setup

The host runs Codex and local Parakeet. Friends install the mod folder. Card definitions, portraits, and mod settings use the existing game connection.

This build targets Slay the Spire 2 v0.107.1. Use the same game version and Voice Director version on every computer. This release is checked locally with contract checks and simulated receiving peers; a live session with separate game clients was unavailable. Local Steam microphone capture and Parakeet transcription have been verified in a run.

## Install on the host Mac

1. Install the game through Steam, Bun, Nix, and Codex CLI. Sign into Codex.
2. Clone this repository, then run `bun install` in its folder.
3. Save and quit the game. Run `bun run mod:install`.
4. Open the game through Steam and enable Voice Director in the mod loader.
5. Run `bun run cli open` to open the dashboard. Start a singleplayer run or host a multiplayer run.

The installer records the local Bun and Codex locations and sets the game to start the companion. The dashboard is available between runs. Queued work starts only for a hosted run; a joining client does not generate cards.

The default speech model folder is the existing Oh My Pi cache at `~/.omp/agent/cache/tiny-models/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`. Change the folder in dashboard settings if it is elsewhere.

## Give friends the mod

Send friends the [0.5.0 player ZIP](https://github.com/firatoezcan/slay-the-spire-voice/releases/download/v0.5.0/VoiceDirector-0.5.0.zip) and the [player instructions](player-install.md). To build it locally, run `bun run mod:package`; the archive is written to `dist/VoiceDirector-0.5.0.zip`. It contains the mod and its managed dependencies. Your sign-in, token, transcripts, generated artwork, saves, and speech model are stored separately.

Friends only extract that archive into the game's mod directory. They need no repository checkout, terminal commands, Bun, Codex, Nix, separate .NET installation, speech model, or AI account. The game loads the included DLLs. The host installer creates the local companion launcher; that launcher is excluded from the player archive.

Create the multiplayer lobby in Steam as usual and invite your friends. Changes to the mod's mode, turn limits, strength, synergy, and other run settings are sent to the party. A reconnecting player receives the current settings and requests any missing card assets.

The dashboard and game API bind to this computer's loopback interface. Friends do not need your API token, a dashboard URL, or an open router port.

## Enable ambient speech

Living Deck is the default mode. A prepared replacement applies on its next eligible draw, within the configured turn limits and cooldown. The original card remains playable while generation is pending. Open **Prompts** in the dashboard to edit Luna classification and Astra's decision, shared quality, design, review, and artwork instructions. Save each editor separately; it applies on the next invocation, and Use default restores the shipped text for saving.

Each player can enable **Use my microphone for Voice Director** in the game's Sound settings. The host can also change their own microphone setting on the dashboard's Voice page. Capture starts during a run and stops when the run ends or the switch is turned off.

Steam captures compressed microphone audio and sends it through the party's game connection. The host transcribes it with local Parakeet. `gpt-6-luna` at `xhigh` classifies the latest 15 seconds with up to two minutes of conversation. A Yes probability of at least 95% proceeds to `gpt-6-astra`, which must reach 90% before choosing and designing a card. Astra handles all writing, review, and art direction. Accepted moments have a 45 second cooldown. The host's **Generate cards from conversation** setting controls automatic generation; manual card requests remain available.

These probabilities are model estimates. Transcript text is sent to Codex; raw audio is processed on the host. The dashboard places each decision beside its transcript, with the Yes/No probabilities and any skipped noise or accidental audio.

## Update

Everyone should save and quit before replacing mod files. Re-run the host installer, rebuild the player archive, and have friends replace their `VoiceDirector` folder. Open the game through Steam afterward.
