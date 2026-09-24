import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./components/ui/button";
import { api, type Health } from "./data";
import type { Act } from "./App";

export function speechLabel(speech?: Health["speech"]) {
  if (!speech) return "Checking Parakeet…";
  if (speech.ready) return "Parakeet ready";
  if (speech.phase === "error") return "Speech setup needs attention";
  if (speech.phase === "downloading")
    return `Downloading Parakeet · ${Math.floor(speech.completedBytes / speech.totalBytes * 100)}%`;
  return "Preparing Parakeet…";
}

export function SpeechSetup({ speech, act }: { speech?: Health["speech"]; act: Act }) {
  const [retrying, setRetrying] = useState(false);
  const queryClient = useQueryClient();
  const preparing = speech && !speech.ready && speech.phase !== "error";
  return (
    <section className="speech-setup" aria-label="Speech model setup">
      <p className="speech-setup-status" role="status">{speechLabel(speech)}</p>
      <p className="help">Voice Director downloads Parakeet once (about 670 MB) and transcribes speech on this computer.</p>
      {preparing && (
        <div className="speech-download">
          <progress aria-label="Parakeet setup progress" max={speech.totalBytes}
            value={speech.phase === "downloading" ? speech.completedBytes : undefined} />
          <p className="help">{speech.phase === "downloading"
            ? `${Math.round(speech.completedBytes / 1_000_000)} of ${Math.round(speech.totalBytes / 1_000_000)} MB`
            : speech.phase === "copying" ? "Reusing the Parakeet files already on this computer."
              : "Checking the speech model files."}</p>
        </div>
      )}
      {speech?.phase === "error" && (
        <div className="speech-setup-error">
          <p role="alert">{speech.error ?? "Parakeet setup failed. Check your connection and retry."}</p>
          <Button type="button" variant="outline" disabled={retrying}
            onClick={() => act("Speech setup started", async () => {
              setRetrying(true);
              try { await api("/speech/setup", "POST"); await queryClient.invalidateQueries({ queryKey: ["health"] }); }
              finally { setRetrying(false); }
            }, "speech:setup")}>{retrying ? "Starting…" : "Retry speech setup"}</Button>
        </div>
      )}
      <p className="help">
        <a href="https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3" target="_blank" rel="noreferrer">Parakeet by NVIDIA</a>
        {" · "}<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>
        {" · "}<a href="https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8" target="_blank" rel="noreferrer">ONNX conversion by sherpa-onnx</a>
      </p>
    </section>
  );
}
