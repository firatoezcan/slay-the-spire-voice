import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const dataDir = process.env.VOICE_DIRECTOR_DATA ?? join(homedir(), ".local/share/slay-the-spire-voice");
export const gameUrl = process.env.VOICE_DIRECTOR_GAME_URL ?? "http://127.0.0.1:57542";
export const port = Number(process.env.VOICE_DIRECTOR_PORT ?? 57543);
export const modelDir = join(dataDir, "models", "parakeet-tdt-0.6b-v3-int8");
await mkdir(dataDir, { recursive: true, mode: 0o700 });
const tokenPath = join(dataDir, "token");
try { await writeFile(tokenPath, crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", ""), { flag: "wx", mode: 0o600 }); }
catch (e) { if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; }
await chmod(tokenPath, 0o600);
export const token = (await readFile(tokenPath, "utf8")).trim();
const toolchainFile = Bun.file(join(dataDir, "toolchain.json"));
const toolchain = await toolchainFile.exists() ? await toolchainFile.json() as { codex: string } : null;
export const codexExecutable = process.env.VOICE_DIRECTOR_CODEX ?? toolchain?.codex ?? Bun.which("codex");
export const workerRoot = new URL("./providers/", import.meta.url);
export const workerExtension = import.meta.path.endsWith(".ts") ? ".ts" : ".js";
export const origins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`, "http://127.0.0.1:5173", "http://localhost:5173"]);
