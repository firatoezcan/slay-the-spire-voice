import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { classifierEnvironment, classifierProfile, type ReasoningEffort } from "./codex-profile";

declare var self: Worker;
self.onmessage = async ({
  data,
}: MessageEvent<{
  executable: string | null;
  cwd: string;
  prompt: string;
  schema: unknown | null;
  timeout: number;
  model: string;
  images?: string[];
  systemPrompt?: string;
  reasoningEffort?: ReasoningEffort;
}>) => {
  try {
    await mkdir(data.cwd, { recursive: true });
    const output = join(data.cwd, "result.json");
    if (!data.executable)
      throw new Error(
        "Codex was not found. Run the mod installer from a terminal where codex is available.",
      );
    const args = [
      data.executable,
      ...(data.systemPrompt ? ["--no-daemon"] : []),
      "exec",
      "--ignore-user-config",
      "--ignore-rules",
      "--ephemeral",
      "--skip-git-repo-check",
      "--json",
      "--sandbox",
      data.schema ? "read-only" : "workspace-write",
      "--cd",
      data.cwd,
      "--output-last-message",
      output,
    ];
    if (data.model) args.push("--model", data.model);
    if (data.systemPrompt) {
      const instructions = join(data.cwd, "system.md");
      await Bun.write(instructions, data.systemPrompt);
      if (data.schema) {
        if (data.images?.length) throw new Error("Structured generation does not accept images.");
        args.push(...classifierProfile(instructions, data.reasoningEffort ?? "xhigh"));
      } else {
        // Artwork keeps image generation and file output available.
        args.push("-c", `model_instructions_file=${JSON.stringify(instructions)}`,
          "-c", `model_reasoning_effort=${JSON.stringify(data.reasoningEffort ?? "xhigh")}`,
          "-c", "project_doc_max_bytes=0", "-c", "skills.max_context_tokens=1");
      }
    } else if (data.reasoningEffort) {
      args.push("-c", `model_reasoning_effort=${JSON.stringify(data.reasoningEffort)}`);
    }
    for (const image of data.images ?? []) args.push("--image", image);
    if (data.schema) {
      const file = join(data.cwd, "schema.json");
      await Bun.write(file, JSON.stringify(data.schema));
      args.push("--output-schema", file);
    }
    args.push("-");
    const result = Bun.spawnSync(args, {
      env: {
        ...(data.systemPrompt ? classifierEnvironment(process.env) : process.env),
        PATH: `${dirname(data.executable)}:${process.env.PATH ?? ""}`,
      },
      stdin: new TextEncoder().encode(data.prompt),
      stdout: "pipe",
      stderr: "pipe",
      timeout: data.timeout,
      maxBuffer: 8 * 1024 * 1024,
    });
    await Bun.write(join(data.cwd, "events.jsonl"), result.stdout);
    await Bun.write(join(data.cwd, "stderr.log"), result.stderr);
    if (result.exitCode !== 0)
      throw new Error(
        result.stderr.toString().slice(-2000) || `Codex exited with ${result.exitCode}.`,
      );
    self.postMessage({
      ok: true,
      text: await readFile(output, "utf8"),
      events: result.stdout.toString(),
    });
  } catch (e) {
    self.postMessage({ ok: false, error: String(e) });
  }
};
