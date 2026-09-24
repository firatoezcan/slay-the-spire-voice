# Runtime validation

22 September 2026, installed Slay the Spire 2 v0.107.1 on macOS ARM64. Validation uses the previously empty modded profile 3, opened through the user's Desktop Steam shortcut.

## Confirmed in the game

- The mod loads through the native mod loader and exposes its authenticated local API.
- The first Ironclad fight was completed with normal cards. Game controls and the API both advanced the run.
- Exactly one of three card reward options was marked as a wildcard. Taking Tremble opened Keep wildcard, Transform, and I'm feeling lucky.
- A real Codex generation produced Fear into Fury in about 19 seconds. It preserved Common rarity and the original persistent card identity. The deck contained the new model immediately.
- The first play queued artwork. A real image job completed in about 59 seconds and uploaded the PNG to the mod.
- After a complete game restart through Steam, the save restored the generated model, stable identity, consumed wildcard transformation, and artwork.
- Fear into Fury played successfully after the power handling fix: 2 Strength, 2 Vulnerable, Exhaust. Strength increased a Strike to 8 damage.
- A targeted Strike played from the React dashboard killed the 7 HP Twig Slime. The dashboard updated its hand, discard pile, and enemy list.
- Living Deck transformed a prepared Basic Defend into Stubborn Bastion on turn 2. The replacement occupied the same first draw slot, retained its persistent identity, and the normal draw produced five cards.
- With a second prepared candidate and a one change per turn limit, an additional draw kept the second card unchanged.
- Stubborn Bastion granted 4 Block when played. After raising the global turn limit, preparing another candidate for the same instance, shuffling and drawing it again in turn 2, the transformation count remained one.
- A request to draw 20 cards stopped at the native ten card hand limit. Further draw requests while full added no cards and consumed no transformation.

## Confirmed outside combat

- Synthetic speech produced by macOS was decoded by the installed Oh My Pi Parakeet model: “Give me a card about a stubborn knight who turns pain into a shield.” The transcript appeared in the dashboard.
- The dashboard saved director settings and accepted a manual idea through its normal forms.
- Card definitions, game snapshots, and job records reach TanStack DB through authenticated REST. The schema adapter now builds real TypeBox nodes; raw JSON Schema inside Unsafe did not compile in the Elysia response validator.
- The web app builds and TypeScript checks pass. The C# projects build without warnings.
- The packaged JavaScript companion served its dashboard and OpenAPI, and its compiled Codex and Parakeet workers both ran successfully.
- The dashboard finish review's four fixes were scored resolved: a compact inspector at the actual app width, consistent offline controls, text contrast, and accessible selection state. DESIGN.md and its token sidecar describe the shipped interface.

## Revised quality, artwork, and controls

- The revised policy generated Unyielding Aegis from Defend: Basic, cost 0, 18 Block, 2 Weak, Retain. A separate review compared it with the native Basic catalogue. Its first actual draw transformed the prepared Defend in place; playing it produced 18 Block and 2 Weak without consuming energy.
- The game rejects the prior Common Fear into Fury design even when its claimed quality is raised to 12, because Common cards cannot carry drawbacks.
- The native catalogue contains 493 Basic/Common/Uncommon/Rare cards. Upgraded descriptions are produced from an upgraded mutable copy; Anger correctly reads 6 damage before and 8 after upgrade.
- The Ironclad reference sheet contains 85 original portraits. Atlas textures must be decompressed before cropping: AtlasTexture.GetImage alone attempted a compressed blit and returned black tiles. The corrected sheet was inspected visually.
- A real artwork job attached that sheet to Codex and generated Unyielding Aegis artwork in about 73 seconds. The resulting illustration was inspected and loaded into the live card portrait.
- The new console form found Hexed by name. The Power form selected No Draw Power and The Ironclad by name, then executed with amount 1. An additional draw left the hand at five cards and the draw pile at six, confirming native draw prevention.
- Console argument metadata was read for every native command. Affliction/enchantment choices, numeric amounts, hand card positions, creature names, and native completion IDs are available without parsing a command string.
- Available choices now include View draw pile, Inspect Burning Blood, View act boss, Open map, and named card selections. Empty potion slots and generated node names are excluded.
- The protection switch updated the selected card immediately while retaining table element identities. A later poll kept the confirmed protection. Feedback no longer changes document height. The snapshot query now reads the game directly, avoiding the companion tick's stale read after a write.
- Replacing DLL files while a game process retained mapped assemblies caused corrupted metadata and a BadImageFormatException during quit. The installer now requires the game to be closed and installs each assembly through an atomic rename. The saved test run was recovered through Steam.
- After completing the second fight and restarting through Steam, Unyielding Aegis restored its definition, identity, artwork, and protection. The native game rewinds an unfinished combat when loading; persistence checks therefore finish the fight before saving.
- An Anger reward was kept as an unresolved wildcard, then prepared with I'm feeling lucky. On its first actual draw in the third fight, it became Oath of the Unbroken: Common, cost 0, 12 Block, two hits of 8 damage to all enemies, Retain. Playing it applied both benefits. A second generation request for that instance was rejected because its wildcard transformation had been consumed. Its artwork used the original Ironclad reference sheet and was inspected visually.
- A selected Unyielding Aegis stayed selected when an earlier Strike left the hand and its position changed from third to second. Running Upgrade affected Aegis only. Playing Aegis then cleared the selection and disabled Run; submitting its stale handle directly was rejected.
- Blank optional affliction amounts use the displayed default of 1. Native leaderboard, log, and getlogs argument metadata was corrected against their implementations; these external or diagnostic commands were not executed.
- The console extension review scored stable selections, per-control pending state, optional amount handling, duplicate-card labels, and the final status placement fix resolved. Its disposition was ship for those fixes. Captures cover 1440px, 390px, and the user's 781px window. Paired 781px captures show the same field positions before and after a selected card leaves the hand.
- Quitting through the native menu closed both the game and its companion process. The shutdown hook runs before Godot tears down the game.
- The final installed build restarted through the Desktop Steam shortcut and restored Oath of the Unbroken, its consumed wildcard state, and its artwork. Unyielding Aegis also restored. Loading returned to the native room reward state, so its rewards were claimed again. The run was then advanced to the next event and left with normal settings: 5% draw chance, automatic preparation enabled, debug commands disabled, and the temporary protection removed.
- The compiled CLI listed the companion operations. The compiled MCP server exposed 32 tools and completed an authenticated health request against the running game, including confirmation that the existing local Parakeet model is ready.
- The Impeccable documentation check compared the console extension with the existing palette, typography, controls, and surface rules. It preserved DESIGN.md and its token sidecar and found no material system drift in scope.

## Fixes found during play

- Steam's environment did not find Codex. The installer now records the executable path, and the worker includes its directory when launching the CLI.
- A Godot deferred callable inferred a Task return, which Godot cannot convert to Variant. It now uses an explicit Action delegate.
- Power application initially passed a canonical model. It now supplies a mutable instance.
- The generated pool requested a nonexistent colorless frame material. It now uses the native ColorlessCardPool's material name.
- Reward population can occur before its reward set is bound. Wildcard slot selection now waits for that binding.
- Existing prepared jobs now retain an immediate transformation request. Lucky requests supersede ordinary candidates.

## Multiplayer and ambient work, 24 September

- The build with generated-card inline serialization loaded through the Desktop Steam shortcut and restored the saved run, definitions, and artwork. Unyielding Aegis was selected and upgraded through the native UI. This was a singleplayer check.
- Native packet writer/reader checks round-tripped normalized artwork across 28 packets. The production receiver reconstructed reversed chunks, withheld partial artwork, acknowledged an already applied duplicate, and rejected damaged bytes.
- Settings packet checks retained every field. The session manifest included the current settings. Applying host settings changed the client's in-memory values; leaving restored saved local settings. Invalid settings were rejected.
- Actual `gpt-6-luna` xhigh requests with the custom classifier prompt ignored unrelated German speech and accepted an explicit card idea at 0.99; the independent confirmation returned 0.94. The current-game ignore request used 6,665 input tokens and took 5.3 seconds. These are observations from individual requests.
- An isolated companion check with simulated game, transcription, and model responses verified both confidence thresholds, one stored transcript per audio segment, cooldown deduplication, and no audio polling without an active hosted run. It did not capture a microphone or invoke a model.
- C# builds and TypeScript checks pass. The player package is produced by `bun run mod:package`; host and player instructions are separate. The package contains managed mod files and an installation guide, with local credentials and runtime data kept outside it.

The 0.3.0 build loaded through Steam. Real microphone segments reached the existing Parakeet model and appeared with player identity and timestamps. The earlier classifier ignored ordinary captured conversation. The packaged dashboard rendered its no-run state before the run started.

A complete Nibbit fight was played through the authenticated API: event choice, map travel, targeted card plays, turns, gold, and potion rewards. Protection changed on and off through the native action queue. The card reward API exposed a separate input path: ForceClick did not activate card holders. The source now routes those selections through the native controller-select handler and checks the holder's clickable state; its installed verification is pending.

The revised probability-only Luna prompt was exercised with actual requests: ordinary conversation produced 0.01 Yes, a direct demand for one million Strength produced 0.02, recognition noise produced 0 with 0.95 noise probability, and a callback using earlier conversation produced 0.96. Astra independently returned 0.97 and an existing deck target for that callback. No card was generated by these isolated model checks. Window checks excluded text older than two minutes and previously rejected noise; response validation rejected extra prose and incomplete input labels.

The updated companion was restarted while the game stayed open. A manual input sent through the actual API was classified by Luna, persisted with its transcript references, and displayed directly beneath that transcript with 1% Yes and 99% No. Expanding the focus showed the exact input. The dashboard was checked at desktop and phone widths. The user's subsequent shield line also received its own linked evaluation. An isolated coordinator check exercised the Luna threshold, removal of noise before Astra, Astra's target choice, recorded input references, cooldown, low-score rejection, and no polling without a run. These simulated responses did not generate a card.

A complete multiplayer room, independent client caches, reconnect, and shared draw/reward choices remain unverified. Packet checks do not establish those outcomes.

The player ZIP was rebuilt with the current mod DLLs and updated installation guide; archive integrity passed. Its contents are the mod folder, managed DLL dependencies, manifest, and guide. It contains no companion launcher, Bun/Codex executable, credentials, or speech model. The mod starts a companion only when the host installer's local launcher file exists. An isolated execution of the companion's production polling and enqueue functions with client and main-menu snapshots confirmed no model calls or audio polling and rejected generation requests. This establishes those guards, not an independent multiplayer game session.

## Living Deck and prompt editing, 0.5.0

- The installed 0.5.0 build launched through the Desktop Steam shortcut and restored the saved run. Its settings reported Living Deck and omitted the removed draw-chance field. Microphone consent remained off.
- A prepared Basic Defend remained an ordinary playable card until drawn. On turn 2 against Fuzzy Wurm Crawler, Shrug It Off drew that exact instance and immediately transformed it into the existing Unyielding Aegis definition. Both deck and hand reported the same persistent identity and transformation turn. There was no additional chance roll. Playing Aegis applied 18 Block and Weak; together with Shrug It Off, Block reached 26.
- The fight completed through the authenticated game API and ended at 80/80 HP. The deck retained Oath of the Unbroken and Unyielding Aegis. This check reused existing definitions and artwork; it did not invoke generation.
- Earlier 0.4.0 validation completed a Shrinker Beetle fight through the API, including native card reward selection, the shared choice path for ordinary and transformed draws, card play, and subsequent turn draws. Uploading the existing prepared portrait preserved its exact bytes.
- Native assembly checks verified Living Deck as the fresh settings default, removal of DrawChance and Protected, settings serialization, invalid settings rejection, session manifest validation, and host-only settings admission. Previous checks used two independent production asset receivers with native packet serialization, reversed artwork chunks, idempotent receipt, and receiver clearing for reconnect.
- The Prompts page exposes six persisted instruction bodies. Browser operation verified editing, saving, persistence after reload, and restoring the default while the game was closed. Isolated API checks rejected empty, whitespace-only, oversized, and unknown prompts, enforced authorization, and confirmed the generated OpenAPI operations. A mocked Codex boundary confirmed that saved instructions reach the Luna and Astra system prompts, required contracts remain appended, and shared quality reaches both design and review. It did not invoke a real model.
- TypeScript, companion/dashboard builds, C# builds, and whitespace checks passed. The 0.5.0 player archive includes managed mod files and its installation guide, with no companion launcher, credentials, model files, or Bun/Codex executable.
- The independent Impeccable finish review returned SHIP for the prompt editor at desktop, phone, and user window widths. See [prompt editing](dashboard-prompts.md) for its scope.

The user accepted proceeding without a live two-client session. Host/client admission and asset delivery are checked locally; an actual multiplayer room, reconnect during play, and simultaneous remote choices remain unverified.

## API execution boundary

Card plays and other native asynchronous operations report dispatched once the game accepts them. Callers must observe subsequent game state to confirm the effect. Generated client and console metadata checks do not establish that every native command is safe or useful in every game phase.

The local recordings, game saves, authentication token, model cache, and generated game data remain outside the repository.
