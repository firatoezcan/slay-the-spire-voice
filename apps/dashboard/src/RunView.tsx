import { useEffect, useState } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  Sparkles,
  Image as ImageIcon,
  ArrowRight,
  Search,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./components/ui/select";
import {
  cards,
  definitions,
  forRun,
  api,
  command,
  plain,
  refresh,
  type State,
  type Card,
} from "./data";
import { VoiceInput } from "./HistoryViews";
import type { Act, Pending } from "./App";

export type GameProps = {
  state?: State;
  act: Act;
  pending: Pending;
  connected: boolean;
};
export function RunView({ state, act, pending, connected }: GameProps) {
  const [selected, setSelected] = useState("");
  const [pile, setPile] = useState("Deck");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState("");
  useEffect(() => {
    if (
      target &&
      !state?.creatures.some(
        (creature) => creature.id === target && creature.enemy,
      )
    )
      setTarget("");
  }, [state?.creatures, target]);
  const { jobs } = forRun(state?.runId ?? "");
  const { data: rows = [] } = useLiveQuery({
    queryKey: ["cards-with-definitions"],
    query: (q) =>
      q
        .from({ card: cards })
        .leftJoin({ definition: definitions }, ({ card, definition }) =>
          eq(card.definitionId, definition.id),
        )
        .select(({ card, definition }) => ({ ...card, definition })),
  });
  const { data: work = [] } = useLiveQuery({
    query: (q) => q.from({ job: jobs }),
  });
  const shown = rows.filter(
    (row) =>
      row.pile === pile &&
      row.runId === state?.runId &&
      row.name.toLowerCase().includes(search.toLowerCase()),
  );
  const current =
    shown.find((card) => card.id === selected) ??
    shown.find((card) => card.definitionId) ??
    shown[0];
  const related = work.filter((job) => job.instanceId === current?.id);
  const ready = related.find(
    (job) => job.kind === "card" && job.status === "ready",
  );
  const art = related.find(
    (job) => job.kind === "art" && job.definitionId === current?.definitionId,
  );
  const eligible =
    state?.host && state.phase !== "ended" &&
    current &&
    !(current.wildcard && current.resolved) &&
    ["Common", "Uncommon", "Rare", "Basic"].includes(current.rarity);
  const invoke = (path: string, extra: object) =>
    command(path, {
      runId: state!.runId,
      requestId: crypto.randomUUID(),
      ...extra,
    });
  function generate(lucky: boolean) {
    if (current)
      act(
        "Card generation queued",
        async () => {
          await api("/jobs", "POST", {
            instanceId: current.id,
            lucky,
            immediate: state?.phase === "wildcard-acquired",
          });
          await refresh("jobs");
        },
        `generate:${current.id}`,
      );
  }
  return (
    <>
      <div className="run-layout">
        <section className="card-workspace" aria-label="Run cards">
          <div className="table-toolbar">
            <div className="pile-tabs" aria-label="Card pile">
              {["Deck", "Hand", "Draw", "Discard", "Exhaust"].map((value) => (
                <button
                  key={value}
                  aria-pressed={pile === value}
                  className={pile === value ? "active" : ""}
                  onClick={() => setPile(value)}
                >
                  {value}
                  <span>{rows.filter((c) => c.pile === value).length}</span>
                </button>
              ))}
            </div>
            <label className="search-field">
              <Search size={15} />
              <Input
                aria-label="Find a card"
                placeholder="Find a card"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          <div className="table-scroll">
            <table className="card-table">
              <thead>
                <tr>
                  <th scope="col">Card</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((card) => (
                  <tr
                    key={card.rowId}
                    data-selected={current?.rowId === card.rowId}
                  >
                    <td>
                      <button
                        className="card-name"
                        aria-pressed={current?.rowId === card.rowId}
                        aria-controls="card-inspector"
                        onClick={() => setSelected(card.id)}
                      >
                        {card.name}
                      </button>
                      <span className="rarity">{card.rarity} · {card.playerName}</span>
                    </td>
                    <td className="numeric">
                      {card.cost < 0 ? "X" : card.cost}
                    </td>
                    <td>{card.type}</td>
                    <td>
                      <span
                        className={`state-label ${card.definitionId ? "generated" : ""}`}
                      >
                        {status(card)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && (
              <div className="empty">
                {search
                  ? "No cards match this search."
                  : state?.runId
                    ? `No cards in ${pile.toLowerCase()}.`
                    : "Your deck will appear when a run starts."}
              </div>
            )}
          </div>
          <div className="table-footer">
            {shown.length} cards<span>Updates with the game</span>
          </div>
        </section>
        <aside
          id="card-inspector"
          className="inspector"
          aria-label="Card inspector"
        >
          {current ? (
            <>
              <div className="inspector-title">
                <h2>{current.name}</h2>
                <span className="cost">{current.cost}</span>
              </div>
              <p className="card-meta">
                {current.playerName} · {current.rarity} · {current.type}
                {current.upgradeLevel > 0
                  ? ` · Upgraded ${current.upgradeLevel}`
                  : ""}
              </p>
              {art?.status === "succeeded" ? (
                <img
                  className="card-art"
                  src={`/api/art/${current.definitionId}`}
                  alt={`Illustration for ${current.name}`}
                />
              ) : current.definitionId ? (
                <div className="art-wait">
                  <ImageIcon size={24} />
                  <span>
                    {art?.status === "running"
                      ? "Painting this card…"
                      : art?.status === "failed"
                        ? "Artwork failed. Retry from Jobs."
                        : "Artwork starts on the first play."}
                  </span>
                </div>
              ) : null}
              <p className="card-description">{plain(current.description)}</p>
              {current.definition && (
                <section className="rationale">
                  <h3>Why this card</h3>
                  <p>{current.definition.rationale}</p>
                  <span>Quality {current.definition.quality}/10</span>
                </section>
              )}
              {ready && (
                <p className="ready-note">
                  <Sparkles size={15} />A replacement is ready for the next eligible draw.
                </p>
              )}
              <div className="inspector-controls">
                <Button
                  disabled={
                    !eligible || pending(`generate:${current.id}`) || !connected
                  }
                  onClick={() => generate(false)}
                >
                  Prepare a transformation
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    !eligible || pending(`generate:${current.id}`) || !connected
                  }
                  onClick={() => generate(true)}
                >
                  <Sparkles size={15} />
                  I'm feeling lucky
                </Button>
                {current.wildcard && current.resolved && (
                  <p className="help">
                    This wildcard has used its transformation.
                  </p>
                )}
              </div>
              {pile === "Hand" && current.localPlayer && state?.phase === "combat" && (
                <div className="play-controls">
                  <label htmlFor="play-target">Target</label>
                  <Select
                    value={target}
                    onValueChange={(value) => setTarget(value ?? "")}
                  >
                    <SelectTrigger id="play-target">
                      <SelectValue placeholder="Self / no target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Self / no target</SelectItem>
                      {state.creatures
                        .filter((c) => c.enemy)
                        .map((c, index) => (
                          <SelectItem value={c.id} key={c.id}>
                            {c.name} · Enemy {index + 1} · {c.health} HP
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={pending(`play:${current.id}`) || !connected}
                    onClick={() =>
                      act(
                        "Play request sent to the game",
                        () =>
                          invoke("/combat/play", {
                            instanceId: current.id,
                            targetId: target || null,
                          }),
                        `play:${current.id}`,
                      )
                    }
                  >
                    Play card <ArrowRight size={15} />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="empty">
              Select a card to inspect its rules and planned changes.
            </div>
          )}
        </aside>
      </div>
      <div className="run-bottom">
        <section>
          <h2>Add to the conversation</h2>
          <VoiceInput act={act} pending={pending("idea")} />
        </section>
        <section className="game-controls">
          <h2>Game controls</h2>
          {state?.phase === "combat" && (
            <>
              <div className="creature-list">
                {state.creatures.map((c) => (
                  <div key={c.id}>
                    <span>{c.name}</span>
                    <span>
                      {c.health}/{c.maxHealth} HP
                      {c.block > 0 ? ` · ${c.block} Block` : ""}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                disabled={pending("end-turn") || !connected}
                onClick={() =>
                  act(
                    "End turn requested",
                    () => invoke("/combat/end-turn", {}),
                    "end-turn",
                  )
                }
              >
                End turn
              </Button>
            </>
          )}
          {state?.phase === "wildcard-acquired" && (
            <div className="choice-list">
              {[
                ["keep", "Keep wildcard"],
                ["transform", "Transform"],
                ["lucky", "I'm feeling lucky"],
              ].map(([id, label]) => (
                <Button
                  key={id}
                  variant="outline"
                  disabled={pending("wildcard-choice") || !connected}
                  onClick={() =>
                    act(
                      "Choice sent to the game",
                      () =>
                        invoke("/choices/select", {
                          choiceId: `wildcard:${id}`,
                        }),
                      "wildcard-choice",
                    )
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
          <details>
            <summary>Available choices ({state?.choices.length ?? 0})</summary>
            <div className="choice-list">
              {state?.choices
                .filter((c) => !c.id.startsWith("wildcard:"))
                .map((choice) => (
                  <Button
                    key={choice.id}
                    variant="outline"
                    disabled={
                      !choice.enabled ||
                      pending(`choice:${choice.id}`) ||
                      !connected
                    }
                    onClick={() =>
                      act(
                        "Choice sent to the game",
                        () =>
                          invoke("/choices/select", { choiceId: choice.id }),
                        `choice:${choice.id}`,
                      )
                    }
                  >
                    {choice.label}
                  </Button>
                ))}
            </div>
          </details>
        </section>
      </div>
    </>
  );
}
function status(card: Card) {
  return card.wildcard && !card.resolved
      ? "Wildcard"
      : card.definitionId
        ? "Transformed"
        : "Original";
}
