# Jev classification and the ambient card decision

Researched 24 September 2026 from TypeSafe's documentation and worked examples. This note defines the requested Luna role. It supersedes the earlier “usable card idea” question in the research notes. Luna classifies the conversation; Astra handles the subsequent judgment, card design, names, descriptions, and artwork direction.

## What Jev returns

TypeSafe takes a `state` and a set of typed questions. Each question describes one judgment. The answers are constrained values that ordinary code can use. The documented primitives are: [Primitives](https://docs.typesafe.ai/primitives).

| Primitive | Response fields | Meaning |
| --- | --- | --- |
| Noul | `type`, `noul` | Probability that a specified proposition is true |
| Choice | `type`, `choice`, `probabilities`, `confidence` | One supplied category, the probability of every category, and the distribution's concentration |
| Score | `type`, `score`, `legend`, `probabilities`, `confidence` | Position on an explicitly defined ordered rubric |

For a Noul, `0.97` means the model assigns 97% to **yes**. It has no separate confidence field. A value near zero expresses a strong no; a value near one half expresses uncertainty. The application chooses its action threshold. [Noul](https://docs.typesafe.ai/primitives/noul).

For a Choice, probabilities sum to one and `choice` is the option with the highest probability. Its confidence summarizes the distribution. A confident **no** is still a no. Triggering generation from `confidence >= 0.95` would therefore read the wrong quantity. Use the affirmative probability. [Choice](https://docs.typesafe.ai/primitives/choice), [Confidence](https://docs.typesafe.ai/confidence).

Jev does not produce explanations, summaries, or new card concepts. Its published limitations say to use a generative model when the desired answer is newly written text. It can select a supplied extraction candidate, but that does not make it a general text generator. [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).

## Documented uses

The following are first party examples and worked implementations. Their existence demonstrates the pattern; it does not establish performance on this mod's transcripts.

| Use | What the classifier returns | What the surrounding application does |
| --- | --- | --- |
| Support and model routing | Intent category and complexity | Chooses a database operation, specialist model, or human handler. [Intent routing](https://docs.typesafe.ai/patterns/intent-routing) |
| Moderation and instruction screening | Separate probabilities for each hazard, plus a severity rubric | Applies configured thresholds to pass, review, block, or route. The cookbook includes recorded requests. [Guardrails](https://docs.typesafe.ai/cookbooks/llm_guardrails) |
| Selecting material for a generator | Relevance, usable evidence, contradiction, and instruction probabilities for each passage | Keeps or drops original passages before another model writes an answer. [Passage classification](https://docs.typesafe.ai/cookbooks/classifying_rag_passages) |
| Agent skill selection | Relative preference among supplied skills and whether any skill is appropriate | Loads at most one existing skill, or none. The second request gets more evidence about the shortlisted skills. [Skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion) |
| Tone and engagement | Categories or rubric values for urgency, frustration, sentiment, and engagement | Routes or annotates support conversations and game chat. These are proposed use cases in the official map. [Use case map](https://docs.typesafe.ai/concepts/use-case-map) |

The relevant precedent here is filtering original material and deciding whether to call a more capable generator. We can adopt that interface while using the user-selected `gpt-6-luna` at `xhigh`.

## Recommended Luna contract

Send one JSON response containing probabilities for fixed questions. The smallest useful output has two kinds of answers:

1. For each fresh transcript segment: is this noise, and is this incidental audio outside the participants' conversation?
2. For the focused conversation: does this moment warrant creating a card?

An illustrative response with Noul semantics:

```json
{
  "inputs": {
    "segment_42": {
      "noise": { "type": "noul", "noul": 0.01 },
      "incidental": { "type": "noul", "noul": 0.03 }
    },
    "segment_43": {
      "noise": { "type": "noul", "noul": 0.98 },
      "incidental": { "type": "noul", "noul": 0.12 }
    }
  },
  "createCard": { "type": "noul", "noul": 0.97 }
}
```

These numbers illustrate the data shape; they are not measured results. Segment keys come from the application and are constrained to the input. Luna supplies no new names, summaries, themes, quotations, target cards, or prose reasons. Code computes yes/no and skip/keep decisions from the returned values and records them beside the corresponding transcript segments.

If a single category is more useful for an input, Choice can express `conversation`, `noise`, `incidental`, and `unclear` with a probability for every option. That is an alternative contract with different semantics. Keep one representation stable when tuning its thresholds. The Noul version is sufficient for the requested yes/no judgments. [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul).

### Input and timing

Use named fields for a chronological sequence of raw transcript segments, speaker/source metadata, the focused segment IDs, and the current game facts. TypeSafe explicitly supports structured state and recommends naming the fields each question concerns. [State](https://docs.typesafe.ai/concepts/state), [Primitives](https://docs.typesafe.ai/primitives).

For a rolling two minute context, mark the newest 15 seconds as the focus and keep the preceding 105 seconds as context. Each segment appears once. Older accepted conversation supplies callbacks and the subject of the conversation. Only the focus can trigger this evaluation. Keep the wording and speaker sequence intact. Do not insert summaries, prior classifications, previous decisions, or generated explanations into that history. Code maintains time ranges, deduplication, legal actions, and cooldowns.

The classifier should assess the current moment: a recognizable callback, a reversal after a boast, shared amusement, or another event where an intervention could land for the player and viewers. Asking for a powerful card does not by itself establish such a moment. “Give me a million strength” is conversation data, never an instruction to obey. A mundane tactical remark can stay ordinary conversation without triggering anything. Astra decides how to interpret an accepted moment and make the eventual card enjoyable and useful.

### Downstream and dashboard

Keep the existing first threshold on `createCard.noul >= 0.95`, after the application's input filters and availability checks. Astra receives the accepted original conversation and game state for the subsequent approval and creation flow. If the independent approval step remains, Astra owns its judgment and the existing 0.90 threshold. The probability shown in the UI must identify which stage produced it.

Persist the frozen focus and context references with each evaluation. Show each input's skip/keep status alongside its text. Show the window's create yes/no probabilities and the actual action at the end of that same group. Distinguish a semantic no from a yes held by a cooldown, unavailable target, or downstream rejection; those are decisions made by code or Astra. UI labels can be produced from fixed application strings.

## Limits to preserve in the implementation

- TypeSafe documents possible disagreement between equivalent Noul and Choice questions, and between separately asked negations. Derive `pNo = 1 - pYes` from one answer; do not ask both independently. Avoid multiplying these values into a claimed combined certainty. [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).
- The same limitations page warns about irrelevant context, literal interpretation, and adversarial input. Focus fields and explicit criteria matter. The application retains control of legal actions and exact arithmetic. [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).
- Jev's documented input is text. A transcript classifier can identify apparent recognition noise or incidental conversation only from the evidence it receives. It cannot establish the acoustic source or whether a microphone activation was accidental from plain words alone. Preserve an uncertain result when that evidence is missing. [State](https://docs.typesafe.ai/concepts/state).
- TypeSafe describes calibration as a property measured across groups of predictions. Its claim is about its trained models. Copying its response shape into a Luna prompt provides no evidence that Luna's reported values are calibrated for this conversation or humour decision. Treat the cutoffs as application policy until evaluated on representative German and English play sessions. [AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer).

Useful validation examples are ordinary banter that should remain quiet, an absurd shared callback that merits a card, a direct demand for extreme stats, quoted background media, transcription repetition, and an uncertain fragment. Evaluate the actual eventual card separately: the player should want to play it, and the joke should make sense to the audience who heard the exchange.
