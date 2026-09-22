import { Database } from "bun:sqlite";
import { join } from "node:path";
import { dataDir } from "./config";

export type Collection = "jobs" | "transcripts" | "events" | "decisions" | "definitions" | "settings" | "snapshots" | "card-sources" | "card-reviews";
export const db = new Database(join(dataDir, "director.sqlite"), { create: true });
db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, run_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(collection,id)); CREATE INDEX IF NOT EXISTS records_run ON records(collection,run_id,updated_at);");
const upsert = db.query("INSERT INTO records VALUES(?,?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET run_id=excluded.run_id,payload=excluded.payload,updated_at=excluded.updated_at");
export const store = {
  put<T extends { id: string }>(collection: Collection, value: T, runId = "") { upsert.run(collection, value.id, runId, JSON.stringify(value), new Date().toISOString()); return value; },
  get<T>(collection: Collection, id: string): T | undefined { const row = db.query("SELECT payload FROM records WHERE collection=? AND id=?").get(collection, id) as { payload: string } | null; return row ? JSON.parse(row.payload) : undefined; },
  all<T>(collection: Collection, runId?: string): T[] { const rows = runId === undefined ? db.query("SELECT payload FROM records WHERE collection=? ORDER BY updated_at DESC").all(collection) : db.query("SELECT payload FROM records WHERE collection=? AND run_id=? ORDER BY updated_at DESC").all(collection, runId); return (rows as { payload: string }[]).map(r => JSON.parse(r.payload)); },
};
