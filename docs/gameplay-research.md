# Gameplay research: a Spire that listens

Research date: 22 September 2026. Target game: **Slay the Spire 2**.

The strongest initial experience is a run that turns memorable things the player or audience says into a small number of consequential card offers. The player should recognize the joke or intention immediately, understand the price, and decide whether the card belongs in the deck. That is a design recommendation, not a result from a playable prototype.

This note separates documented precedents, inspected video material, and proposals to playtest. None of the mods below was installed or run for this research. StS1 examples are gameplay references; their Java mod APIs are not StS2 integration instructions.

## Five useful mod precedents

| Precedent | What the author documents | What to borrow for this project |
| --- | --- | --- |
| [Slay the Streamer 2](https://github.com/Surfinite/slay-the-streamer-2) — **StS2** | Twitch/YouTube votes influence card rewards, Ancient blessings, bosses, and the Act 1 variant. The streamer has a limited override budget. Some votes remove one option and leave the final choice to the streamer. Enemy names use a raffle with one ticket per participant per vote, so repeated messages do not multiply tickets. | Give chat a visible, bounded contribution. Let chat propose a theme or remove an option while the player makes the tactical decision. A clear override and one contribution per person prevent participation from becoming spam or helplessness. |
| [Chimera Cards](https://github.com/AutumnMooncat/CardAugments) — **StS1** | Existing cards receive modifiers with eligibility rules and rarities. A more expensive card can gain correspondingly higher damage; another modifier changes upgrade behavior. Players can inspect possible modifiers and configure their frequency, rarity, and where they appear. | Novelty can come from composing understandable mechanics. Make generated effects inspectable and constrain combinations by card type and run context. Distinguish a slider for how often surprises happen from a slider for how extreme they are. This is procedural card modification, not evidence of LLM card generation. |
| [The Packmaster](https://steamcommunity.com/sharedfiles/filedetails/?id=2920075378) — **StS1**, [source](https://github.com/erasels/PackmasterCharacter) | Players draft some card packs and receive others randomly. Each pack is a small archetype; the selected packs define the run's reward pool. Pack selection is configurable, and winning with a pack unlocks a cosmetic hat. The Workshop description is more current than the repository's initial proposal. | Establish a few recurring themes for each run. If chat creates a crab joke, later cards can develop a shell/defense theme instead of introducing unrelated jokes forever. A bounded vocabulary makes emergent combinations easier to learn. Recognition and collection can reward participation without granting extra combat power. |
| [Downfall](https://store.steampowered.com/app/1865780/Downfall__A_Slay_the_Spire_Fan_Expansion/) — **StS1** | Its alternate campaign makes familiar villains playable. The Hermit's Dead On mechanic rewards card positioning; the Guardian sockets gems into cards; the Slime Boss combines self-damaging attacks with Goop consumption and healing. | A memorable fantasy earns its place through decisions. A joke card should change sequencing, targeting, resource use, or future drafting. Distinctive art and a funny name help communicate that role but do not supply it. |
| [Jorbs's Wanderer Trilogy](https://github.com/dbjorge/jorbs-spire-mod) — **StS1** | The Wanderer's memory theme has mechanical consequences: new memories displace old ones, Clarity preserves them, and Snap creates pressure as a floor continues. Material Components and the Grimoire connect small generated resources to this larger system. The project was designed with community participation. | Let a small persistent memory of the run shape later offers. Avoid retaining every utterance as another independent rule. Recurring characters, grudges, or promises become interesting when the player can anticipate their consequences. |

These precedents establish usable design patterns, not a claim that this combination is already fun. In particular, audience voting, procedural modifiers, and community-designed content are different from an autonomous generative director.

## Video inspection record

Three videos were inspected through caption excerpts and/or sampled frames. **This was not full playback of the videos**, and no conclusion below relies on pretending that it was. Temporary captions, video excerpts, and contact sheets are under ignored `.research/videos/`; they are not project assets and should not be committed.

### Mega Crit: Metrics Driven Design and Balance

[Anthony Giovannetti's GDC 2019 talk](https://www.youtube.com/watch?v=7rqfbvnO_H0), [conference listing](https://www.gdcvault.com/play/1025731/contactUs).

Inspection: downloaded the English automatic captions; read 03:10–06:15, 10:38–11:32, 22:58–24:29, and 27:51–28:58. Also inspected six sampled frames from 02:30–03:30. The visible slides progress from iteration to the goal that each card has a useful place.

What the speaker explains:

- **03:12–06:08:** cards need useful situations, not identical strength. Rare combinations can create spectacular power; easy, repeatable dominant strategies reduce variety.
- **10:43–11:32:** Madness appeared disproportionately in wins because players obtained it late in successful runs. Outcome statistics need context.
- **23:31–24:29:** grindy optimal loops, such as repeatedly farming healing, are undesirable even when permitted by the rules.
- **28:14–28:58:** opaque enemy randomness made planning difficult; readable intent matters when card draws already supply uncertainty.

Automatic captions contain transcription errors. The summaries above paraphrase the relevant passages; they are not verbatim quotations.

### Downfall release trailer

[Trailer on the author's Steam page](https://store.steampowered.com/app/1865780/Downfall__A_Slay_the_Spire_Fan_Expansion/), listed as **Release Trailer** in Steam's public app metadata.

Inspection: nine sampled frames across approximately 00:00–00:54, extracted at six-second intervals from Steam's video stream. The contact sheet shows a familiar Slime Boss becoming the player, the Hermit reveal, custom cards in ordinary combat hands, and visible enemy intent. No caption track was supplied in the inspected movie metadata. This is visual sampling, not a complete narrated viewing.

Observation: the role reversal is readable before learning the new rules because familiar combat presentation remains intact. Our inference is that a generated card should preserve ordinary card readability—cost, target, effect text, and outcome—while its theme delivers the surprise.

### Chimera Cards gameplay

[AlbinoLIVE: Chimera Cards mod!](https://www.youtube.com/watch?v=VdlSHSm_d9k), published 28 June 2023.

Inspection: English automatic-caption excerpts at **34:10–36:30** and **1:17:20–1:18:40**, plus sampled frames from **34:10–35:10**. This is a creator's firsthand play session, not a mod-author specification or a representative player study.

The sampled frames show the Library event, selection of an existing card, and five previews of its modified versions. At 35:21–36:20 the discussion compares an immediate repeat effect with creating another copy for later. At 1:18 the player discusses the appeal and excess power of content mods. Our inference: the discovery becomes more interesting when followed by a consequential choice. One creator's reaction does not establish an audience-wide preference.

## Two additional primary design references

**Preserve the deck as the unit of strategy.** In [Mega Crit's August 2026 newsletter](https://www.megacrit.com/news/2026-8-14-neowsletter-issue-25/), Casey explains that StS2 disallows enchantment stacking because concentrating improvements on one card can snowball and displace deckbuilding. For this mod, repeatedly asking to improve the same favorite card should consume a scarce opportunity or be unavailable in the default mode. A separate sandbox can intentionally relax that constraint.

**A director needs quiet periods.** Michael Booth's [The AI Systems of Left 4 Dead](https://cdn.akamai.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf), PDF pages 78–82 and 92, describes estimating intensity from game events and moving through build-up, peak, fade, and relaxation. It explicitly distinguishes pacing from difficulty. The transferable idea is to budget when intervention happens. The exact timing from an action game should not be copied into a turn-based card game.

## Recommended first rules to playtest

Everything in this section is a proposal. Counts and timings are initial tuning values, not measured latency or validated balance.

1. **Turn speech into opportunities.** Acknowledge a memorable phrase, then introduce an offer at a suitable decision point. Start with one special offer every few rooms and at most one unresolved offer. A small “Inspired by: ‘we need a shell’” line establishes cause and effect. Optional narration stays quiet during calculation.
2. **Make the offer a real decision.** Present two interpretations plus a free decline. Each has a useful role and a cost: energy, Exhaust, a condition, or a drawback. Saying “deal a million damage” supplies a theme, not a damage value. Declining spends the opportunity, preventing endless prompt rerolls. Accepted rules stay stable.
3. **Make first play the art trigger.** Show a consistent placeholder immediately. First play queues artwork while the effect resolves normally. Reveal completed art between actions or on the next inspection/draw. The first animation may finish long before the image arrives. Frame, icon, name, and mechanics remain stable.
4. **Aggregate chat into a shared contribution.** Later, add a suggestion window, one counted suggestion per account, and a displayed theme. Viewers shape an offer; the player chooses whether to take it. Deduplicate TTS and its source message. Mood colors an offer without making every message an action.
5. **Let the director do nothing.** A fast classifier labels irrelevant input, recurring themes, requests, or ideas for later. The current game phase, cooldown, pending offer, and supported actions determine whether intervention is possible. The slower LLM designs an offer only when useful. Quiet is a valid response to frustration.
6. **Pace novelty without silently changing difficulty.** Keep mechanical budgets consistent. Make help, mischief, and chaos explicit modes. Limit repeatedly strengthening one card; preserve exciting synergies while investigating effortless, repeatable wins and slow farming loops.

The useful states are **listening**, **preparing**, **offer ready**, **player deciding**, and **cooldown**. Art generation has an independent queue. Expire battle-specific results when that battle ends; late completion does not authorize an effect in the next battle.

**The main counterargument to ambient listening:** private strategic thought becomes a performance for the mod. Players may avoid joking or thinking aloud if “I'm dead” can cause an intervention. Compare ambient offers with an explicit hold-to-inspire action in the first microphone-only playtest. Keep a free decline and a visible listening indicator in both. Twitch and autonomous pacing can follow once the voice-to-card loop is enjoyable.

## A three-minute example

This is an imagined playtest scenario, not recorded gameplay. Card values are illustrative and need validation against actual StS2 card pools.

| Time | What the player and audience experience | Why it might be fun |
| --- | --- | --- |
| 00:00–00:20 | During a fight, Firat says, “We need a shell. Become crab.” A small shell icon acknowledges the idea. Chat echoes the crab theme. Combat continues. | A recognizable seed and immediate acknowledgement establish cause and effect without interrupting the turn. |
| 00:20–00:50 | The director prepares one offer while the player finishes the fight. Repeated crab messages strengthen the shared theme but do not queue more cards. | The audience collaborates around one idea; the system gives the existing fight room to resolve. |
| 00:50–01:15 | At the reward screen, a special offer presents **Emergency Carapace**: “1 energy. Gain 11 Block. Exhaust.” Or **Sideways Solution**: “1 energy. Gain 6 Block. Deal 4 damage.” The player can also decline. Chat's shell theme is visible. | The player chooses between a concentrated defensive resource and a modest mixed card. The joke poses a deckbuilding question. |
| 01:15–01:45 | Firat takes Carapace and enters the next room. The director stays quiet. The card has a clean shell placeholder and normal rules text. | There is time to learn and anticipate the card before another novelty arrives. |
| 01:45–02:10 | An enemy announces a large attack. Firat plays Carapace alongside another defense. The card resolves immediately; its first play starts artwork generation. | The idea has become a tool in a real tactical choice. The payoff comes from playing well with it. |
| 02:10–02:40 | At a later calm moment, the illustration finishes: the character is awkwardly sheltered under a crab shell. A small visual reveal is enough. If it is still pending, play carries on. | The same idea has a second, visual payoff without adding another mechanic. |
| 02:40–03:00 | Chat asks for a giant laser crab. The cooldown indicator shows that the next inspiration slot is later. The director remembers “crab” as this run's theme, but makes no new card now. | The theme can become a running joke while scarcity protects anticipation and the deck. |

## What could make it fail

| Failure | First design response | What to observe in a playtest |
| --- | --- | --- |
| Players only request unbeatable cards | Constrain mechanical budgets; reinterpret the fantasy; charge scarce generation opportunities rather than speech itself. | Does repeated prompting dominate normal play? Do choices converge on the same free advantage? |
| Cards are funny once but interchangeable, or one card replaces the deck | Require distinct tactical roles; limit repeated strengthening. | Can players explain their choice? Do later rewards and sequencing still matter? |
| The director interrupts thinking | Prefer reward screens and room transitions; acknowledgement is small; narration is optional. | Interruptions per room, time spent reading new rules, and explicit requests for quiet. |
| Latency makes a response irrelevant | Acknowledge immediately, generate ahead of the next safe offer point, and expire context-specific work. | Time from utterance to acknowledgment and offer; how often the original context has disappeared. |
| Chat spam or TTS loops overwhelm the run | Deduplicate source events, count people rather than message volume, use a shared window and cooldown. | Concentration of accepted suggestions by account; duplicate-trigger frequency. |
| Mood classification misreads sarcasm | Show the interpreted theme; uncertain inputs produce no action; avoid hidden punishment. | Misinterpretation reports and self-censorship. |
| Optimal play means waiting, talking, or farming | Advance opportunities through game progress, not elapsed time or microphone volume. | Whether players delay ending fights or repeat phrases to extract value. |

For the first playtest, the decision is whether people want to keep the card and tell the story of how it appeared. Track offer acceptance, later plays, skipped offers, interruptions, and remembered moments alongside win rate. Those are suggested observations; no user study or performance benchmark has yet been conducted.
