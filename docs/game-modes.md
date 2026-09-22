# Two gameplay modes

Product direction, 22 September 2026. These are the two core gameplay modes. Listening settings, providers, artwork and input integrations are shared. This document defines intended behavior; neither mode is implemented yet.

| Mode | Where generated cards enter | Who decides |
| --- | --- | --- |
| **Wildcard** | Exactly one option in every card reward is replaced by a generated card of the same rarity as that option. | The player chooses from the resulting reward normally, including skipping it. |
| **Living Deck** (working name) | The director replaces an existing card in the player's persistent deck one-for-one when it finds an appropriate moment. | The director acts automatically within the selected tuning rules. No confirmation is required for each replacement. |

## Wildcard

Let the normal game generate the card reward first. Select one option and replace it with a generated definition whose rarity matches that specific option. A common replaces a common; a rare replaces a rare. Keep the other options and the number of choices intact. This applies to every actual card-reward selection, including rewards reached through other game systems; shops, card removal and unrelated selection screens are not automatically card rewards.

There is no intervention-frequency slider in this mode: every card reward gets one wildcard. Speech and chat influence what it becomes. Silence or an irrelevant utterance changes neither coverage nor rarity; use the run's existing theme and game context. The classifier may ignore an input, but it cannot decide to omit the reward's wildcard.

Proposed defaults:

- Keep normal character/pool eligibility and the replaced option's upgrade state. Special reward restrictions still apply.
- Choose the replaced slot without preferentially removing an inconvenient card or giving the player a guaranteed answer to the current deck's weakness.
- Stabilize the reward before selection. Reopening it or repeating a phrase does not reroll its wildcard.
- Generate candidates ahead of likely rewards, grouped by eligible rarity. If generation is pending or fails, make that state explicit; a silently unchanged reward is not a successful wildcard replacement. The exact pending/error interaction needs an implementation check.
- The player can take another option or skip normally. This is one replacement in the existing reward, not an extra reward or a separate pair of generated offers.

Rarity preservation is a distribution rule, not proof of balance. Generated cards still need costs, drawbacks and useful niches comparable to the surrounding card pool. A generated common that solves every situation is unacceptable even though its rarity label is correct.

## Living Deck

The director watches speech/chat and game context, chooses an eligible existing card, generates a replacement, and commits a one-for-one deck change. Deck size stays constant. The player opts into this behavior by selecting the mode; it does not become another accept/decline screen.

A short before/after reveal explains the change: “Defend became Emergency Carapace — inspired by ‘become crab’.” Keep a visible history of what changed and why. The generated card starts with placeholder art; its first successful play queues artwork independently.

The decision can happen whenever context makes it interesting. Commit the replacement at a safe game boundary, never while the target is being played or targeted. The first implementation must define how persistent deck cards map to their live combat copies before enabling in-combat replacement. This timing constraint should not become an arbitrary periodic replacement schedule: an available budget permits a change, but does not require one.

### Proposed tuning

These are proposed starting values for playtesting, not user-mandated numbers or validated balance.

| Setting | What it controls | Conservative starting point |
| --- | --- | --- |
| Frequency | Minimum game progress between changes, plus an act-level ceiling | At least three completed rooms between changes; at most two replacements per act |
| Strength | How far the replacement may move from the original card's power/role | Aim for sidegrades; preserve rarity and upgrade investment |
| Synergy | How deliberately the director optimizes for the current deck | Occasional useful connections, without always filling the best missing piece |
| Eligible cards | What the director is allowed to replace | Ordinary cards; protect curses/statuses and cards with unsupported permanent modifications |
| Protected cards | Player-selected cards excluded from replacement | An optional small pinned set for defining cards or favorites |
| Repeat changes | How soon a replacement can itself be replaced | Protect the same card lineage for the rest of the act |

Frequency and strength are independent. Turning up frequency must not also raise the power budget. Mood changes theme and timing; it does not automatically rescue a frustrated player with a stronger card.

Preserving a card's rarity or nominal point value is insufficient. Replacing weak cards with consistently useful cards, erasing drawbacks, and repeatedly improving synergy can make the whole deck much stronger even when each change appears small. Evaluate the replacement relative to its original lineage and the current deck, and track cumulative changes across the run. The initial objective is variation with tradeoffs, not a sequence of upgrades.

Power estimates are imperfect. Deterministic checks can bound known values and forbid specified loops; a model can critique a design, but cannot certify that an interaction is balanced. Playtesting must look at deck-wide strength, easy infinite loops, cheap draw/energy cycles, erased weaknesses and whether ordinary rewards still matter.

## Shared AI and persistence behavior

The state machine supplies mode-specific legal actions. Jev evaluates relevant signals and, in Living Deck, whether a replacement opportunity fits the situation. OpenCode's LLM produces a definition within the requested rarity, role and effect vocabulary. Code validates the result and rechecks the exact reward slot or deck-card instance before applying it.

For Wildcard, persist the reward identity, chosen slot, original rarity and replacement definition. For Living Deck, persist the original instance/lineage, replacement definition, reason and consumed tuning budget. Reconnects and late results must not produce a second reward replacement, change a different copy of a card, or spend the same opportunity twice. Card rules are immutable within a definition; a Living Deck transformation creates a new definition/instance relationship rather than silently editing all cards that share a model type.

First-play artwork stays the same in both modes: one job per definition/art revision, placeholder immediately, update the portrait when ready. Input integrations use the same local API and cannot bypass the selected gameplay mode's rules.
