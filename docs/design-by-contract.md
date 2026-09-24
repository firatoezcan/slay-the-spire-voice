# Contracts and boundaries

The host produces card content. Local delivery and network delivery apply the same content through the same game code. The transport never designs a card or mutates a deck.

## Ownership

| Boundary | Accepted input | Guarantee on success |
| --- | --- | --- |
| Luna classification | Original conversation, latest 15-second focus, current game facts | Probabilities for fixed questions only; every input label refers to an actual supplied segment |
| Astra judgment and generation | Kept original conversation and eligible cards | A selected existing target and a definition admitted by the shared card rules before it becomes a candidate |
| Definition registry | A complete card definition within serialization limits | Immutable rules under one identity; an identical repeat is accepted, changing an existing identity is rejected |
| Artwork preparation | A decodable PNG within source limits | One 512 by 384 PNG within the delivery limit |
| Artwork installation | Prepared PNG bytes and a known definition | The exact bytes are stored and the portrait updated; receiving peers do not re-encode the image |
| Party settings | Valid settings from the host | The same validation applies to local configuration and remote application; a guest's saved preferences are preserved |
| Delivery | A known sender, allowed message direction, and current run | Only authorized complete content reaches the application boundary |
| Card decision | A synchronized definition choice for a specific owner and draw/reward opportunity | One shared commit path checks legality and updates the persistent card and combat copy |
| Run lifecycle | A started, unfinished hosted run | The companion may start AI work; joining clients, replays, menus, and finished runs cannot start it |

The glossary is in [CONTEXT.md](../CONTEXT.md). These are implementation contracts, not separate gameplay modes.

## Content and delivery

`DefinitionRegistry.Register` and `DefinitionRegistry.SetArt` apply content locally. They have no network publishing side effects. Host application entry points publish after acceptance. Network receivers call the same registry methods after checking sender, run, payload bounds, and completed transfer integrity.

Card definitions contain immutable effect and keyword collections. Registration preserves identity: the same ID and content is idempotent; the same ID with different rules is an error. Save restoration admits structurally valid existing definitions. New candidates additionally pass the current quality policy before they can replace a card.

The host prepares artwork once. Both its own installation and a guest installation use the prepared bytes. A guest acknowledges only after the complete payload has been validated and installed. Partial, damaged, oversized, or inconsistent transfers never reach the registry. Each receiver owns its assembly state. Rejoining clients compare content identities and request missing assets.

`CardSessionScope.Accepts` is the delivery policy. Known guests may request a session or missing assets and acknowledge deliveries. Only the host may provide party settings, card content, or card offers. Messages for another run are rejected. The native transport supplies the sender identity; JSON fields cannot claim a different sender.

## Decisions and execution

The host chooses a prepared replacement. The owner relays that choice through the game's existing player-choice stream. Every participant then calls `Director.Commit` at the corresponding game opportunity. Singleplayer uses the same choice stream; replay consumes recorded choices. Generation and image work are absent from that execution path.

Commit preserves rarity, upgrades, and card lineage. It rejects consumed wildcards, unsupported permanent modifiers, and a second transformation of the same card in one turn. A ready replacement applies on its next eligible draw without an additional random roll. A settings message changes configuration; it never directly transforms a card.

The host's saved settings and a guest's applied party settings have different persistence ownership. Both use `DirectorSettingsRules.Validate`. Leaving restores the guest's saved settings. Microphone consent is always local and is excluded from party settings.

## Lifecycle and failure

The game may retain its run object on the results screen. The explicit run-ended hook stops voice capture and marks the run inactive; the companion rejects new generation and stops polling audio for that run. The dashboard can stay open. Already running AI requests may finish, as requested; applying a stale candidate is rejected by the game.

Invalid input fails at its receiving boundary. An API operation reporting dispatch is not proof that an asynchronous game action finished; callers observe the resulting state. A failed content installation is not acknowledged. Reconnect requests retry content through the same validation path.

The player ZIP contains the mod, managed dependencies, and instructions. The host installer alone creates the companion launcher. Friends require only the game and the mod folder.

## Verification scope

Local checks exercise the actual serializers, receiver instances, delivery policy, shared validators, and companion lifecycle guards. A single-client game run exercises the native application path. Two independent live game clients are unavailable for this release, so successful Steam multiplayer gameplay is not claimed from these checks. See [runtime validation](runtime-validation.md) for observed results.
