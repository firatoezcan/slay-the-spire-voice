import { t } from "elysia";
import type { Static } from "@sinclair/typebox";
import type { Definition, GameState } from "./game";

export const CardReview = t.Object(
  {
    strongestReferenceId: t.String(),
    comparison: t.String(),
    beatsBest: t.Boolean(),
    wantsToPlay: t.Boolean(),
    fitsDeck: t.Boolean(),
    hasDrawback: t.Boolean(),
    payoffChangesPlay: t.Boolean(),
    quality: t.Number({ minimum: 0, maximum: 12 }),
    reason: t.String(),
  },
  { additionalProperties: false },
);
export type Review = Static<typeof CardReview>;

// Runtime data is passed separately from the editable system instructions.
export function designPrompt(state: GameState, lucky: boolean, data: unknown, feedback: string) {
  return JSON.stringify({
    strength: state.settings.strength, synergy: state.settings.synergy, lucky,
    data, previousRejection: feedback,
  });
}
export function reviewPrompt(definition: Definition, data: unknown) {
  return JSON.stringify({ data, proposal: definition });
}
