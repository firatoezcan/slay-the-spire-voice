---
version: 1
slug: "apps-dashboard"
primary_target: "apps/dashboard"
related_targets: []
---

# Dashboard surface

Mode: Operate. The dashboard sits beside the game and supports frequent inspection of cards, speech, jobs, and controls. Build directly in React under the user's instruction to decide and continue without questions.

## Direction contract

THESIS: Make each card and the reason it changed easy to inspect in one shared working table.

OWN-WORLD: A muted graphite frame, off white table cells, deep green selection, fine neutral rules, and compact Base UI controls. Use a workhorse sans face and aligned numeric columns. Firat uses the dashboard beside a visually busy game; a subdued light workspace keeps long reads comfortable.

STORY: See the connected run, select a card, read its planned change, tune the director, then watch the same row update when the game applies it.

FIRST VIEWPORT: A narrow left navigation, run title and connection status above a broad card table, with a persistent inspector on the right. The inspector exposes generation, rationale, and artwork. A short speech input sits below the table. Row selection and a brief cell highlight carry the signature interaction.

FORM: Spreadsheet inspector, grounded candidate 6, seed 4b050f68. The alternate systems donate discipline: alphabetstorm strengthens labels; tensegrity clarifies structure; darkroom records provenance; nixie separates measured values; posterwall gives artwork space; PC98 sharpens keyboard focus. All are declined as whole interfaces because their forms obscure inspection and editing here.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Console and live update extension

The user rejected positional argument text, unnamed game controls, and screen movement during updates. Keep the existing visual system. Console selection opens a form with one named field per argument, searchable native choices, numeric amounts, and actual hand cards or creatures. A collapsed command preview is secondary. Values persist through live refreshes. The primary action submits the assembled argument array.

Game choices use action names and content names. Empty potion slots and unnamed internal controls do not appear as actions. Director settings use TanStack DB optimistic transactions and authoritative read-back. Status messages sit outside document flow so the table and form stay in place. Verify desktop, mobile, and the user's app width with live data, including a named affliction selection and settings update.
