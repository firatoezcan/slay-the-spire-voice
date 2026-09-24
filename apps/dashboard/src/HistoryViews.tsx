import { useState } from "react";
import { SpeechSetup, speechLabel } from "./SpeechSetup";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "@tanstack/react-db";
import { ArrowUpRight, RotateCcw, X } from "lucide-react";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { forRun, api, refresh, time, type Health } from "./data";
import { Switch } from "./components/ui/switch";
import type { components } from "../../../packages/contracts/src/game";
import type { Act, Pending } from "./App";
import type { AmbientDecisionRecord, TranscriptRecord } from "../../companion/src/schema";

export function VoiceInput({
  act,
  pending,
}: {
  act: Act;
  pending: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className="voice-input"
      onSubmit={(event) => {
        event.preventDefault();
        act(
          "Conversation added",
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
        Add to the conversation
      </label>
      <Textarea
        id="inspiration"
        value={text}
        maxLength={4000}
        placeholder="We brought five shields to a fistfight."
        onChange={(event) => setText(event.target.value)}
      />
      <div className="voice-input-actions">
        <Button type="submit" disabled={pending || !text.trim()}>
          Add conversation <ArrowUpRight size={15} />
        </Button>
      </div>
      <p className="help">
        Add a line to the same conversation the director hears.
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
  const { transcripts, decisions } = forRun(runId);
  const voice = useQuery({ queryKey: ["microphone"], queryFn: () => api<components["schemas"]["VoiceStatus"]>("/game/voice"), refetchInterval: 1000, retry: false });
  const [changingMicrophone, setChangingMicrophone] = useState(false);
  const { data: judgments = [] } = useLiveQuery({ query: q => q.from({ decision: decisions }).orderBy(({ decision }) => decision.at, "desc") });
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
          <h2>Conversation</h2>
          <span className="state-label">
            {speechLabel(health?.speech)}
          </span>
        </div>
        <label className="switch-line" htmlFor="ambient-microphone">
          <span>Use my microphone<small>{voice.isError ? "Open the game to change this setting" : voice.data?.listening ? "Listening during this run" : voice.data?.enabled ? "Waiting for a run" : "Microphone off"}</small></span>
          <Switch id="ambient-microphone" checked={voice.data?.enabled ?? false} disabled={!voice.data || voice.isError || changingMicrophone}
            onCheckedChange={enabled => act("Microphone setting saved", async () => {
              setChangingMicrophone(true);
              try { await api("/game/voice", "PUT", { enabled }); await voice.refetch(); }
              finally { setChangingMicrophone(false); }
            })} />
        </label>
        {voice.data?.error && <p role="alert">{voice.data.error}. Check Steam microphone settings, then switch the microphone off and on.</p>}
        <p className="help">Each player enables their microphone in the game's Sound settings. Audio goes to the host for local transcription. Recent conversation is sent to Codex for classification.</p>
        {health?.speech && !health.speech.ready && <SpeechSetup speech={health.speech} act={act} />}
        <VoiceInput act={act} pending={pending} />
        <h2 className="section-break">This run</h2>
        {entries.length ? (
          <ol className="transcript-list conversation-list">
            {entries.map((entry) => (
              <li key={entry.id} id={`transcript-${entry.id}`}>
                <div>
                  <span>{entry.playerName ?? entry.source}</span>
                  <time>{time(entry.createdAt)}</time>
                </div>
                {entry.error ? <p role="alert">Transcription failed: {entry.error}</p> : <p>{entry.text}</p>}
                {entry.noiseProbability !== undefined && <small>
                  {(entry.noiseProbability >= 0.5 || (entry.accidentalProbability ?? 0) >= 0.5) ? "Skipped input" : "Conversation kept"}
                  {` · Noise ${percent(entry.noiseProbability)} · Accidental ${percent(entry.accidentalProbability ?? 0)}`}
                </small>}
                {entry.mood && <small>Mood: {entry.mood}</small>}
                {judgments.filter(decision => decision.anchorId === entry.id).map(decision =>
                  <TranscriptDecision key={decision.id} decision={decision} entries={entries} />)}
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty">Speech appears here while the microphone is enabled in a run.</div>
        )}
      </section>
      <aside className="notes">
        <h2>What gets used</h2>
        <p>
          Luna classifies the latest 15 seconds with the previous conversation, up to two minutes in total. Noise and accidental audio are skipped. Each decision appears beside its input.
        </p>
        <p>A 95% Yes sends the moment to Astra. Astra must reach 90% before designing the card. Accepted moments have a 45 second pause between them. The percentages are model estimates.</p>
        <p>The director reacts to the situation and shared jokes. Cards should be fun for the player and the audience, and useful to play.</p>
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

const percent = (value: number) => `${Math.round(value * 100)}%`;
function TranscriptDecision({ decision, entries }: { decision: AmbientDecisionRecord; entries: TranscriptRecord[] }) {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const stages = [
    { label: "Luna", evaluation: decision.classifier },
    { label: "Astra", evaluation: decision.confirmation },
  ].filter(stage => stage.evaluation);
  const excerpts = (ids: string[]) => ids.map(id => {
    const entry = byId.get(id);
    return entry && <blockquote key={id}>
      <a href={`#transcript-${id}`}>{entry.playerName ?? entry.source} · {time(entry.createdAt)}</a>
      <p>{entry.text}</p>
    </blockquote>;
  });
  return <section className="transcript-decision" aria-label={`Decision at ${time(decision.at)}`}>
    <header><strong>{decision.action === "create_card" ? "Card queued" : "Skipped"}</strong><time>{time(decision.at)}</time></header>
    {stages.length > 0 && <table className="decision-probabilities">
      <caption>Create a card?</caption>
      <thead><tr><th scope="col">Evaluation</th><th scope="col">Yes</th><th scope="col">No</th></tr></thead>
      <tbody>{stages.map(({ label, evaluation }) => <tr key={label}>
        <th scope="row">{label}</th><td>{percent(evaluation!.answers.create_card.noul)}</td><td>{percent(1 - evaluation!.answers.create_card.noul)}</td>
      </tr>)}</tbody>
    </table>}
    <p className="help">{decision.reason}</p>
    <details><summary>Last 15 seconds · {decision.transcriptIds.length} {decision.transcriptIds.length === 1 ? "input" : "inputs"}</summary>
      {excerpts(decision.transcriptIds)}
    </details>
    {decision.contextIds.length > 0 && <details><summary>Earlier conversation · {decision.contextIds.length} {decision.contextIds.length === 1 ? "input" : "inputs"}</summary>
      {excerpts(decision.contextIds)}
    </details>}
  </section>;
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
