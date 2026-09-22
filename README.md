# Slay the Spire Voice

A Slay the Spire 2 mod idea: the game listens to what you say and generates playable cards during the run.

This repository starts with source research and local copies of reference mods. There is no playable voice mod yet.

## Research

- [Reference mods and where to read their code](references/README.md)
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
