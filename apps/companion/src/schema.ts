import { t } from "elysia";
import type { Static } from "@sinclair/typebox";

export const Inspiration = t.Object({
  text: t.String({ minLength: 1, maxLength: 4000 }), source: t.Union([t.Literal("microphone"), t.Literal("chat"), t.Literal("tts"), t.Literal("manual")]),
  mood: t.Optional(t.String({ maxLength: 120 })),
});
export const Generate = t.Object({ instanceId: t.String(), lucky: t.Boolean({ default: false }), immediate: t.Boolean({ default: false }) });
export const Job = t.Object({
  id: t.String(), runId: t.String(), kind: t.Union([t.Literal("card"), t.Literal("art")]),
  status: t.String(), instanceId: t.String(), definitionId: t.Nullable(t.String()), lucky: t.Boolean(), immediate: t.Boolean(),
  createdAt: t.String(), completedAt: t.Nullable(t.String()), error: t.Nullable(t.String()), result: t.Nullable(t.String()),
});
export type JobRecord = Static<typeof Job>;
export const Transcript = t.Object({ id: t.String(), runId: t.String(), text: t.String(), source: t.String(), mood: t.String(), createdAt: t.String() });
export type TranscriptRecord = Static<typeof Transcript>;
export const ProviderSettings = t.Object({
  id: t.Literal("provider"), model: t.String(), modelDir: t.String(), autoPrepare: t.Boolean(),
  cardTimeoutMs: t.Integer({ minimum: 10000, maximum: 600000 }), artTimeoutMs: t.Integer({ minimum: 10000, maximum: 900000 }),
});
export type ProviderConfig = Static<typeof ProviderSettings>;
export const Health = t.Object({
  id: t.Literal("health"), game: t.Boolean(), error: t.Nullable(t.String()),
  speech: t.Object({ model: t.String(), modelDir: t.String(), ready: t.Boolean(), busy: t.Boolean(), missing: t.Array(t.String()) }),
});
export type HealthState = Static<typeof Health>;
