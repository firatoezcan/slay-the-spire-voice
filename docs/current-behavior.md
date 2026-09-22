# Current behavior

22 September 2026. This document supersedes the tuning proposals in the initial pitch and game mode research.

## Cards

Wildcard marks exactly one native card reward option. Taking it opens Keep, Transform, and I'm feeling lucky. The acquired instance owns one transformation; keeping it leaves that allowance available for a later eligible draw. Rarity and upgrades carry into the replacement. Living Deck allows eligible ordinary cards to transform on an actual draw. A prepared candidate occupies the same draw slot. The native draw count, hand capacity, and draw prevention still apply. A card can transform once per turn, with an additional global turn cap and optional cooldown. Protected cards and unsupported permanent modifications are excluded.

Speech and external inspiration affect designs. The companion prepares candidates before they are needed; the draw path never waits for a model. The local API accepts microphone transcripts, manual ideas, chat, and TTS context.

## Quality policy

The user's revised floor is a card stronger than the best existing card of its rarity, including ordinary transformations. The best native card is the 10/10 reference; generated designs aim above it, up to 12/10. Strength controls additional power above that floor. Synergy controls how closely the design follows the deck's current plan.

Basic, Common, and Uncommon candidates reject self damage, self debuffs, enemy buffs, forced discard/exhaust, Exhaust, and Ethereal. A condition can add a bonus, but a card must have an unconditional benefit. Normal energy costs still undergo review for overpricing. Rares may have drawbacks only with a substantial payoff that changes play. Lucky adds a surprising direction while preserving the same floor and rarity.

The game exports its native card catalogue with names, rarity, cost, descriptions, and actual upgraded descriptions. A design is checked against executable bounds, then reviewed by a separate Codex call against native cards of the same rarity. The review names its strongest benchmark and explains the comparison. Rejected designs receive up to three attempts. The companion records each review in SQLite. These are model judgments, not measured player ratings or a mathematical proof that one card dominates every matchup.

The game independently validates new candidates and rechecks saved candidates before applying them. Existing card definitions remain immutable so previously saved runs can load.

## Artwork

First play queues one artwork job for the generated definition. The mod decodes the original card atlas and assembles all available portraits from the source card's pool into a PNG reference sheet. The companion records source model IDs and attaches the actual sheet to Codex through its image input. The art request instructs image generation to use the sheet as a style reference and return one new illustration. Portraits update in place when the image arrives and are saved locally.

## Dashboard and API

React uses shadcn components with Base UI and the existing Impeccable visual system. REST responses populate TanStack DB Query Collections. The current snapshot comes directly from the game API. Run histories use stable collections keyed by run. Protection and director settings use optimistic transactions that wait for authoritative read-back; errors roll back. Status feedback is outside document flow.

Console commands expose typed argument metadata. Forms use named fields, numeric inputs, searchable native IDs, and current hand cards or creature names. The API receives an argument array. Available game choices use semantic action labels and the active screen's controls. Empty potion slots and unnamed internal controls are omitted.

The game and companion generate OpenAPI from their C# and TypeBox contracts. CLI and MCP operations use that schema. Both servers bind to loopback and require a local token; browser requests go through the companion's restricted origin and session handling. Debug commands require the explicit console setting.

## Execution boundaries

The current provider launches Codex exec in a worker using Bun.spawnSync. Cards and reviews use JSON schemas; artwork uses image generation. Parakeet runs locally in its own process using the installed Oh My Pi model. OpenCode and classifier routing remain research directions.

Card preparation, artwork, configuration, and console tasks expose completion or failure. Normal gameplay requests currently report dispatch; callers must observe game state for their actual effects. See runtime-validation.md for remaining qualification work.
