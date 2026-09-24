# Join a Voice Director game

Download [VoiceDirector-0.5.0.zip](https://github.com/firatoezcan/slay-the-spire-voice/releases/download/v0.5.0/VoiceDirector-0.5.0.zip), or use the same archive from your host. Use the same Slay the Spire 2 version as the host; this build targets v0.107.1.

You only install the mod files. Everything needed by the mod is either in the ZIP or already supplied by the game. Bun, Codex, Nix, a separate .NET installation, model downloads, and AI accounts are host concerns.

This release has local checks for delivery contracts and simulated receiving peers. A live session with separate game clients was unavailable. Local microphone capture and transcription have been checked.

1. Save and quit Slay the Spire 2.
2. Extract the archive. It contains a folder named `VoiceDirector`.
3. In Steam, open the game's Properties, then Installed Files, then Browse.
4. Put `VoiceDirector` in the game's `mods` folder. Create `mods` if needed.
   - Windows and Linux: put `mods` beside the game executable.
   - macOS: show the contents of `SlayTheSpire2.app`, open `Contents/MacOS`, and put `mods` there.
5. Open the game through Steam and load the mod.
6. Join your host's multiplayer lobby through Steam.

The folder layout ends with `mods/VoiceDirector/VoiceDirector.json` and `mods/VoiceDirector/VoiceDirector.dll`. Keep the other DLLs from the archive beside them.

The host handles AI generation and transcription. Your computer does not need Bun, Codex, a model download, an AI account, or the web dashboard. Generated descriptions and artwork arrive through the game connection. The host's mod settings apply while you are in their run; your own saved settings return when you leave.

To participate in ambient speech, open the game's Sound settings and enable **Use my microphone for Voice Director**. Audio goes to the host for local transcription. Recent conversation is sent to Codex to decide when a useful, funny card fits the situation. Listening runs while you are in a run. Turn the switch off to stop sharing your microphone. Your host cannot enable it for you.

If the game reports different mods, compare the Voice Director version with the host. Everyone must replace the complete mod folder with the same release while the game is closed.
