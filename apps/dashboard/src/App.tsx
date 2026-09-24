import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "@tanstack/react-db";
import {
  AudioLines,
  BookOpen,
  CircleHelp,
  ExternalLink,
  List,
  NotebookPen,
  Radio,
  SlidersHorizontal,
  Terminal,
  X,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { api, connect, restoreSession, states, type Health } from "./data";
import { RunView } from "./RunView";
import { DirectorView, SettingsView, ConsoleView } from "./SettingsView";
import { JobsView, EventsView, VoiceView } from "./HistoryViews";
import { PromptsView } from "./PromptsView";

export type Act = (
  label: string,
  work: () => Promise<unknown>,
  resource?: string,
) => void;
export type Pending = (resource: string) => boolean;
const pages = [
  { id: "run", title: "Run", icon: BookOpen },
  { id: "director", title: "Director", icon: SlidersHorizontal },
  { id: "voice", title: "Voice", icon: AudioLines },
  { id: "prompts", title: "Prompts", icon: NotebookPen },
  { id: "jobs", title: "Jobs", icon: List },
  { id: "events", title: "History", icon: Radio },
  { id: "console", title: "Console", icon: Terminal },
  { id: "settings", title: "Settings", icon: CircleHelp },
];

export function App() {
  const [page, setPage] = useState("run");
  const [session, setSession] = useState(false);
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [pending, setPending] = useState(new Map<string, number>());
  const { data: snapshots } = useLiveQuery({
    query: (q) => q.from({ state: states }),
  });
  const state = snapshots?.[0];
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
    refetchInterval: 2000,
    retry: false,
    enabled: session,
  });
  const act: Act = (label, work, resource = label) => {
    setPending((previous) =>
      new Map(previous).set(resource, (previous.get(resource) ?? 0) + 1),
    );
    setNotice(null);
    void Promise.resolve()
      .then(work)
      .then(() => setNotice({ text: label, error: false }))
      .catch((error) =>
        setNotice({ text: error.message ?? String(error), error: true }),
      )
      .finally(() =>
        setPending((previous) => {
          const next = new Map(previous),
            count = (next.get(resource) ?? 1) - 1;
          if (count > 0) next.set(resource, count);
          else next.delete(resource);
          return next;
        }),
      );
  };
  useEffect(() => {
    void restoreSession()
      .then(() => setSession(true))
      .catch(() => setSession(false));
  }, []);
  if (!session)
    return (
      <div className="connection-page">
        <Radio size={28} />
        <h1>Connect Voice Director</h1>
        <p>
          Open this page with <code>bun run cli open</code>, or paste the token
          from the local data folder.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            act("Connected", async () => {
              await connect(token.trim());
              setToken("");
              setSession(true);
            });
          }}
        >
          <label htmlFor="token">Local token</label>
          <Input
            id="token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <Button
            disabled={!token.trim() || pending.has("Connected")}
            type="submit"
          >
            Connect
          </Button>
        </form>
        {notice && <p role="alert">{notice.text}</p>}
      </div>
    );
  const connected = !health.isError && health.data?.game === true;
  const props = {
    state,
    act,
    pending: (resource: string) => pending.has(resource),
    connected,
  };
  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          aria-label="Voice Director"
          onClick={(event) => {
            event.preventDefault();
            setPage("run");
          }}
        >
          <Radio size={22} />
          <span>
            Voice <br />
            Director
          </span>
        </a>
        <nav aria-label="Main navigation">
          {pages.map((item) => (
            <button
              key={item.id}
              aria-label={item.title}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => setPage(item.id)}
            >
              <item.icon size={18} />
              <span>{item.title}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>Slay the Spire 2</span>
          <a href="/openapi" target="_blank" rel="noreferrer">
            API reference <ExternalLink size={13} />
          </a>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <span>{pages.find((item) => item.id === page)?.title}</span>
          <div className="connection-status">
            <span className={connected ? "status-dot online" : "status-dot"} />
            {connected ? "Game connected" : "Game offline"}
          </div>
        </header>
        <main id="main">
          {health.isError && (
            <div className="banner error" role="alert">
              The companion is unavailable. Start the mod and refresh this page.
            </div>
          )}
          {!health.isError && health.data && !health.data.game && (
            <div className="banner">
              Open Slay the Spire 2 through Steam with Voice Director enabled.
              The dashboard will reconnect.
            </div>
          )}
          <div className="page-heading">
            <div>
              <h1>
                {page === "run"
                  ? state?.runId
                    ? "Current run"
                    : "Waiting for a run"
                  : pages.find((item) => item.id === page)?.title}
              </h1>
              <p>
                {page === "run"
                  ? state?.runId
                    ? `${state.phase === "combat" ? `Combat · Turn ${state.turn}` : state.phase === "wildcard-acquired" ? "Wildcard acquired" : state.phase.replace(/Room$/, "")} · ${state.settings.mode === "wildcard" ? "Wildcard" : "Living Deck"}`
                    : "Start or join a run to see the party's cards here."
                  : descriptions[page]}
              </p>
            </div>
            {pending.size > 0 && (
              <span role="status" className="pending">
                Working…
              </span>
            )}
          </div>
          {notice && (
            <div
              className={`banner action-notice ${notice.error ? "error" : "success"}`}
              role={notice.error ? "alert" : "status"}
            >
              <span>{notice.text}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Dismiss message"
                onClick={() => setNotice(null)}
              >
                <X size={16} />
              </Button>
            </div>
          )}
          {page === "run" && <RunView {...props} />}
          {page === "director" && <DirectorView {...props} />}
          {page === "voice" && (
            <VoiceView
              act={act}
              pending={pending.has("idea")}
              health={health.data}
              runId={state?.runId ?? ""}
            />
          )}{" "}
          {page === "jobs" && (
            <JobsView
              act={act}
              pending={props.pending}
              runId={state?.runId ?? ""}
            />
          )}{" "}
          {page === "events" && <EventsView runId={state?.runId ?? ""} />}
          {page === "prompts" && <PromptsView act={act} pending={props.pending} />}
          {page === "settings" && (
            <SettingsView
              act={act}
              pending={pending.has("Provider settings saved")}
              health={health.data}
            />
          )}{" "}
          {page === "console" && <ConsoleView {...props} />}
        </main>
      </div>
    </div>
  );
}
const descriptions: Record<string, string> = {
  director: "Choose when cards can change and how far they can go.",
  voice: "Conversation, input checks, and the decision to create a card.",
  prompts: "Edit the instructions behind each decision, card, and illustration.",
  jobs: "Card rules and artwork are generated in the background.",
  events: "Decisions and changes from this run.",
  console: "The game's built in commands. These can change the run.",
  settings: "Local speech, generation, and integration settings.",
};
