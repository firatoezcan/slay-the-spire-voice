import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { Subprocess } from "bun";
import { workerRoot, workerExtension } from "../config";

let worker: Subprocess | undefined;
let busy = false;
const pending = new Map<string, { resolve: (text: string) => void; reject: (e: Error) => void }>();
export async function speechStatus(modelDir: string) {
  const files = ["encoder.int8.onnx", "decoder.int8.onnx", "joiner.int8.onnx", "tokens.txt"];
  const missing = (await Promise.all(files.map(async name => { try { return (await stat(join(modelDir, name))).size > 0 ? null : name; } catch { return name; } }))).filter((name): name is string => name !== null);
  return { model: "Parakeet TDT 0.6B v3 int8", modelDir, ready: missing.length === 0, busy, missing };
}
export async function transcribe(samples: Float32Array, modelDir: string): Promise<string> {
  if (busy) throw new Error("Speech recognition is busy. Wait for the current utterance.");
  if (!(await speechStatus(modelDir)).ready) throw new Error("Parakeet model files are missing. Set the model directory in Settings.");
  if (samples.length < 1600 || samples.length > 16000 * 30 || samples.some(s => !Number.isFinite(s) || Math.abs(s) > 1)) throw new Error("Expected 0.1–30 seconds of normalized 16 kHz mono PCM.");
  if (!worker) {
    worker = Bun.spawn([process.execPath, new URL("speech-worker" + workerExtension, workerRoot).pathname], { stdout: "ignore", stderr: "pipe", serialization: "advanced", ipc(message: any) {
      const request = pending.get(message.id); if (!request) return;
      pending.delete(message.id); message.error ? request.reject(new Error(message.error)) : request.resolve(message.text);
    }, onExit() { worker = undefined; for (const request of pending.values()) request.reject(new Error("Speech worker stopped.")); pending.clear(); } });
  }
  busy = true;
  try {
    return await new Promise<string>((resolve, reject) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(() => { pending.delete(id); worker?.kill("SIGKILL"); worker = undefined; reject(new Error("Speech recognition timed out.")); }, 60000);
      pending.set(id, { resolve: text => { clearTimeout(timer); resolve(text); }, reject: error => { clearTimeout(timer); reject(error); } });
      worker!.send({ id, modelDir, audio: Array.from(samples) });
    });
  } finally { busy = false; }
}
export function stopSpeech() { worker?.kill("SIGKILL"); worker = undefined; }
