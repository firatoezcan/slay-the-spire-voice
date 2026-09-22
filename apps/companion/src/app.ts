import { Elysia, t } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { staticPlugin } from "@elysiajs/static";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { dataDir, origins, port, token } from "./config";
import { store } from "./store";
import {
  currentState,
  providers,
  inspiration,
  enqueue,
  cancel,
  retry,
} from "./jobs";
import { gameRequest, type GameState } from "./game";
import { speechStatus, transcribe } from "./providers/speech";
import {
  Inspiration,
  Generate,
  Job,
  Transcript,
  ProviderSettings,
  Health,
  type JobRecord,
} from "./schema";
import gameSpec from "../../../packages/contracts/schema/game.openapi.json";

// Adapt the producer's OpenAPI 3 schemas for Elysia's JSON Schema validator.
function runtimeSchema(source: any): any {
  if (source.$ref)
    return runtimeSchema(
      (gameSpec.components.schemas as any)[source.$ref.split("/").at(-1)],
    );
  const options = Object.fromEntries(
    Object.entries(source).filter(([key]) =>
      [
        "minimum",
        "maximum",
        "minLength",
        "maxLength",
        "pattern",
        "minItems",
        "maxItems",
        "description",
        "additionalProperties",
      ].includes(key),
    ),
  );
  let result;
  if (source.enum)
    result = t.Union(source.enum.map((value: any) => t.Literal(value)));
  else if (source.anyOf || source.oneOf)
    result = t.Union((source.anyOf ?? source.oneOf).map(runtimeSchema));
  else if (Array.isArray(source.type))
    result = t.Union(
      source.type.map((type: string) => runtimeSchema({ ...source, type })),
    );
  else
    switch (source.type) {
      case "object":
        result = t.Object(
          Object.fromEntries(
            Object.entries(source.properties ?? {}).map(([key, value]) => {
              const property = runtimeSchema(value);
              return [
                key,
                source.required?.includes(key)
                  ? property
                  : t.Optional(property),
              ];
            }),
          ),
          options,
        );
        break;
      case "array":
        result = t.Array(runtimeSchema(source.items), options);
        break;
      case "integer":
        result = t.Integer(options);
        break;
      case "number":
        result = t.Number(options);
        break;
      case "boolean":
        result = t.Boolean(options);
        break;
      case "string":
        result = t.String(options);
        break;
      case "null":
        result = t.Null();
        break;
      default:
        throw new Error(
          `Unsupported contract schema: ${JSON.stringify(source)}`,
        );
    }
  return source.nullable ? t.Union([result, t.Null()]) : result;
}
export const app = new Elysia({
  name: "voice-director",
  serve: { maxRequestBodySize: 24 * 1024 * 1024 },
})
  .onRequest(({ request, set }) => {
    const origin = request.headers.get("origin");
    if (origin && !origins.has(origin)) {
      set.status = 403;
      return { error: "This browser origin is not allowed." };
    }
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/api/")) return;
    const bearer = request.headers.get("authorization");
    const cookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("voice_session="))
      ?.slice(14);
    if (bearer !== `Bearer ${token}` && cookie !== token) {
      set.status = 401;
      return {
        error:
          "Open the dashboard with the local launcher, or supply the API token.",
      };
    }
  })
  .onError(({ error, set, code }) => {
    set.status = code === "VALIDATION" ? 422 : code === "NOT_FOUND" ? 404 : 400;
    return { error: error instanceof Error ? error.message : String(error) };
  })
  .use(
    openapi({
      path: "/openapi",
      documentation: {
        info: {
          title: "Voice Director",
          version: "0.1.0",
          description: "Local controls for the Slay the Spire 2 voice mod.",
        },
        components: {
          securitySchemes: { localToken: { type: "http", scheme: "bearer" } },
        },
        security: [{ localToken: [] }],
      },
    }),
  )
  .post(
    "/api/session",
    ({ cookie }) => {
      cookie.voice_session!.set({
        value: token,
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      });
      return { ok: true };
    },
    {
      response: t.Object({ ok: t.Boolean() }),
      detail: { operationId: "createSession", tags: ["Connection"] },
    },
  )
  .get(
    "/api/health",
    async () => ({
      id: "health" as const,
      game: currentState().error === null,
      error: currentState().error,
      speech: await speechStatus(providers().modelDir),
    }),
    { response: Health, detail: { operationId: "getHealth", tags: ["Connection"] } },
  )
  .get("/api/state", () => currentState().snapshot ?? null, {
    response: t.Union([
      t.Unsafe(runtimeSchema(gameSpec.components.schemas.GameSnapshot)),
      t.Null(),
    ]),
    detail: { operationId: "getState", tags: ["Game"] },
  })
  .get("/api/runs", () => store.all<GameState & { id: string }>("snapshots"), {
    response: t.Array(t.Object({ ...runtimeSchema(gameSpec.components.schemas.GameSnapshot).properties, id: t.String() })),
    detail: { operationId: "listRuns", tags: ["Game"] },
  })
  .get("/api/jobs", ({ query }) => store.all("jobs", query.runId), {
    query: t.Object({ runId: t.Optional(t.String()) }),
    response: t.Array(Job),
    detail: { operationId: "listJobs", tags: ["Generation"] },
  })
  .post(
    "/api/jobs",
    ({ body }) => enqueue(body.instanceId, body.lucky, body.immediate),
    {
      body: Generate,
      response: Job,
      detail: { operationId: "createCardJob", tags: ["Generation"] },
    },
  )
  .post("/api/jobs/:id/cancel", ({ params }) => cancel(params.id), {
    response: Job,
    detail: { operationId: "cancelJob", tags: ["Generation"] },
  })
  .post("/api/jobs/:id/retry", ({ params }) => retry(params.id), {
    response: Job,
    detail: { operationId: "retryJob", tags: ["Generation"] },
  })
  .get(
    "/api/transcripts",
    ({ query }) => store.all("transcripts", query.runId),
    {
      query: t.Object({ runId: t.Optional(t.String()) }),
      response: t.Array(Transcript),
      detail: { operationId: "listTranscripts", tags: ["Voice"] },
    },
  )
  .post("/api/inspiration", ({ body }) => inspiration(body), {
    body: Inspiration,
    response: Transcript,
    detail: { operationId: "addInspiration", tags: ["Voice"] },
  })
  .post(
    "/api/voice/utterances",
    async ({ body }) => {
      const text = await transcribe(
        new Float32Array(body.samples),
        providers().modelDir,
      );
      return text.trim() ? inspiration({ text, source: "microphone" }) : null;
    },
    {
      body: t.Object({
        samples: t.Array(t.Number({ minimum: -1, maximum: 1 }), {
          minItems: 1600,
          maxItems: 480000,
        }),
      }),
      response: t.Union([Transcript, t.Null()]),
      detail: { operationId: "transcribeUtterance", tags: ["Voice"] },
    },
  )
  .get("/api/events", ({ query }) => store.all("events", query.runId), {
    query: t.Object({ runId: t.Optional(t.String()) }),
    response: t.Array(
      t.Unsafe(runtimeSchema(gameSpec.components.schemas.GameEvent)),
    ),
    detail: { operationId: "listEvents", tags: ["Director"] },
  })
  .get("/api/definitions", () => store.all("definitions"), {
    response: t.Array(
      t.Unsafe(runtimeSchema(gameSpec.components.schemas.CardDefinition)),
    ),
    detail: { operationId: "listDefinitions", tags: ["Cards"] },
  })
  .get("/api/provider", providers, {
    response: ProviderSettings,
    detail: { operationId: "getProviderSettings", tags: ["Settings"] },
  })
  .put("/api/provider", ({ body }) => store.put("settings", body), {
    body: ProviderSettings,
    response: ProviderSettings,
    detail: { operationId: "setProviderSettings", tags: ["Settings"] },
  })
  .get(
    "/api/art/:id",
    ({ params, set }) => {
      if (!/^[a-z0-9_]{8,64}$/.test(params.id)) {
        set.status = 400;
        return { error: "Invalid definition ID." };
      }
      const job = store
        .all<JobRecord>("jobs")
        .find(
          (j) =>
            j.kind === "art" &&
            j.definitionId === params.id &&
            j.status === "succeeded",
        );
      if (!job) {
        set.status = 404;
        return { error: "Artwork is not ready." };
      }
      return Bun.file(join(dataDir, "jobs", job.id, "art.png"));
    },
    { detail: { operationId: "getArtwork", tags: ["Cards"] } },
  );

for (const [path, methods] of Object.entries(gameSpec.paths)) {
  for (const [method, spec] of Object.entries(methods)) {
    const operation = spec as any;
    const body = operation.requestBody?.content?.["application/json"]?.schema;
    const response =
      operation.responses?.["200"]?.content?.["application/json"]?.schema;
    app.route(
      method.toUpperCase() as any,
      "/api/game" + path,
      ({ body: data }) =>
        gameRequest(path, method.toUpperCase(), body ? data : undefined),
      {
        ...(body ? { body: t.Unsafe(runtimeSchema(body)) } : {}),
        ...(response ? { response: t.Unsafe(runtimeSchema(response)) } : {}),
        detail: {
          operationId: operation.operationId,
          tags: [path.startsWith("/console") ? "Console" : "Game controls"],
        },
      },
    );
  }
}
const dashboard = new URL("../../dashboard/dist", import.meta.url).pathname;
if (existsSync(dashboard))
  app.use(staticPlugin({ assets: dashboard, prefix: "/", alwaysStatic: true }));
else
  app.get(
    "/",
    () =>
      new Response(
        "Run `bun run web` to open the React dashboard during development.",
        { headers: { "Content-Type": "text/plain" } },
      ),
  );
export function listen() {
  app.listen({ hostname: "127.0.0.1", port });
}
