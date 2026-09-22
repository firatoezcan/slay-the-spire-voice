import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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
    for (const image of data.images ?? []) args.push("--image", image);
    if (data.schema) {
      const file = join(data.cwd, "schema.json");
      await Bun.write(file, JSON.stringify(data.schema));
      args.push("--output-schema", file);
    }
    args.push("-");
    const result = Bun.spawnSync(args, {
      env: {
        ...process.env,
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
        result.stderr.toString().slice(-2000) ||
          `Codex exited with ${result.exitCode}.`,
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
