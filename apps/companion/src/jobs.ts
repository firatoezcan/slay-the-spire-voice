import { Effect, Fiber } from "effect";
import Ajv from "ajv-draft-04";
import { dataDir, modelDir } from "./config";
import { store } from "./store";
import { promptInstructions } from "./prompts";
import {
  gameRequest,
  awaitOperation,
  type GameState,
  type Definition,
  type GameEvent,
  type GameOperation,
} from "./game";
import { codexJob, artworkFile } from "./providers/codex";
import { generationModel } from "./providers/models";
import type { JobRecord, ProviderConfig, TranscriptRecord } from "./schema";
import schema from "../../../packages/contracts/schema/card-definition.schema.json";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import type { components } from "../../../packages/contracts/src/game";
import {
  CardReview,
  designPrompt,
  reviewPrompt,
  type Review,
} from "./card-design";

const validateDefinition = new Ajv({
  strict: false,
  formats: { int32: true, double: true },
}).compile(schema);
const validateReview = new Ajv({ strict: false }).compile(CardReview);
export const providers = (): ProviderConfig => ({
    id: "provider" as const,
    modelDir,
    autoPrepare: true,
    cardTimeoutMs: 120000,
    artTimeoutMs: 300000,
    ...store.get<ProviderConfig>("settings", "provider"),
    model: generationModel,
  });
let snapshot: GameState | undefined;
let connectionError: string | null = "Waiting for Slay the Spire 2.";
const active = new Map<string, Fiber.RuntimeFiber<void, never>>();
export const currentState = () => ({ snapshot, error: connectionError });
export function inspiration(input: {
  text: string;
  source: string;
  mood?: string;
}): TranscriptRecord {
  return store.put(
    "transcripts",
    {
      id: crypto.randomUUID(),
      runId: snapshot?.runId ?? "",
      text: input.text,
      source: input.source,
      mood: input.mood ?? "",
      createdAt: new Date().toISOString(),
    },
    snapshot?.runId,
  );
}
function update(job: JobRecord, patch: Partial<JobRecord>) {
  Object.assign(job, store.get<JobRecord>("jobs", job.id), patch);
  store.put("jobs", job, job.runId);
}
export function enqueue(
  instanceId: string,
  lucky = false,
  immediate = false,
): JobRecord {
  if (!snapshot?.runId || !snapshot.host || snapshot.phase === "ended")
    throw new Error("Start a run as the host before generating a card.");
  const card = snapshot.cards.find(
    (c) => c.id === instanceId && c.pile === "Deck",
  );
  if (!card || (card.wildcard && card.resolved))
    throw new Error("This card is not eligible for a transformation.");
  const existing = store
    .all<JobRecord>("jobs", snapshot.runId)
    .find(
      (j) =>
        j.instanceId === instanceId &&
        j.kind === "card" &&
        ["queued", "running", "ready"].includes(j.status),
    );
  if (existing && existing.lucky === lucky) {
    if (immediate) update(existing, { immediate: true });
    return existing;
  }
  if (existing)
    update(existing, {
      status: "cancelled",
      completedAt: new Date().toISOString(),
    });
  const job: JobRecord = {
    id: crypto.randomUUID(),
    runId: snapshot.runId,
    kind: "card",
    status: "queued",
    instanceId,
    definitionId: null,
    lucky,
    immediate,
    createdAt: new Date().toISOString(),
    completedAt: null,
    error: null,
    result: null,
  };
  return store.put("jobs", job, job.runId);
}
function queueArt(event: GameEvent) {
  if (
    !event.definitionId ||
    store
      .all<JobRecord>("jobs")
      .some(
        (j) =>
          j.kind === "art" &&
          j.definitionId === event.definitionId &&
          j.status !== "failed",
      )
  )
    return;
  store.put<JobRecord>(
    "jobs",
    {
      id: crypto.randomUUID(),
      runId: event.runId,
      kind: "art",
      status: "queued",
      instanceId: event.instanceId ?? "",
      definitionId: event.definitionId,
      lucky: false,
      immediate: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      result: null,
    },
    event.runId,
  );
}

async function runCard(job: JobRecord) {
  const state = snapshot;
  if (!state || state.runId !== job.runId)
    throw new Error("The run changed before generation started.");
  const card = state.cards.find(
    (c) => c.id === job.instanceId && c.pile === "Deck",
  );
  if (!card) throw new Error("The card left the deck.");
  if (card.wildcard && card.resolved)
    throw new Error("This card can no longer transform.");
  const context = store
    .all<TranscriptRecord>("transcripts", job.runId)
    .filter(record => !record.error && Date.parse(record.endedAt ?? record.createdAt) >= Date.now() - 120000 &&
      (record.noiseProbability ?? 0) < 0.5 && (record.accidentalProbability ?? 0) < 0.5)
    .sort((a, b) => Date.parse(a.endedAt ?? a.createdAt) - Date.parse(b.endedAt ?? b.createdAt))
    .map(({ text, playerName, source, startedAt, endedAt, createdAt }) => ({ text, playerName, source, startedAt, endedAt, createdAt }));
  const references =
    await gameRequest<components["schemas"]["CardReference"][]>(
      "/cards/references",
    );
  const rarityCards = references.filter((c) => c.rarity === card.rarity);
  if (!rarityCards.length)
    throw new Error("The game's rarity catalogue is unavailable.");
  const sourceModelId = card.definitionId
    ? store.get<{ id: string; modelId: string }>(
        "card-sources",
        card.definitionId,
      )?.modelId
    : card.modelId;
  const source =
    references.find((c) => c.modelId === sourceModelId) ??
    references.find((c) =>
      state.cards.some((d) => d.pile === "Deck" && d.modelId === c.modelId),
    );
  if (!source)
    throw new Error("No native card is available for artwork direction.");
  const data = {
    original: card,
    deck: state.cards.filter((c) => c.pile === "Deck" && c.playerId === card.playerId),
    inspiration: store.get("card-inspirations", job.id) ?? context,
    nativeCardsOfSameRarity: rarityCards,
  };
  const config = providers();
  let definition: Definition | undefined;
  let feedback = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    update(job, {
      result:
        attempt === 1
          ? "Designing the card."
          : "Revising the card after review.",
    });
    const result = await Effect.runPromise(
      codexJob({
        id: `${job.id}/design-${attempt}`,
        prompt: designPrompt(state, job.lucky, data, feedback),
        systemPrompt: promptInstructions("design"),
        schema,
        timeout: config.cardTimeoutMs,
        model: config.model,
      }),
    );
    if (store.get<JobRecord>("jobs", job.id)?.status === "cancelled") return;
    const candidate = JSON.parse(result.text) as Definition;
    candidate.id = job.id.replaceAll("-", "");
    if (!validateDefinition(candidate)) {
      feedback = "Invalid schema: " + JSON.stringify(validateDefinition.errors);
      continue;
    }
    if (candidate.rarity !== card.rarity) {
      feedback = "Preserve the original rarity: " + card.rarity;
      continue;
    }
    const validation = await gameRequest<
      components["schemas"]["CardValidation"]
    >("/cards/validate", "POST", candidate);
    if (!validation.valid) {
      feedback = validation.error ?? "The game rejected these effects.";
      continue;
    }
    update(job, {
      result: "Comparing the card with the strongest cards of its rarity.",
    });
    const verdict = await Effect.runPromise(
      codexJob({
        id: `${job.id}/review-${attempt}`,
        prompt: reviewPrompt(candidate, data),
        systemPrompt: promptInstructions("review"),
        schema: CardReview,
        timeout: config.cardTimeoutMs,
        model: config.model,
      }),
    );
    if (store.get<JobRecord>("jobs", job.id)?.status === "cancelled") return;
    const review = JSON.parse(verdict.text) as Review;
    if (!validateReview(review)) {
      feedback = "The independent review was invalid.";
      continue;
    }
    store.put(
      "card-reviews",
      {
        ...review,
        id: `${job.id}:${attempt}`,
        jobId: job.id,
        definitionId: candidate.id,
        candidate,
      },
      job.runId,
    );
    if (
      !rarityCards.some((c) => c.modelId === review.strongestReferenceId) ||
      !review.beatsBest ||
      !review.wantsToPlay ||
      !review.fitsDeck ||
      review.quality < 10 ||
      (review.hasDrawback &&
        (card.rarity !== "Rare" || !review.payoffChangesPlay))
    ) {
      feedback = `${review.reason}\n${review.comparison}`;
      continue;
    }
    definition = {
      ...candidate,
      quality: review.quality,
      rationale: `${candidate.rationale}\n\n${review.comparison}`,
    };
    break;
  }
  if (!definition)
    throw new Error(
      "The card did not meet the quality floor after three designs. " +
        feedback,
    );
  await awaitOperation(
    await gameRequest<GameOperation>("/candidates", "POST", {
      runId: job.runId,
      instanceId: job.instanceId,
      definition,
      lucky: job.lucky,
    }),
  );
  store.put("definitions", definition, job.runId);
  store.put(
    "card-sources",
    { id: definition.id, modelId: source.modelId },
    job.runId,
  );
  update(job, {
    definitionId: definition.id,
    result: definition.rationale,
    status: "ready",
    completedAt: new Date().toISOString(),
  });
}
async function runArt(job: JobRecord) {
  const definition = store.get<Definition>("definitions", job.definitionId!);
  if (!definition) throw new Error("The card definition is unavailable.");
  const config = providers();
  const source = store.get<{ id: string; modelId: string }>(
    "card-sources",
    definition.id,
  );
  if (!source)
    throw new Error(
      "This card has no recorded original artwork reference. Generate a new candidate to capture it.",
    );
  const reference = await gameRequest<
    components["schemas"]["ArtReferenceSheet"]
  >("/cards/art-reference", "POST", { modelId: source.modelId });
  const directory = join(dataDir, "jobs", job.id);
  await mkdir(directory, { recursive: true });
  const sheetPath = join(directory, "card-art-reference.png");
  await Bun.write(sheetPath, Buffer.from(reference.pngBase64, "base64"));
  await Bun.write(
    join(directory, "art-reference.json"),
    JSON.stringify(
      {
        pool: reference.pool,
        modelIds: reference.modelIds,
        original: source.modelId,
        source:
          "Installed Slay the Spire 2 portraits, assembled by Voice Director. Local reference only.",
      },
      null,
      2,
    ),
  );
  const result = await Effect.runPromise(
    codexJob({
      id: job.id,
      schema: null,
      timeout: config.artTimeoutMs,
      model: config.model,
      images: [sheetPath],
      systemPrompt: promptInstructions("artwork"),
      prompt: JSON.stringify({ pool: reference.pool, card: definition.name, scene: definition.artPrompt }),
    }),
  );
  if (store.get<JobRecord>("jobs", job.id)?.status === "cancelled") return;
  const image = await artworkFile(job.id, JSON.parse(result.text).path);
  await Bun.write(join(dataDir, "jobs", job.id, "art.png"), image);
  await awaitOperation(
    await gameRequest<GameOperation>("/cards/art", "POST", {
      definitionId: job.definitionId,
      pngBase64: Buffer.from(image).toString("base64"),
    }),
  );
  update(job, {
    status: "succeeded",
    result: `/api/art/${job.definitionId}`,
    completedAt: new Date().toISOString(),
  });
}
function launch(job: JobRecord) {
  update(job, { status: "running" });
  const program = Effect.tryPromise({
    try: () => (job.kind === "card" ? runCard(job) : runArt(job)),
    catch: (error) => error,
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        if (store.get<JobRecord>("jobs", job.id)?.status !== "cancelled")
          update(job, {
            status: "failed",
            error: String(error),
            completedAt: new Date().toISOString(),
          });
      }),
    ),
    Effect.ensuring(Effect.sync(() => active.delete(job.id))),
  );
  active.set(job.id, Effect.runFork(program));
}
export function cancel(id: string) {
  const job = store.get<JobRecord>("jobs", id);
  if (!job || !["queued", "running"].includes(job.status))
    throw new Error("This job cannot be cancelled.");
  update(job, { status: "cancelled", completedAt: new Date().toISOString() });
  return job;
}
export function retry(id: string) {
  const job = store.get<JobRecord>("jobs", id);
  if (!job || job.status !== "failed")
    throw new Error("Only failed jobs can be retried.");
  update(job, { status: "queued", error: null, completedAt: null });
  return job;
}
let ticking = false;
export async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const [state, events, definitions] = await Promise.all([
      gameRequest<GameState>("/state"),
      gameRequest<GameEvent[]>("/events"),
      gameRequest<Definition[]>("/definitions"),
    ]);
    snapshot = state;
    connectionError = null;
    store.put(
      "snapshots",
      { ...state, id: state.runId || "menu" },
      state.runId,
    );
    for (const definition of definitions)
      store.put("definitions", definition, state.runId);
    if (!state.runId || !state.host || state.phase === "ended") return;
    for (const event of events) {
      if (store.get("events", event.id)) continue;
      store.put("events", event, event.runId);
      if (event.runId !== state.runId) continue;
      if (event.kind === "art-requested") queueArt(event);
      if (
        (event.kind === "transform-requested" ||
          event.kind === "lucky-requested") &&
        event.instanceId
      )
        enqueue(event.instanceId, event.kind === "lucky-requested", true);
      if (event.kind === "transformed")
        for (const job of store
          .all<JobRecord>("jobs", event.runId)
          .filter(
            (j) =>
              j.instanceId === event.instanceId &&
              j.definitionId === event.definitionId,
          ))
          update(job, { status: "applied" });
    }
    const jobs = store.all<JobRecord>("jobs", state.runId);
    for (const job of jobs.filter((j) => j.status === "ready" && j.immediate)) {
      if (state.phase !== "wildcard-acquired") {
        update(job, { immediate: false });
        continue;
      }
      try {
        await awaitOperation(
          await gameRequest<GameOperation>("/cards/transform", "POST", {
            runId: job.runId,
            instanceId: job.instanceId,
            definitionId: job.definitionId,
            requestId: job.id,
          }),
        );
        update(job, { status: "applied" });
      } catch (error) {
        update(job, { status: "failed", error: String(error) });
      }
    }
    for (const kind of ["card", "art"] as const) {
      if (
        [...active.keys()].some(
          (id) => store.get<JobRecord>("jobs", id)?.kind === kind,
        )
      )
        continue;
      const job = store
        .all<JobRecord>("jobs", state.runId)
        .reverse()
        .find((j) => j.kind === kind && j.status === "queued");
      if (job) launch(job);
    }
  } catch (error) {
    connectionError = String(error);
    snapshot = undefined;
  } finally {
    ticking = false;
  }
}
export function recoverJobs() {
  for (const job of store
    .all<JobRecord>("jobs")
    .filter((j) => j.kind === "card" && j.status === "ready")) {
    if (!store.get("card-sources", job.definitionId ?? ""))
      update(job, {
        status: "cancelled",
        result: "Replaced by the stronger card policy.",
        completedAt: new Date().toISOString(),
      });
  }
  for (const job of store
    .all<JobRecord>("jobs")
    .filter((j) => j.status === "running"))
    update(job, {
      status: "failed",
      error: "The companion stopped during this job. Retry when ready.",
      completedAt: new Date().toISOString(),
    });
}
