import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Switch } from "./components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import {
  api,
  refresh,
  saveSettings,
  type Settings,
  type ProviderConfig,
  type Health,
} from "./data";
import type { Act } from "./App";
import type { GameProps } from "./RunView";
export { ConsoleView } from "./ConsoleView";

export function DirectorView(props: GameProps) {
  return props.state ? (
    <DirectorForm {...props} initial={props.state.settings} />
  ) : (
    <div className="empty">Connect the game to edit the director.</div>
  );
}
function DirectorForm({
  initial,
  act,
  pending,
  connected,
}: GameProps & { initial: Settings }) {
  const [draft, setDraft] = useState(initial);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((old) => ({ ...old, [key]: value }));
  return (
    <div className="reading-layout">
      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          act(
            "Director settings saved",
            async () => {
              await saveSettings(draft);
            },
            "settings:director",
          );
        }}
      >
        <label className="switch-line" htmlFor="director-enabled">
          <span>
            Director enabled<small>Allow eligible cards to transform.</small>
          </span>
          <Switch
            id="director-enabled"
            checked={draft.enabled}
            onCheckedChange={(value) => set("enabled", value)}
          />
        </label>
        <div className="field">
          <label htmlFor="director-mode">Mode</label>
          <Select
            value={draft.mode}
            items={[
              { value: "wildcard", label: "Wildcard" },
              { value: "living-deck", label: "Living Deck" },
            ]}
            onValueChange={(value) => {
              if (value) set("mode", value);
            }}
          >
            <SelectTrigger id="director-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wildcard">Wildcard</SelectItem>
              <SelectItem value="living-deck">Living Deck</SelectItem>
            </SelectContent>
          </Select>
          <p className="help">
            {draft.mode === "wildcard"
              ? "One reward option becomes a wildcard. Take it to transform now or save its one change for a later draw."
              : "Eligible deck cards can change as they are drawn. Protect cards you want to keep."}
          </p>
        </div>
        <Range
          label="Chance per draw"
          help="Applies when an eligible card has a prepared replacement."
          value={draft.drawChance}
          set={(v) => set("drawChance", v)}
        />
        <div className="field-pair">
          <div className="field">
            <label htmlFor="max-turn">Changes per turn</label>
            <Input
              id="max-turn"
              type="number"
              min={1}
              max={10}
              value={draft.maxPerTurn}
              onChange={(e) => set("maxPerTurn", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="cooldown">Cooldown in turns</label>
            <Input
              id="cooldown"
              type="number"
              min={0}
              max={20}
              value={draft.cooldownTurns}
              onChange={(e) => set("cooldownTurns", Number(e.target.value))}
            />
          </div>
        </div>
        <Range
          label="Strength"
          help="Extra power above the strongest cards of the same rarity."
          value={draft.strength}
          set={(v) => set("strength", v)}
        />
        <Range
          label="Synergy"
          help="How closely new cards should follow the deck's current plan."
          value={draft.synergy}
          set={(v) => set("synergy", v)}
        />
        <Button
          type="submit"
          disabled={pending("settings:director") || !connected}
        >
          Save director settings
        </Button>
      </form>
      <aside className="notes">
        <h2>When a change happens</h2>
        <p>
          A ready card takes the same slot as the card being drawn. Draw limits
          and effects that prevent drawing still apply.
        </p>
        <p>
          A card can change once per turn. A wildcard can transform once in its
          lifetime.
        </p>
        <h3>I'm feeling lucky</h3>
        <p>
          Finds a card above the best of its rarity, with a twist for your deck.
          Only rares can have drawbacks, with an upside that changes how you
          play.
        </p>
        <h3>Generation timing</h3>
        <p>
          Card rules are prepared ahead of the draw. Artwork starts when the new
          card is first played.
        </p>
      </aside>
    </div>
  );
}
function Range({
  label,
  help,
  value,
  set,
}: {
  label: string;
  help: string;
  value: number;
  set: (value: number) => void;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="field">
      <div className="range-label">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{Math.round(value * 100)}%</output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => set(Number(event.target.value))}
      />
      <p className="help">{help}</p>
    </div>
  );
}
export function SettingsView({
  act,
  pending,
  health,
}: {
  act: Act;
  pending: boolean;
  health?: Health;
}) {
  const provider = useQuery({
    queryKey: ["provider"],
    queryFn: () => api<ProviderConfig>("/provider"),
  });
  return provider.data ? (
    <ProviderForm
      initial={provider.data}
      act={act}
      pending={pending}
      health={health}
    />
  ) : (
    <div className="empty">
      {provider.error?.message ?? "Loading settings…"}
    </div>
  );
}
function ProviderForm({
  initial,
  act,
  pending,
  health,
}: {
  initial: ProviderConfig;
  act: Act;
  pending: boolean;
  health?: Health;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <div className="reading-layout">
      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          act("Provider settings saved", async () => {
            await api("/provider", "PUT", draft);
            await refresh("provider");
          });
        }}
      >
        <h2>Generation</h2>
        <div className="field">
          <label htmlFor="model">Codex model</label>
          <Input
            id="model"
            value={draft.model}
            placeholder="Codex default"
            onChange={(event) =>
              setDraft({ ...draft, model: event.target.value })
            }
          />
          <p className="help">Uses your existing Codex sign in.</p>
        </div>
        <label htmlFor="auto-prepare" className="switch-line">
          <span>
            Prepare cards automatically
            <small>Keep up to three candidates ready or in progress.</small>
          </span>
          <Switch
            id="auto-prepare"
            checked={draft.autoPrepare}
            onCheckedChange={(value) =>
              setDraft({ ...draft, autoPrepare: value })
            }
          />
        </label>
        <div className="field-pair">
          <div className="field">
            <label htmlFor="card-timeout">Card timeout (seconds)</label>
            <Input
              id="card-timeout"
              type="number"
              min={10}
              max={600}
              value={draft.cardTimeoutMs / 1000}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  cardTimeoutMs: Number(e.target.value) * 1000,
                })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="art-timeout">Art timeout (seconds)</label>
            <Input
              id="art-timeout"
              type="number"
              min={10}
              max={900}
              value={draft.artTimeoutMs / 1000}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  artTimeoutMs: Number(e.target.value) * 1000,
                })
              }
            />
          </div>
        </div>
        <h2 className="section-break">Speech</h2>
        <div className="field">
          <label htmlFor="model-dir">Parakeet model folder</label>
          <Input
            id="model-dir"
            value={draft.modelDir}
            onChange={(e) => setDraft({ ...draft, modelDir: e.target.value })}
          />
          <p className="help">
            {health?.speech.ready
              ? "The installed Parakeet files are available."
              : `Missing: ${health?.speech.missing.join(", ") ?? "checking model files…"}`}
          </p>
        </div>
        <Button type="submit" disabled={pending}>
          Save provider settings
        </Button>
      </form>
      <aside className="notes">
        <h2>Local services</h2>
        <dl>
          <dt>Companion</dt>
          <dd>
            <code>127.0.0.1:57543</code>
          </dd>
          <dt>Game API</dt>
          <dd>
            <code>127.0.0.1:57542</code>
          </dd>
          <dt>Storage</dt>
          <dd>SQLite in the local Voice Director data folder.</dd>
        </dl>
        <h3>Integrations</h3>
        <p>
          Use the API token for Twitch, TTS, scripts, or another local client.
          The API reference describes all available commands.
        </p>
        <a href="/openapi" target="_blank" rel="noreferrer">
          Open API reference
        </a>
        <h3>CLI and MCP</h3>
        <p>
          <code>bun run cli list</code> lists commands. <code>bun run mcp</code>{" "}
          starts the MCP server.
        </p>
      </aside>
    </div>
  );
}
