import { Effect } from "effect";
import { join, resolve, relative } from "node:path";
import { realpath } from "node:fs/promises";
import type { ReasoningEffort } from "./codex-profile";
import {
  codexExecutable,
  dataDir,
  workerRoot,
  workerExtension,
} from "../config";

export function codexJob(input: {
  id: string;
  prompt: string;
  schema: unknown | null;
  timeout: number;
  model: string;
  images?: string[];
  systemPrompt?: string;
  reasoningEffort?: ReasoningEffort;
}) {
  return Effect.async<{ text: string; events: string }, Error>((resume) => {
    const worker = new Worker(
      new URL("codex-worker" + workerExtension, workerRoot).href,
    );
    const timer = setTimeout(() => {
      worker.terminate();
      resume(Effect.fail(new Error("Codex job exceeded its deadline.")));
    }, input.timeout + 5000);
    worker.onmessage = (event) => {
      clearTimeout(timer);
      worker.terminate();
      const data = event.data;
      resume(
        data.ok ? Effect.succeed(data) : Effect.fail(new Error(data.error)),
      );
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      resume(Effect.fail(new Error(event.message)));
    };
    worker.postMessage({
      ...input,
      executable: codexExecutable,
      cwd: join(dataDir, "jobs", input.id),
    });
    return Effect.sync(() => {
      clearTimeout(timer);
      worker.terminate();
    });
  });
}
export async function artworkFile(id: string, path: string) {
  const directory = await realpath(join(dataDir, "jobs", id));
  const file = await realpath(resolve(directory, path));
  if (relative(directory, file).startsWith(".."))
    throw new Error("Artwork must be inside this job's directory.");
  const bytes = await Bun.file(file).bytes();
  if (
    bytes.length > 16 * 1024 * 1024 ||
    !Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  )
    throw new Error("Expected a PNG smaller than 16 MiB.");
  return bytes;
}
