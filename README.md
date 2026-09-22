# Slay the Spire Voice

A Slay the Spire 2 mod that turns speech and chat into cards. A C# mod runs inside the game; a Bun companion handles Codex generation, local Parakeet transcription, SQLite, and the React dashboard.

The mod is running on macOS ARM64 against Slay the Spire 2 v0.107.1. [Current behavior](docs/current-behavior.md) describes the implementation. [Runtime validation](docs/runtime-validation.md) records what has been played and checked.

## Run locally

Install Bun, Nix, the game through Steam, and Codex with an existing sign in. The local Parakeet path defaults to the Oh My Pi model cache; adjust it in Settings if needed.

```sh
bun install
bun run contracts
bun run check
bun run mod:install
```

Save and close the game before installation. Open it through Steam and load Voice Director. The mod starts the companion automatically. `bun run cli open` opens the authenticated dashboard. For web development, `bun run web` serves it on port 5173.

The game API uses port 57542; the companion and packaged dashboard use 57543. The dashboard links to the generated OpenAPI reference. `bun run cli list` lists API operations; `bun run mcp` exposes them to MCP clients. Local data and the authentication token live under `~/.local/share/slay-the-spire-voice`.

## Card generation

Every new card aims above the strongest native card of its rarity. Basic, Common, and Uncommon cards cannot carry drawback effects. Rares may have a drawback only with an exceptional payoff that changes how you play. Generation uses the installed game's card catalogue, executable rules validation, and a separate model review. Failed designs are revised before becoming candidates.

Artwork begins on first play. The mod builds a sprite sheet from original portraits in the source card's pool and supplies it as an image reference to Codex image generation. Original art, reference sheets, generated cards, and game saves remain local and are not included in this repository.

## Research

The [first pitch](PITCH.md) and early design notes record the investigation. The current behavior document takes precedence over their earlier tuning proposals.

- [Reference mods and where to read their code](references/README.md)
- [Runtime card registration and lazy first-play artwork](docs/runtime-cards-and-art.md)
- [Gameplay precedents and inspected video segments](docs/gameplay-research.md)
- [OpenCode, optional Codex CLI, Jev, SQLite, and the integration API](docs/ai-director-research.md)
- [Local Parakeet and embedded OpenCode v2](docs/voice-and-opencode.md)
- [Modding APIs and runtime card generation](docs/modding-api.md)
- [Networking examples and a proposed first experiment](docs/networking-and-prototype.md)

## Reference source

Upstream projects live under `references/` as Git submodules. Their code, history, and licensing stay associated with their original authors. These are research examples, not automatically installed or executed dependencies.

```sh
git clone --recurse-submodules https://github.com/firatoezcan/slay-the-spire-voice.git
```

For an existing checkout:

```sh
git submodule update --init --recursive
```

The implementation target is **Slay the Spire 2**, using C# and Godot. Slay the Spire 1 Java/BaseMod examples do not apply to this project.
