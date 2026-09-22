import createClient from "openapi-fetch";
import type { paths, components } from "../../../packages/contracts/src/game";
import { gameUrl, token } from "./config";

export type GameState = components["schemas"]["GameSnapshot"];
export type Definition = components["schemas"]["CardDefinition"];
export type GameOperation = components["schemas"]["Operation"];
export type GameEvent = components["schemas"]["GameEvent"];
export const game = createClient<paths>({ baseUrl: gameUrl, headers: { Authorization: `Bearer ${token}` } });
export async function gameRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(gameUrl + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Game API ${response.status}: ${(await response.text()).slice(0,500)}`);
  return response.json() as Promise<T>;
}
export async function awaitOperation(operation: GameOperation): Promise<GameOperation> {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const current = (await gameRequest<GameOperation[]>("/operations")).find(o => o.id === operation.id);
    if (current?.status === "failed") throw new Error(current.error ?? "Game operation failed.");
    if (current?.status === "succeeded" || current?.status === "dispatched") return current;
    await Bun.sleep(100);
  }
  throw new Error("The game has not confirmed this operation yet.");
}
