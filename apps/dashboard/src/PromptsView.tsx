import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Button } from "./components/ui/button";
import { api } from "./data";
import type { Act, Pending } from "./App";
import type { PromptRecord } from "../../companion/src/prompts";

export function PromptsView({ act, pending }: { act: Act; pending: Pending }) {
  const prompts = useQuery({
    queryKey: ["prompts"],
    queryFn: () => api<PromptRecord[]>("/prompts"),
  });
  if (!prompts.data) return (
    <div className="empty" role={prompts.isError ? "alert" : "status"}>
      <p>{prompts.error?.message ?? "Loading prompts…"}</p>
      {prompts.isError && <Button variant="outline" onClick={() => void prompts.refetch()}>Try again</Button>}
    </div>
  );
  return (
    <div className="reading-layout">
      <section className="prompt-list" aria-label="Generation prompts">
        {prompts.data.map(prompt => (
          <PromptEditor key={prompt.id} prompt={prompt} act={act} pending={pending(`prompt:${prompt.id}`)} />
        ))}
      </section>
      <aside className="notes">
        <h2>From conversation to card</h2>
        <p>Luna rates the moment. Astra chooses the card, writes it, and reviews whether you would want to play it.</p>
        <p>Card quality is shared by design and review. Artwork receives the card's scene and a sheet of original game portraits.</p>
        <h3>When edits apply</h3>
        <p>Save a prompt to use it on its next invocation. Work already running keeps the instructions it started with.</p>
        <p>Prompts are stored on this computer. The host sends the finished cards and artwork to the other players.</p>
        <h3>Response format</h3>
        <p>The app adds the conversation and game data automatically. Each editor shows the required response and game rules below it.</p>
      </aside>
    </div>
  );
}

function PromptEditor({ prompt, act, pending }: { prompt: PromptRecord; act: Act; pending: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? prompt.instructions;
  const changed = value !== prompt.instructions;
  const fieldId = `prompt-${prompt.id}`;
  return (
    <details className="prompt-editor" open={prompt.id === "classifier" ? true : undefined}>
      <summary>
        <span><strong>{prompt.title}</strong><small>{prompt.model}</small></span>
        <span className="prompt-state">{changed ? "Unsaved" : prompt.instructions === prompt.defaultInstructions ? "Default" : "Custom"}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <form onSubmit={event => {
        event.preventDefault();
        act(`${prompt.title} saved`, async () => {
          const saved = await api<PromptRecord>(`/prompts/${prompt.id}`, "PUT", { instructions: value });
          queryClient.setQueryData<PromptRecord[]>(["prompts"], previous =>
            previous?.map(entry => entry.id === saved.id ? saved : entry));
          setDraft(null);
        }, `prompt:${prompt.id}`);
      }}>
        <p className="help" id={`${fieldId}-help`}>{prompt.description}</p>
        <label htmlFor={fieldId}>Instructions</label>
        <textarea id={fieldId} aria-describedby={`${fieldId}-help`} value={value}
          onChange={event => setDraft(event.target.value)} maxLength={24000}
          rows={14} required disabled={pending} spellCheck={false} />
        <div className="prompt-actions">
          <Button type="submit" disabled={!changed || !value.trim() || pending}>
            {pending ? "Saving…" : "Save prompt"}
          </Button>
          <Button type="button" variant="outline" disabled={pending || value === prompt.defaultInstructions}
            onClick={() => setDraft(prompt.defaultInstructions)}>Use default</Button>
          {changed && <Button type="button" variant="ghost" disabled={pending} onClick={() => setDraft(null)}>Discard edits</Button>}
        </div>
        <details className="prompt-contract">
          <summary>Required response and game rules</summary>
          <p>{prompt.contract}</p>
        </details>
      </form>
    </details>
  );
}
