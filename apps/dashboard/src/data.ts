import { createCollection, createOptimisticAction } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { QueryClient } from "@tanstack/react-query";
import type { components } from "../../../packages/contracts/src/game";
import type {
  JobRecord,
  ProviderConfig,
  TranscriptRecord,
  AmbientDecisionRecord,
} from "../../companion/src/schema";

export type State = components["schemas"]["GameSnapshot"];
export type Card = components["schemas"]["CardInstance"];
export type Definition = components["schemas"]["CardDefinition"];
export type Event = components["schemas"]["GameEvent"];
export type Operation = components["schemas"]["Operation"];
export type Settings = components["schemas"]["DirectorSettings"];
export type { JobRecord, ProviderConfig, TranscriptRecord };
export type Health = {
  game: boolean;
  error: string | null;
  speech: {
    ready: boolean;
    busy: boolean;
    model: string;
    modelDir: string;
    missing: string[];
  };
};
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 600 } },
});

export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const content = await response.text();
  let result;
  try {
    result = JSON.parse(content);
  } catch {
    throw new Error(
      `The companion returned an invalid response (${response.status}). Check its log and restart it.`,
    );
  }
  if (!response.ok)
    throw new Error(result.error ?? `Request failed (${response.status}).`);
  return result as T;
}
export async function connect(token: string) {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok)
    throw new Error(
      "The local token was rejected. Open the dashboard from the launcher.",
    );
  await refresh();
}
let sessionPromise: Promise<unknown> | undefined;
export function restoreSession() {
  if (!sessionPromise) {
    const localToken = new URLSearchParams(location.hash.slice(1)).get("token");
    if (localToken)
      history.replaceState(null, "", location.pathname + location.search);
    sessionPromise = localToken ? connect(localToken) : api("/health");
  }
  return sessionPromise;
}
export const refresh = (...keys: string[]) =>
  Promise.all(
    (keys.length ? keys : ["state"]).map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
export async function command(path: string, body: unknown, method = "POST") {
  const result = await api<Operation>("/game" + path, method, body);
  if (result?.id && result.status) {
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const operation = (await api<Operation[]>("/game/operations")).find(
        (o) => o.id === result.id,
      );
      if (operation?.status === "failed")
        throw new Error(operation.error ?? "The game refused this action.");
      if (operation && ["succeeded", "dispatched"].includes(operation.status)) {
        await refresh();
        return operation;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error(
      "The game has not confirmed this action. Check the operation log before retrying.",
    );
  }
  await refresh();
  return result;
}
const polling = {
  refetchInterval: () => (document.hidden ? (false as const) : 1000),
  retry: false as const,
};
const stateQuery = {
  queryKey: ["state"],
  queryFn: () => api<State | null>("/game/state").catch(() => null),
  queryClient,
  ...polling,
};
export const states = createCollection(
  queryCollectionOptions({
    ...stateQuery,
    select: (data) => (data ? [{ ...data, id: "current" }] : []),
    getKey: (s) => s.id,
    id: "current-state",
  }),
);
export const cards = createCollection(
  queryCollectionOptions({
    ...stateQuery,
    select: (data) =>
      data?.cards.map((card) => ({
        ...card,
        rowId: `${card.pile}:${card.id}`,
        runId: data.runId,
      })) ?? [],
    getKey: (c) => c.rowId,
    id: "current-cards",
  }),
);
export const definitions = createCollection(
  queryCollectionOptions({
    queryKey: ["definitions"],
    queryFn: () => api<Definition[]>("/definitions"),
    queryClient,
    getKey: (d) => d.id,
    ...polling,
  }),
);
function runCollection<T extends { id: string }>(kind: string, runId: string) {
  return createCollection(
    queryCollectionOptions({
      id: `${kind}:${runId}`,
      queryKey: [kind, runId],
      queryClient,
      queryFn: () =>
        runId
          ? api<T[]>(`/${kind}?runId=${encodeURIComponent(runId)}`)
          : Promise.resolve([] as T[]),
      getKey: (item) => item.id,
      ...polling,
    }),
  );
}
function createRunCollections(runId: string) {
  return {
    jobs: runCollection<JobRecord>("jobs", runId),
    transcripts: runCollection<TranscriptRecord>("transcripts", runId),
    events: runCollection<Event>("events", runId),
    decisions: runCollection<AmbientDecisionRecord>("decisions", runId),
  };
}
const runCollections = new Map<
  string,
  ReturnType<typeof createRunCollections>
>();
export function forRun(runId: string) {
  let collections = runCollections.get(runId);
  if (!collections) {
    collections = createRunCollections(runId);
    runCollections.set(runId, collections);
  }
  return collections;
}

const writes = new Map<string, Promise<unknown>>();
function inOrder<T>(key: string, work: () => Promise<T>): Promise<T> {
  const result = (writes.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(work);
  writes.set(key, result);
  void result
    .finally(() => {
      if (writes.get(key) === result) writes.delete(key);
    })
    .catch(() => {});
  return result;
}
const changeSettings = createOptimisticAction<Partial<Settings>>({
  onMutate: (changes) => {
    states.update("current", (draft) => {
      Object.assign(draft.settings, changes);
    });
  },
  mutationFn: async (_, { transaction }) =>
    inOrder("settings", async () => {
      const state = transaction.mutations[0]!.modified as State;
      await api("/game/settings", "PUT", state.settings);
      await states.utils.refetch({ throwOnError: true });
    }),
});
export const saveSettings = (changes: Partial<Settings>) =>
  changeSettings(changes).isPersisted.promise;

export const plain = (text: string) => text.replace(/\[\/?[^\]]+\]/g, "");
export const time = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
