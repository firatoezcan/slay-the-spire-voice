# Current behavior

24 September 2026. This document describes the current source. The runtime validation document distinguishes installed checks from work awaiting a multiplayer playthrough.

## Cards

Wildcard marks exactly one native card reward option. Taking it opens Keep, Transform, and I'm feeling lucky. The acquired instance owns one transformation; keeping it leaves that allowance available for a later eligible draw. Rarity and upgrades carry into the replacement. Living Deck is the default. It allows eligible ordinary cards to transform on an actual draw. A prepared candidate always replaces its target on the next eligible draw; there is no second probability roll. It occupies the same draw slot. The native draw count, hand capacity, and draw prevention still apply. A card can transform once per turn, with an additional global turn cap and optional cooldown. Cards with unsupported permanent modifications cannot transform. There is no card protection feature. An unresolved wildcard keeps its original playable rules until its replacement is ready.

Speech and external inspiration affect designs. The host prepares candidates before they are needed; the draw path never waits for a model. The local API accepts microphone transcripts, manual ideas, chat, and TTS context.

## Multiplayer

Everyone installs the same mod version. Only the host installs the companion, Codex, and Parakeet. Generated definitions and artwork travel over the native game connection. A fixed generated-card entry in the native model table carries inline definitions so different local caches do not change model IDs or packet widths. Saves include the generated definition alongside card lineage.

The host picks a prepared replacement. The card owner relays that decision through the game's native choice synchronizer, and all peers transform the card within the same draw or reward flow. Wildcard prompts appear on their owner's screen. Host settings broadcast on change and accompany join/reconnect manifests; each player's microphone setting stays local.

## Ambient voice

Each player can enable their microphone in Sound settings. Steam Voice capture runs during a started run, and clients send compressed audio to the host. The host decodes it to mono PCM and transcribes short segments with the existing Parakeet model. Speech, chat, TTS, and dashboard input share a rolling two-minute conversation, with the latest 15 seconds marked as the focus. Inputs classified as noise or accidental capture remain visible in the transcript and are excluded from later context.

`gpt-6-luna` at `xhigh` only classifies. Its JSON contains Jev-style Noul probabilities for creating a card and each input's noise/accidental status. There is no generated meaning, summary, theme, target, or explanation. It sees original conversation and current game facts, with no previous decisions or scores. A Yes probability of at least 0.95 passes the kept words to `gpt-6-astra`, which independently judges the moment and selects an eligible target. Astra must reach 0.90 before generation; it also owns design, wording, review, and art direction. Code enforces a 45-second cooldown. These are model estimates, not calibrated probabilities. See [Jev classification research](jev-classification-research.md).

Automatic generation responds to situational humour, callbacks, reactions, and shared banter. A direct request for powerful effects does not establish a trigger. The card must be useful and fun for both player and audience. The frozen original conversation becomes the design input. Each probability and application outcome is linked to the evaluated transcript in the dashboard, with the focused input and earlier context available to expand. Manual generation and reward buttons remain available. The companion stays available between runs, and starts queued jobs only for the current hosted run. The user declined additional process cancellation on run exit; an already running request may finish after the game closes.

## Quality policy

The user's revised floor is a card stronger than the best existing card of its rarity, including ordinary transformations. The best native card is the 10/10 reference; generated designs aim above it, up to 12/10. Strength controls additional power above that floor. Synergy controls how closely the design follows the deck's current plan.

Basic, Common, and Uncommon candidates reject self damage, self debuffs, enemy buffs, forced discard/exhaust, Exhaust, and Ethereal. A condition can add a bonus, but a card must have an unconditional benefit. Normal energy costs still undergo review for overpricing. Rares may have drawbacks only with a substantial payoff that changes play. Lucky adds a surprising direction while preserving the same floor and rarity.

The game exports its native card catalogue with names, rarity, cost, descriptions, and actual upgraded descriptions. A design is checked against executable bounds, then reviewed by a separate Codex call against native cards of the same rarity. The review names its strongest benchmark and explains the comparison. Rejected designs receive up to three attempts. The companion records each review in SQLite. These are model judgments, not measured player ratings or a mathematical proof that one card dominates every matchup.

The game independently validates new candidates and rechecks saved candidates before applying them. Existing card definitions remain immutable so previously saved runs can load.

## Artwork

First play queues one artwork job for the generated definition. The mod decodes the original card atlas and assembles all available portraits from the source card's pool into a PNG reference sheet. The companion records source model IDs and attaches the actual sheet to Codex through its image input. The art request instructs image generation to use the sheet as a style reference and return one new illustration. Portraits update in place when the image arrives and are saved locally.

## Dashboard and API

React uses shadcn components with Base UI and the existing Impeccable visual system. REST responses populate TanStack DB Query Collections. The current snapshot comes directly from the game API. Run histories use stable collections keyed by run. Director settings use optimistic transactions that wait for authoritative read-back; errors roll back. Status feedback is outside document flow.

The Prompts page exposes Luna classification, Astra confirmation, shared quality, design, review, and artwork instructions. Edits persist individually in SQLite and apply to the next invocation. Each editor supports defaults and discard. Required JSON shapes and game legality are appended by code. See [prompt editing](dashboard-prompts.md).

Console commands expose typed argument metadata. Forms use named fields, numeric inputs, searchable native IDs, and current hand cards or creature names. The API receives an argument array. Available game choices use semantic action labels and the active screen's controls. Empty potion slots and unnamed internal controls are omitted.

The game and companion generate OpenAPI from their C# and TypeBox contracts. CLI and MCP operations use that schema. Both servers bind to loopback and require a local token; browser requests go through the companion's restricted origin and session handling. Debug commands require the explicit console setting.

## Execution boundaries

The current provider launches Codex exec in a worker using Bun.spawnSync. Classification, card design, and review requests use custom base prompts with tools and discovery disabled. Cards and reviews use JSON schemas; artwork uses image generation. Parakeet runs locally in its own process. The companion automatically prepares a verified copy in its own data folder, downloading missing files and reusing matching local files. The dashboard shows progress and retry; no model folder needs configuration. See [automatic speech setup](speech-setup.md). OpenCode remains a possible later provider.

Card preparation, artwork, configuration, and console tasks expose completion or failure. Normal gameplay requests currently report dispatch; callers must observe game state for their actual effects. See runtime-validation.md for remaining qualification work.
