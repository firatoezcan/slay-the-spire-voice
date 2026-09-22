# Two gameplay modes

Product direction, 22 September 2026. These are the two core gameplay modes. Listening settings, providers, artwork and input integrations are shared. This document defines intended behavior; neither mode is implemented yet.

| Mode | Where generated cards enter | Who decides |
| --- | --- | --- |
| **Wildcard** | Exactly one option in every card reward is replaced by a generated card of the same rarity as that option. Once taken, it has one optional transformation within that reward interaction. | The player commits to taking the card before choosing whether to transform it. |
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

### Take first, then optionally transform once

The wildcard's initial generation fills its reward slot. It then has **one optional transformation**, available only after the player takes it and while completing that card-reward interaction. Taking it commits the reward choice; transforming unchosen options to shop for a better result is not available.

After taking the wildcard, show the acquired card with **Keep**, **Transform**, and **I'm feeling lucky**. Keep completes acquisition unchanged. Transform uses the chosen inspiration; I'm feeling lucky asks for a deck-aware surprise. Either transformation route consumes the same single allowance when a valid replacement is committed. The transformed card keeps the original reward rarity; it does not receive another transformation allowance just because it has a new definition or model ID. Leaving the reward interaction closes this optional step.

Keep the acquired card in place while generation runs. A failed request does not count as a completed transformation. Reserve the allowance while a request is pending so repeated clicks cannot commission or apply multiple results. After success, reveal the result and finish the interaction; it is not another set of reward choices.

## Shared transformation rules

These are gameplay requirements, distinct from the proposed tuning values below:

| Rule | Meaning |
| --- | --- |
| One optional transformation per wildcard | Only after taking it, within the reward interaction; ordinary and Lucky transformations share the allowance. |
| At most one transformation per card per turn | Track the persistent card instance across replacements, rather than the current model ID. Changing its name/type does not reset the limit. |
| A transformed deck card is drawn next turn | The replacement must reach the player's hand in the next player turn, not merely become more likely to be drawn. |

During combat, “next turn” means that player's next turn after the transformation is committed. Outside combat, including the post-take wildcard step, use the first turn of the next combat. If a fight ends before a committed guarantee can be fulfilled, carry it to the next combat in the same run. Pending generation has no effect until a transformation actually commits.

Persist a next-turn draw obligation against the resulting card instance. Shuffling or moving between piles must not silently lose it, and fulfilling it must not duplicate the card. The proposed default is to count this card toward the ordinary draw allowance. Hand capacity, draw-prevention effects, and multiple guaranteed cards need an explicit implementation check before a transformation can be committed; simply putting a card on top of the draw pile does not establish the guarantee.

Use the actual game turn identity for the per-turn limit. Rewards do not fabricate extra turns, and reopening a reward or reconnecting does not reset its one-time allowance. A pending transformation must reserve its target and recheck that target and the turn limit immediately before applying.

## “I'm feeling lucky”

This is a transformation option, not a third gameplay mode. Its first placement is beside Transform on the just-taken wildcard. It transforms that selected card using the **current deck** as context; it does not grant an extra card. The same generation intent can later serve an eligible Living Deck transformation, subject to its existing limits.

The desired result is **at least 6/10 and up to 12/10, with a twist**: a worthwhile card whose payoff and disruption respond to the current deck. It can demand a new direction or dismantle the existing strategy. These grades describe the card's overall opportunity, not a promise that the run improves or survives, and are not a calibrated balance metric. Keep the rarity rule separate from the quality target.

Proposed interpretation:

| Grade | Intended result |
| --- | --- |
| 6–8/10 | A solid payoff and a recognizable twist, accounting for its costs and risks |
| 9–10/10 | A strong enabler that makes a different sequence or drafting direction attractive |
| 11–12/10 | An exceptional, memorable build-around payoff, concentrated in a direction instead of universally solving the run |

The common case should be useful and interesting, with exceptional outcomes rarer. Do not force all generations toward 12/10. A twist can turn block into an attack resource, sacrifice a familiar engine for a powerful new payoff, or make the player rethink future drafting. Use the deck to find an interesting opportunity; preserving the existing strategy is not required.

**Wrecking the run is allowed; the card still has to be good.** A dangerous effect, destructive tradeoff, lost synergy or forced pivot is acceptable when the complete card offers a compelling payoff. Do not reject a design merely because it could ruin this run. Equally, a pure punishment with no credible upside does not become a good card by being surprising. Evaluate benefit, cost, risk and the new strategic direction together. Implementation validity remains separate: crashes and broken rules are bugs, not interesting card drawbacks.

Generate from a fresh deck snapshot and recheck meaningful deck changes before committing. Evaluate the payoff, risk, new direction, existing combinations and cumulative power. A model's self-assigned “12/10” is not validation. Record the intended role and tradeoff; verify the quality band through actual play rather than presenting the score as measured fact.

## Living Deck

The director watches speech/chat and game context, chooses an eligible existing card, generates a replacement, and commits a one-for-one deck change. Deck size stays constant. The player opts into this behavior by selecting the mode; it does not become another accept/decline screen.

A short before/after reveal explains the change: “Defend became Emergency Carapace — inspired by ‘become crab’.” Keep a visible history of what changed and why. The generated card starts with placeholder art; its first successful play queues artwork independently.

The decision can happen whenever context makes it interesting. Commit the replacement at a safe game boundary, never while the target is being played or targeted, and enforce the once-per-card-per-turn limit. Its resulting instance is guaranteed in the next turn's draw. The first implementation must define how persistent deck cards map to their live combat copies before enabling in-combat replacement. This timing constraint should not become an arbitrary periodic replacement schedule: an available budget permits a change, but does not require one.

### Proposed tuning

These are proposed starting values for playtesting, not user-mandated numbers or validated balance.

| Setting | What it controls | Conservative starting point |
| --- | --- | --- |
| Frequency | Minimum game progress between changes, plus an act-level ceiling | At least three completed rooms between changes; at most two replacements per act |
| Strength | How far automatic replacements may move from the original card's power/role | Aim for sidegrades; preserve rarity and upgrade investment. Explicit Lucky transformations use their 6–12/10 quality target. |
| Synergy | How deliberately the director optimizes for the current deck | Occasional useful connections, without always filling the best missing piece |
| Eligible cards | What the director is allowed to replace | Ordinary cards; protect curses/statuses and cards with unsupported permanent modifications |
| Protected cards | Player-selected cards excluded from replacement | An optional small pinned set for defining cards or favorites |
| Repeat changes | How soon a replacement can itself be replaced | Hard limit of once per card per turn; any longer cooldown is optional tuning |

Frequency and strength are independent. Turning up frequency must not also raise the power budget. Mood changes theme and timing; it does not automatically rescue a frustrated player with a stronger card.

Preserving a card's rarity or nominal point value is insufficient. Replacing weak cards with consistently useful cards, erasing drawbacks, and repeatedly improving synergy can make the whole deck much stronger even when each change appears small. Evaluate the replacement relative to its original lineage and the current deck, and track cumulative changes across the run. The initial objective is variation with tradeoffs, not a sequence of upgrades.

Power estimates are imperfect. Deterministic checks can bound known values and forbid specified loops; a model can critique a design, but cannot certify that an interaction is balanced. Playtesting must look at deck-wide strength, easy infinite loops, cheap draw/energy cycles, erased weaknesses and whether ordinary rewards still matter.

## Shared AI and persistence behavior

The state machine supplies mode-specific legal actions. Jev evaluates relevant signals and, in Living Deck, whether a replacement opportunity fits the situation. OpenCode's LLM produces a definition within the requested rarity, role and effect vocabulary. Code validates the result and rechecks the exact reward slot or deck-card instance before applying it.

For Wildcard, persist reward identity, chosen slot, original rarity, acquisition commitment, remaining transformation allowance and result. For every deck transformation, persist the original card instance/lineage, resulting definition, last transformed turn, next-turn draw obligation, reason and consumed tuning budget. For Lucky, also retain the generation intent and deck context used. Reconnects and late results must not grant another transformation, target a different copy, duplicate a draw, or spend the same opportunity twice. Card rules are immutable within a definition; a transformation creates a new definition/instance relationship rather than silently editing all cards that share a model type.

First-play artwork stays the same in both modes: one job per definition/art revision, placeholder immediately, update the portrait when ready. A transformation starts a new definition/art revision; an old pending image must not overwrite the transformed card's portrait. Input integrations use the same local API and cannot bypass the selected gameplay mode's rules.
