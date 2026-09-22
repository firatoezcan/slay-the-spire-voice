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

## Execution boundary

Card plays and other native asynchronous operations report dispatched once the game accepts them. Callers must observe subsequent game state to confirm the effect. Generated client and console metadata checks do not establish that every native command is safe or useful in every game phase.

The local recordings, game saves, authentication token, model cache, and generated game data remain outside the repository.
