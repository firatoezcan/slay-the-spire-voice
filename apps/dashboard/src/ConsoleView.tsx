import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Switch } from "./components/ui/switch";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "./components/ui/combobox";
import { api, command, saveSettings } from "./data";
import type { GameProps } from "./RunView";
import type { components } from "../../../packages/contracts/src/game";

type ConsoleCommand = components["schemas"]["ConsoleCommand"];
type Argument = components["schemas"]["ConsoleArgument"];
type Option = components["schemas"]["ConsoleOption"];

export function ConsoleView(props: GameProps) {
  const { state, connected, pending, act } = props;
  const catalog = useQuery({
    queryKey: ["console"],
    queryFn: () => api<ConsoleCommand[]>("/game/console/commands"),
    enabled: connected,
    staleTime: Infinity,
  });
  const [selected, setSelected] = useState("afflict");
  const [search, setSearch] = useState("");
  const chosen = catalog.data?.find((c) => c.name === selected);
  return (
    <>
      <label className="switch-line console-enable" htmlFor="debug-console">
        <span>
          Enable console commands
          <small>Commands can change cards, health, and combat.</small>
        </span>
        <Switch
          id="debug-console"
          disabled={pending("settings:director") || !state || !connected}
          checked={state?.settings.debugConsole ?? false}
          onCheckedChange={(value) =>
            act(
              value ? "Console enabled" : "Console disabled",
              () => saveSettings({ debugConsole: value }),
              "settings:director",
            )
          }
        />
      </label>
      <div className="console-layout">
        <section aria-label="Commands">
          <Input
            aria-label="Search commands"
            placeholder="Find a command"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {catalog.isError && (
            <p role="alert">Commands could not load. Reconnect the game.</p>
          )}
          <div className="command-list">
            {catalog.data
              ?.filter((c) =>
                `${c.name} ${c.description}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.name}
                  aria-pressed={selected === c.name}
                  data-selected={selected === c.name}
                  onClick={() => setSelected(c.name)}
                >
                  <code>{c.name}</code>
                  <span>{c.description}</span>
                </button>
              ))}
          </div>
        </section>
        <section className="console-detail" aria-label="Command settings">
          {chosen ? (
            <CommandForm key={chosen.name} chosen={chosen} {...props} />
          ) : (
            <p className="empty">Choose a command.</p>
          )}
        </section>
      </div>
    </>
  );
}

function CommandForm({
  chosen,
  state,
  connected,
  act,
  pending,
}: GameProps & { chosen: ConsoleCommand }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectionLost, setSelectionLost] = useState(false);
  const fields = useQuery({
    queryKey: ["console-arguments", chosen.name, values],
    queryFn: () =>
      api<Argument[]>("/game/console/arguments", "POST", {
        command: chosen.name,
        arguments: Array.from(
          { length: Math.max(-1, ...Object.keys(values).map(Number)) + 1 },
          (_, i) => values[i] ?? "",
        ),
      }),
    enabled: connected,
    placeholderData: keepPreviousData,
    refetchInterval: 3000,
  });
  useEffect(() => {
    if (!fields.data || fields.isPlaceholderData) return;
    setValues((previous) => {
      const next = { ...previous };
      let changed = false;
      fields.data.forEach((field, i) => {
        if (!(i in previous)) {
          next[i] = field.defaultValue;
          changed = true;
        } else if (
          field.kind === "choice" &&
          previous[i] &&
          !field.options.some((option) => option.value === previous[i])
        ) {
          next[i] = "";
          changed = true;
        }
      });
      return changed ? next : previous;
    });
    if (
      fields.data.some(
        (field, i) =>
          field.kind === "choice" &&
          values[i] &&
          !field.options.some((option) => option.value === values[i]),
      )
    )
      setSelectionLost(true);
  }, [fields.data, fields.isPlaceholderData]);
  const args =
    fields.data?.map((field, i) => values[i] ?? field.defaultValue) ?? [];
  const submitted = args.map(
    (value, i) =>
      value ||
      (!fields.data![i]!.required ? fields.data![i]!.defaultValue : ""),
  );
  const lastValue = submitted.findLastIndex((value) => value !== "");
  const valid =
    !!fields.data &&
    fields.data.every((field, i) => {
      const value = submitted[i] ?? "";
      if (!value) return !field.required;
      if (field.kind === "number") return /^-?\d+$/.test(value);
      if (field.kind === "choice")
        return field.options.some((option) => option.value === value);
      return true;
    });
  return (
    <>
      <h2>{chosen.name}</h2>
      <p>{chosen.description}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          act(
            `${chosen.name} completed`,
            () =>
              command("/console/execute", {
                requestId: crypto.randomUUID(),
                command: chosen.name,
                arguments: submitted.slice(0, lastValue + 1).filter(Boolean),
              }),
            `console:${chosen.name}`,
          );
        }}
      >
        <p className="console-status" role={fields.isError ? "alert" : "status"}>
          {fields.isError
            ? "Refresh failed. Check the game connection."
            : !fields.data
              ? "Loading command fields…"
              : selectionLost
                ? "Selection unavailable. Choose another."
                : ""}
        </p>
        {fields.data?.map((field, i) => (
          <div className="field" key={field.name}>
            <label htmlFor={`argument-${i}`}>
              {field.label}
              {!field.required && <span className="optional">Optional</span>}
            </label>
            {field.kind === "choice" ? (
              <ChoiceInput
                id={`argument-${i}`}
                field={field}
                value={args[i] ?? ""}
                set={(value) => {
                  setSelectionLost(false);
                  setValues((previous) => ({ ...previous, [i]: value }));
                }}
              />
            ) : (
              <Input
                id={`argument-${i}`}
                type={field.kind === "number" ? "number" : "text"}
                step={field.kind === "number" ? 1 : undefined}
                value={args[i] ?? ""}
                placeholder={
                  !field.required && field.defaultValue
                    ? `Default: ${field.defaultValue}`
                    : undefined
                }
                required={field.required}
                onChange={(e) =>
                  setValues((previous) => ({
                    ...previous,
                    [i]: e.target.value,
                  }))
                }
              />
            )}
            {!field.required && field.defaultValue && (
              <p className="help">Leave blank to use {field.defaultValue}.</p>
            )}
            {field.kind === "choice" && field.options.length === 0 && (
              <p className="help">
                No {field.label.toLowerCase()} choices are available on the
                current screen.
              </p>
            )}
          </div>
        ))}
        {fields.data?.length === 0 && (
          <p>This command needs no additional settings.</p>
        )}
        <Button
          type="submit"
          disabled={
            !valid ||
            fields.isError ||
            pending(`console:${chosen.name}`) ||
            !connected ||
            !state?.settings.debugConsole
          }
        >
          {pending(`console:${chosen.name}`)
            ? "Running…"
            : `Run ${chosen.name}`}
        </Button>
        <details className="command-preview">
          <summary>Command preview</summary>
          <code>
            {chosen.name}{" "}
            {submitted
              .slice(0, lastValue + 1)
              .filter(Boolean)
              .map((v) =>
                /^(card|creature):/.test(v)
                  ? '"' +
                    fields.data
                      ?.flatMap((f) => f.options)
                      .find((o) => o.value === v)?.label +
                    '"'
                  : /\s/.test(v)
                    ? JSON.stringify(v)
                    : v,
              )
              .join(" ")}
          </code>
        </details>
      </form>
    </>
  );
}

function ChoiceInput({
  id,
  field,
  value,
  set,
}: {
  id: string;
  field: Argument;
  value: string;
  set: (value: string) => void;
}) {
  const options = field.options;
  return (
    <Combobox
      items={options}
      value={options.find((item) => item.value === value) ?? null}
      onValueChange={(option: Option | null) => set(option?.value ?? "")}
      itemToStringLabel={(item: Option) => item.label}
      itemToStringValue={(item: Option) => item.value}
      isItemEqualToValue={(item: Option, selected: Option) =>
        item.value === selected.value
      }
    >
      <ComboboxInput
        id={id}
        placeholder={`Find ${field.label.toLowerCase()}`}
        showClear={!field.required}
      />
      <ComboboxContent>
        <ComboboxEmpty>No matching choices.</ComboboxEmpty>
        <ComboboxList>
          {(option: Option) => (
            <ComboboxItem key={option.value} value={option}>
              <span>{option.label}</span>
              {!/^\d+$/.test(option.value) &&
                !/^(card|creature):/.test(option.value) && (
                  <small className="option-id">{option.value}</small>
                )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
