# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, shadcn with Base UI, TanStack DB collections backed by REST and TanStack Query. Bun/Elysia companion with SQLite. C# mod inside Slay the Spire 2.

## Users

Firat is building and playing a Slay the Spire 2 mod. The dashboard is open beside the game to inspect card changes, speech input and generation failures.

## Product Purpose

Turn speech and external chat context into useful, surprising cards when an eligible card is drawn. Let the player tune the director and see why a change happened.

## Operating Context

The host runs the app locally beside the game. Voice Director downloads and manages Parakeet automatically, reusing a verified local copy when available. Friends install the mod files and receive generated cards through the game connection. The current host installer targets macOS.

## Capabilities and Constraints

The dashboard shows live game state, card definitions, generation jobs, speech transcripts, decisions, settings and a command console. Game operations remain subject to the current phase and card rules. Data arrives through REST and updates TanStack DB collections for local joins.

## Brand Commitments

Use shadcn and Base UI. Use Impeccable's design guidance. Write ordinary, direct interface copy. Avoid promotional language, invented compound labels, canned conclusions and contrastive framing. Controls name actions and errors explain recovery.

## Evidence on Hand

The repository contains API research and reference mods. Runtime validation has exercised local Parakeet transcription, Codex card generation, transformation on actual draws, reward choices, card play, artwork generation from original card references, and save restoration in the installed game. The interface shows connection and generation states; native asynchronous actions report dispatch before their effects appear in game state. See docs/runtime-validation.md for the checked behavior and limits.

## Product Principles

- Make the current run and last decision easy to inspect.
- A request remains pending until the game confirms its result.
- Speech provides context; successful draws create opportunities.
- A wildcard's remaining transformation is visible and persists with its instance.
