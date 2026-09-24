import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { modelDir } from "../config";

export type ModelFile = { name: string; bytes: number; sha256: string };
export const parakeet = {
  name: "Parakeet TDT 0.6B v3 int8",
  repository: "csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8",
  revision: "2bda32ec70b097a55adaa07d9a7173915b43cc78",
  files: [
    { name: "encoder.int8.onnx", bytes: 652184281, sha256: "acfc2b4456377e15d04f0243af540b7fe7c992f8d898d751cf134c3a55fd2247" },
    { name: "decoder.int8.onnx", bytes: 11845275, sha256: "179e50c43d1a9de79c8a24149a2f9bac6eb5981823f2a2ed88d655b24248db4e" },
    { name: "joiner.int8.onnx", bytes: 6355277, sha256: "3164c13fc2821009440d20fcb5fdc78bff28b4db2f8d0f0b329101719c0948b3" },
    { name: "tokens.txt", bytes: 93939, sha256: "d58544679ea4bc6ac563d1f545eb7d474bd6cfa467f0a6e2c1dc1c7d37e3c35d" },
  ] satisfies ModelFile[],
} as const;
type Progress = {
  phase: "checking" | "copying" | "downloading" | "ready" | "error";
  completedBytes: number; totalBytes: number; file: string | null; error: string | null;
};

async function matches(path: string, expected: ModelFile) {
  try {
    if ((await stat(path)).size !== expected.bytes) return false;
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest("hex") === expected.sha256;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

// A file becomes available only after its size and digest match the pinned model.
export async function installModelFiles(options: {
  directory: string; reuseDirectory?: string; baseUrl: string;
  files: readonly ModelFile[]; progress: (value: Progress) => void; signal?: AbortSignal;
}) {
  const { directory, files, progress, signal } = options;
  if (files.some(file => !/^[a-z0-9_.-]+$/i.test(file.name) || file.name === ".." ||
    !Number.isSafeInteger(file.bytes) || file.bytes <= 0 || !/^[a-f0-9]{64}$/.test(file.sha256)))
    throw new Error("Invalid speech model manifest.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  let completedBytes = 0;
  for (const file of files) {
    signal?.throwIfAborted();
    const destination = join(directory, file.name);
    const partial = destination + ".part";
    const report = (phase: Progress["phase"], current = 0) =>
      progress({ phase, completedBytes: completedBytes + current, totalBytes, file: file.name, error: null });
    report("checking");
    if (await matches(destination, file)) { completedBytes += file.bytes; continue; }
    try {
      const cached = options.reuseDirectory && join(options.reuseDirectory, file.name);
      if (cached && await matches(cached, file).catch(() => false)) {
        report("copying");
        await copyFile(cached, partial);
        if (!await matches(partial, file)) throw new Error("The cached speech model changed while copying. Retry setup.");
      } else {
        report("downloading");
        const abort = new AbortController();
        const downloadSignal = AbortSignal.any([abort.signal, AbortSignal.timeout(30 * 60 * 1000), ...(signal ? [signal] : [])]);
        try {
          const response = await fetch(options.baseUrl + "/" + file.name, { signal: downloadSignal });
          if (!response.ok || !response.body) throw new Error(`Speech model download failed (HTTP ${response.status}). Retry setup.`);
          const hash = createHash("sha256");
          let received = 0;
          await pipeline(
            Readable.fromWeb(response.body as unknown as Parameters<typeof Readable.fromWeb>[0]),
            new Transform({ transform(chunk: Buffer, _encoding, callback) {
              received += chunk.length;
              if (received > file.bytes) { callback(new Error("Speech model download exceeded its expected size.")); return; }
              hash.update(chunk); report("downloading", received); callback(null, chunk);
            } }),
            createWriteStream(partial, { mode: 0o600 }),
            { signal: downloadSignal },
          );
          if (received !== file.bytes || hash.digest("hex") !== file.sha256)
            throw new Error("Speech model download was incomplete or damaged. Retry setup.");
        } finally { abort.abort(); }
      }
      signal?.throwIfAborted();
      await rename(partial, destination);
      completedBytes += file.bytes;
    } finally { await rm(partial, { force: true }); }
  }
  progress({ phase: "ready", completedBytes, totalBytes, file: null, error: null });
}

let state: Progress = { phase: "checking", completedBytes: 0,
  totalBytes: parakeet.files.reduce((sum, file) => sum + file.bytes, 0), file: null, error: null };
let active: Promise<void> | undefined;
let controller: AbortController | undefined;
export const modelStatus = () => ({ ...state, model: parakeet.name, modelDir, ready: state.phase === "ready" });
export function prepareSpeechModel(): Promise<void> {
  if (active) return active;
  if (state.phase === "ready") return Promise.resolve();
  state = { ...state, phase: "checking", completedBytes: 0, file: null, error: null };
  controller = new AbortController();
  active = installModelFiles({
    directory: modelDir,
    // Reuse the user's existing Parakeet download once; Voice Director owns its installed copy.
    reuseDirectory: join(homedir(), ".omp/agent/cache/tiny-models", parakeet.repository),
    baseUrl: `https://huggingface.co/${parakeet.repository}/resolve/${parakeet.revision}`,
    files: parakeet.files, signal: controller.signal, progress: value => { state = value; },
  }).catch(error => {
    const code = (error as NodeJS.ErrnoException).code;
    state = { ...state, phase: "error", error: code === "ENOSPC" ? "Not enough disk space for Parakeet. Free about 700 MB and retry setup."
      : code === "EACCES" ? "Voice Director cannot write its speech model files. Check access to its data folder and retry setup."
      : error instanceof Error ? error.message : String(error) };
    throw error;
  }).finally(() => { active = undefined; controller = undefined; });
  return active;
}
export function startSpeechSetup() { void prepareSpeechModel().catch(() => {}); }
export function stopSpeechSetup() { controller?.abort(); }
