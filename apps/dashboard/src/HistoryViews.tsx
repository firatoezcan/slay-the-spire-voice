import { useRef, useState, useEffect } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { Mic, Square, ArrowUpRight, RotateCcw, X } from "lucide-react";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { forRun, api, refresh, time, type Health } from "./data";
import { recordUtterance } from "./voice";
import type { Act, Pending } from "./App";

export function VoiceInput({
  act,
  pending,
  canRecord = true,
}: {
  act: Act;
  pending: boolean;
  canRecord?: boolean;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("Ready to record");
  const [recording, setRecording] = useState(false);
  const capture = useRef<Awaited<ReturnType<typeof recordUtterance>> | null>(
    null,
  );
  useEffect(
    () => () => {
      void capture.current?.cancel();
    },
    [],
  );
  async function toggle() {
    if (recording) {
      setRecording(false);
      await capture.current?.stop();
      capture.current = null;
      return;
    }
    try {
      capture.current = await recordUtterance(
        (value) => {
          setStatus(value);
          if (value !== "Recording…") setRecording(false);
        },
        async (samples) => {
          await api("/voice/utterances", "POST", { samples });
          await refresh("transcripts");
        },
      );
      setRecording(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <form
      className="voice-input"
      onSubmit={(event) => {
        event.preventDefault();
        act(
          "Idea added",
          async () => {
            await api("/inspiration", "POST", {
              text: text.trim(),
              source: "manual",
            });
            setText("");
            await refresh("transcripts");
          },
          "idea",
        );
      }}
    >
      <label className="sr-only" htmlFor="inspiration">
        Idea for the director
      </label>
      <Textarea
        id="inspiration"
        value={text}
        maxLength={4000}
        placeholder="A stubborn knight who turns pain into a shield…"
        onChange={(event) => setText(event.target.value)}
      />
      <div className="voice-input-actions">
        <div>
          <Button
            type="button"
            variant={recording ? "destructive" : "outline"}
            disabled={!canRecord || status === "Transcribing…"}
            onClick={() => void toggle()}
          >
            {recording ? <Square size={15} /> : <Mic size={15} />}{" "}
            {recording ? "Stop recording" : "Record"}
          </Button>
          <span role="status">{status}</span>
        </div>
        <Button type="submit" disabled={pending || !text.trim()}>
          Add idea <ArrowUpRight size={15} />
        </Button>
      </div>
      <p className="help">
        Recording stops after 29 seconds. Audio stays on this computer;
        transcripts can be sent to Codex with card requests.
      </p>
    </form>
  );
}

export function VoiceView({
  act,
  pending,
  health,
  runId,
}: {
  act: Act;
  pending: boolean;
  health?: Health;
  runId: string;
}) {
  const { transcripts } = forRun(runId);
  const { data: entries = [] } = useLiveQuery({
    query: (q) =>
      q
        .from({ transcript: transcripts })
        .orderBy(({ transcript }) => transcript.createdAt, "desc"),
  });
  return (
    <div className="reading-layout">
      <section>
        <div className="section-heading">
          <h2>Speech and ideas</h2>
          <span className="state-label">
            {health?.speech.ready ? "Parakeet ready" : "Model unavailable"}
          </span>
        </div>
        <VoiceInput
          act={act}
          pending={pending}
          canRecord={health?.speech.ready}
        />
        <h2 className="section-break">This run</h2>
        {entries.length ? (
          <ol className="transcript-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <div>
                  <span>{entry.source}</span>
                  <time>{time(entry.createdAt)}</time>
                </div>
                <p>{entry.text}</p>
                {entry.mood && <small>Mood: {entry.mood}</small>}
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty">Record speech or add an idea to begin.</div>
        )}
      </section>
      <aside className="notes">
        <h2>What gets used</h2>
        <p>
          The director includes recent transcripts when preparing a card. Speech
          gives it a theme; the draw rules decide when a card can change.
        </p>
        <h3>External input</h3>
        <p>
          Send chat, TTS, or a mood through <code>POST /api/inspiration</code>{" "}
          with your local token.
        </p>
        <a href="/openapi" target="_blank" rel="noreferrer">
          Open the API reference <ArrowUpRight size={14} />
        </a>
      </aside>
    </div>
  );
}

export function JobsView({
  act,
  pending,
  runId,
}: {
  act: Act;
  pending: Pending;
  runId: string;
}) {
  const { jobs } = forRun(runId);
  const { data: entries = [] } = useLiveQuery({
    query: (q) =>
      q.from({ job: jobs }).orderBy(({ job }) => job.createdAt, "desc"),
  });
  const [filter, setFilter] = useState("all");
  const visible = entries.filter(
    (job) =>
      filter === "all" ||
      (filter === "failed"
        ? job.status === "failed"
        : ["queued", "running", "ready"].includes(job.status)),
  );
  return (
    <section>
      <div className="filter-tabs">
        {["all", "active", "failed"].map((value) => (
          <button
            key={value}
            aria-pressed={filter === value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {value === "all"
              ? "All jobs"
              : value === "active"
                ? "Active"
                : "Failed"}
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="job-list">
          {visible.map((job) => (
            <article key={job.id}>
              <div className="job-heading">
                <div>
                  <h2>
                    {job.kind === "art"
                      ? "Card artwork"
                      : job.lucky
                        ? "Lucky transformation"
                        : "Card transformation"}
                  </h2>
                  <p>
                    {time(job.createdAt)}
                    {job.completedAt
                      ? ` · ${Math.round((+new Date(job.completedAt) - +new Date(job.createdAt)) / 1000)}s`
                      : ""}
                  </p>
                </div>
                <span
                  className={`state-label ${job.status === "failed" ? "failed" : ""}`}
                >
                  {job.status}
                </span>
              </div>
              {job.error && <p className="job-error">{job.error}</p>}
              {job.result && job.kind === "card" && <p>{job.result}</p>}
              {job.kind === "art" && job.status === "succeeded" && (
                <img
                  className="job-art"
                  src={`/api/art/${job.definitionId}`}
                  alt="Generated card artwork"
                />
              )}
              <div className="job-actions">
                {job.status === "failed" && (
                  <Button
                    variant="outline"
                    disabled={pending(`job:${job.id}`)}
                    onClick={() =>
                      act(
                        "Job queued again",
                        async () => {
                          await api(`/jobs/${job.id}/retry`, "POST");
                          await refresh("jobs");
                        },
                        `job:${job.id}`,
                      )
                    }
                  >
                    <RotateCcw size={14} />
                    Retry
                  </Button>
                )}
                {["queued", "running"].includes(job.status) && (
                  <Button
                    variant="outline"
                    disabled={pending(`job:${job.id}`)}
                    onClick={() =>
                      act(
                        "Job cancelled",
                        async () => {
                          await api(`/jobs/${job.id}/cancel`, "POST");
                          await refresh("jobs");
                        },
                        `job:${job.id}`,
                      )
                    }
                  >
                    <X size={14} />
                    Cancel
                  </Button>
                )}
                <details>
                  <summary>Details</summary>
                  <dl>
                    <dt>Card instance</dt>
                    <dd>
                      <code>{job.instanceId}</code>
                    </dd>
                    <dt>Job</dt>
                    <dd>
                      <code>{job.id}</code>
                    </dd>
                    {job.definitionId && (
                      <>
                        <dt>Definition</dt>
                        <dd>
                          <code>{job.definitionId}</code>
                        </dd>
                      </>
                    )}
                  </dl>
                </details>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          {filter === "failed"
            ? "No failed jobs in this run."
            : "Jobs appear when a card or its artwork is requested."}
        </div>
      )}
    </section>
  );
}

export function EventsView({ runId }: { runId: string }) {
  const { events } = forRun(runId);
  const { data: entries = [] } = useLiveQuery({
    query: (q) =>
      q.from({ event: events }).orderBy(({ event }) => event.at, "desc"),
  });
  return entries.length ? (
    <ol className="event-list">
      {entries.map((event) => (
        <li key={event.id}>
          <time>{time(event.at)}</time>
          <div>
            <h2>{event.kind.replaceAll("-", " ")}</h2>
            <p>{event.message}</p>
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <div className="empty">Card decisions will appear here during the run.</div>
  );
}
