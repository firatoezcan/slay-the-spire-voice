# Slay the Spire Voice

A Slay the Spire 2 mod idea: the game listens to what you say, turns memorable moments into playable cards, and lets Twitch or other integrations influence the run through a local API.

This repository contains the first pitch, source research, and local copies of reference mods. There is no playable voice mod yet.

Start with **[The Spire Is Listening — first pitch](PITCH.md)**.

The two gameplay modes are **Wildcard** (one same-rarity replacement in every card reward) and **Living Deck** (autonomous, tunable replacements of existing deck cards). See [the mode rules](docs/game-modes.md).

Taken wildcards have one optional transformation during the reward interaction, including a deck-aware **I'm feeling lucky** option. A card can transform at most once per turn, and transformed deck cards are guaranteed to be drawn next turn.

## Research

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
