# Prompt editing

The Prompts page uses the dashboard's existing green palette, Geist typography, shadcn buttons, and flat settings layout. It works with the game closed.

## Direction contract

THESIS: Edit the actual instructions used for each stage of card generation.

OWN-WORLD: Inherit the quiet green dashboard, ordinary labels, thin separators, and existing form controls.

STORY: Choose a stage, read its input and responsibility, edit instructions, and save. The saved prompt applies on the next invocation. Defaults remain available.

FIRST VIEWPORT: The classifier editor opens first. The other stage headings follow below. Save, Use default, and Discard edits sit directly under the editor. A narrow right column explains timing and data ownership; it follows the editors on mobile.

FORM: A direct extension of settings with six collapsible editors. No concept selection is needed for this scoped addition. Each editor retains its own draft through background refresh.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Runtime contract

Six editable prompts: Luna classifier, Astra moment decision, shared card quality, card design, review, artwork. SQLite stores each prompt independently. Blank or oversized prompts are rejected. Response schemas and game legality rules are appended by the host. Transcripts and game state are sent separately as JSON.

Edits affect the next invocation, including the next revision of an existing generation job. They do not change an invocation already running. Prompt text remains on the host; clients receive the resulting card definitions and artwork.

Prompt composition follows the official [GPT-6 prompting guidance](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#prompting-best-practices): explicit roles, writing style, response shape, and scoped tool use. Execution uses [Codex exec](https://learn.chatgpt.com/docs/developer-commands#codex-exec).

## Editor behavior

The six editors show the current saved instructions, their model, and a Default or Custom state. Editing switches the state to Unsaved. Save prompt writes only that editor's instructions. Use default replaces its draft with the built-in instructions; Save prompt is still required to persist the reset. Discard edits restores the saved value. Each draft survives background query refresh while its editor is mounted.

An unchanged or blank draft cannot be saved, and the field accepts at most 24,000 characters. During saving, that editor and its actions are disabled and the primary action reads Saving…. The required response and game rules remain visible in a separate disclosure; the host appends those contracts to the saved instructions at invocation. Card design and review also receive the shared card-quality instructions and contract.

The adjacent Director page identifies Living Deck as the default. The user removed the draw-chance setting and card protection; neither is part of the current controls.

## Finish review

Verdict: **SHIP** for the scoped Prompts addition, reviewed on 2026-09-24. The independent finish review found no material implementation or visual defects. It confirmed that the editors belong to the existing quiet green settings design. The documentation now records the prompt editor pattern and its 15px summary title in [DESIGN.md](../apps/dashboard/DESIGN.md), and removes the stale inspector protection description.

The review inspected the [desktop capture](../.impeccable/review/prompts-desktop.png), [mobile capture](../.impeccable/review/prompts-mobile.png), and [user-width capture](../.impeccable/review/prompts-user.png), together with [PromptsView.tsx](../apps/dashboard/src/PromptsView.tsx), [App.tsx](../apps/dashboard/src/App.tsx), [SettingsView.tsx](../apps/dashboard/src/SettingsView.tsx), [RunView.tsx](../apps/dashboard/src/RunView.tsx), and [styles.css](../apps/dashboard/src/styles.css). The documentation pass also checked the six-stage catalog, independent storage, validation, and appended contracts in [prompts.ts](../apps/companion/src/prompts.ts) and the SQLite store.

Implementation verification exercised saving, persistence after a browser reload, and restoring defaults. The independent screenshot reviewer did not operate those controls. The documentation pass inspected source and the existing captures; it ran no browser session or tests. Game validation is recorded separately in [runtime validation](runtime-validation.md); this visual verdict does not certify the complete generation or multiplayer flow.

No shipping raster assets were added for Prompts. The three PNGs are review captures of the running dashboard. The interface reuses Lucide SVG icons and the incumbent styles.

The existing [design sidecar](../apps/dashboard/.impeccable/design.json) uses Director enabled as its switch example, matching the removal of card protection. Its other examples and tokens are preserved.
