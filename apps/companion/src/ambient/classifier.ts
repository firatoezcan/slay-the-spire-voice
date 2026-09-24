import { t } from "elysia";
import { Effect } from "effect";
import Ajv from "ajv-draft-04";
import type { Static } from "@sinclair/typebox";
import { codexJob } from "../providers/codex";
import type { GameState } from "../game";
import { generationModel } from "../providers/models";
import { promptInstructions } from "../prompts";

export const classifierModel = "gpt-6-luna";
export const classifierReasoningEffort = "xhigh" as const;
const Noul = t.Object({ type: t.Literal("noul"), noul: t.Number({ minimum: 0, maximum: 1 }) }, { additionalProperties: false });

// Jev's Noul shape: the number is P(yes), including when the likely answer is no.
export const MomentEvaluation = t.Object({
  answers: t.Object({ create_card: Noul }, { additionalProperties: false }),
  inputs: t.Array(t.Object({
    id: t.String(),
    answers: t.Object({ noise: Noul, accidental: Noul }, { additionalProperties: false }),
  }, { additionalProperties: false }), { minItems: 1 }),
}, { additionalProperties: false });
export type MomentEvaluation = Static<typeof MomentEvaluation>;
export const CardDecision = t.Object({
  answers: t.Object({ create_card: Noul }, { additionalProperties: false }),
  instanceId: t.Union([t.String(), t.Null()]),
}, { additionalProperties: false });
export type CardDecision = Static<typeof CardDecision>;

export type TranscriptSegment = {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  startedAt: string;
  endedAt: string;
};
export type ConversationWindow = { startedAt: string; endedAt: string; transcript: TranscriptSegment[] };
export type MomentContext = {
  conversation: ConversationWindow;
  focus: ConversationWindow;
  game: Pick<GameState, "phase" | "turn" | "creatures"> & {
    deck: Array<Pick<GameState["cards"][number], "name" | "rarity" | "type" | "cost" | "description" | "playerId" | "playerName">>;
    hand: Array<Pick<GameState["cards"][number], "name" | "rarity" | "type" | "cost" | "description" | "playerId" | "playerName">>;
  };
  canCreateCard: boolean;
};

const validate = new Ajv({ strict: false }).compile<MomentEvaluation>(MomentEvaluation);
export function parseEvaluation(text: string, context: MomentContext): MomentEvaluation {
  const evaluation: unknown = JSON.parse(text);
  if (!validate(evaluation)) throw new Error("Classifier returned invalid probabilities.");
  const expected = new Set(context.focus.transcript.map(segment => segment.id));
  const actual = evaluation.inputs.map(input => input.id);
  if (actual.length !== expected.size || new Set(actual).size !== actual.length || actual.some(id => !expected.has(id)))
    throw new Error("Classifier must evaluate every focus input exactly once.");
  return evaluation;
}
export function usableInput(input: MomentEvaluation["inputs"][number]) {
  return input.answers.noise.noul < 0.5 && input.answers.accidental.noul < 0.5;
}
async function evaluate(context: MomentContext, requestId: string, systemPrompt: string, model: string) {
  const result = await Effect.runPromise(codexJob({
    id: requestId, model, reasoningEffort: classifierReasoningEffort, systemPrompt,
    prompt: JSON.stringify(context), schema: MomentEvaluation, timeout: 60000,
  }));
  return { evaluation: parseEvaluation(result.text, context), events: result.events };
}
export const classifyWindow = (context: MomentContext, requestId: string) => evaluate(context, requestId, promptInstructions("classifier"), classifierModel);
const validateCardDecision = new Ajv({ strict: false }).compile<CardDecision>(CardDecision);
export async function confirmWindow(context: MomentContext, eligibleCards: GameState["cards"], requestId: string) {
  const result = await Effect.runPromise(codexJob({
    id: requestId, model: generationModel, reasoningEffort: "xhigh", systemPrompt: promptInstructions("confirmation"),
    prompt: JSON.stringify({ ...context, eligibleCards }), schema: CardDecision, timeout: 60000,
  }));
  const decision: unknown = JSON.parse(result.text);
  if (!validateCardDecision(decision) || (decision.instanceId !== null && !eligibleCards.some(card => card.id === decision.instanceId)))
    throw new Error("Astra returned an invalid card decision.");
  return { decision, events: result.events };
}
