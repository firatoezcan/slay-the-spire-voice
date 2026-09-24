---
name: Voice Director dashboard
description: A quiet green workspace for inspecting cards, speech, and generation work.
colors:
  primary: "#285840"
  primary-foreground: "#fff"
  background: "#fafbf9"
  foreground: "#26352e"
  card: "#fff"
  secondary: "#e8eee9"
  secondary-foreground: "#294637"
  muted: "#f0f3ef"
  muted-foreground: "#58645c"
  accent: "#e5eee6"
  accent-foreground: "#254531"
  border: "#d9e0d9"
  input: "#cbd5cc"
  ring: "#498767"
  destructive: "#a43a31"
  sidebar-frame: "#23362f"
  sidebar-label: "#bfcec4"
  sidebar-selection: "#e4eee5"
  sidebar-selection-text: "#1f4630"
  inspector: "#f5f7f2"
  selected-row: "#eaf1e7"
  state-background: "#eff2ed"
  state-text: "#5a695f"
  generated-background: "#dbe9d6"
  generated-text: "#315333"
  failed-background: "#f8e6df"
  failed-text: "#903d31"
typography:
  headline:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "29px"
    fontWeight: 560
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline-mobile:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "26px"
    fontWeight: 560
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  prompt-summary:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "15px"
    lineHeight: 1.55
  inspector-title:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "13px"
    fontWeight: 650
    lineHeight: 1.55
  table:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.55
  metadata:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.55
  button:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.428571
rounded:
  tag: "4px"
  navigation: "6px"
  control: "0.5rem"
  compact-control: "0.4rem"
  workspace: "10px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  cell: "18px"
  5: "20px"
  6: "24px"
  7: "28px"
  page: "36px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-destructive:
    backgroundColor: "color-mix(in oklab, #a43a31 10%, transparent)"
    textColor: "{colors.destructive}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "4px 10px"
    height: "32px"
  navigation:
    backgroundColor: "{colors.sidebar-frame}"
    textColor: "{colors.sidebar-label}"
    rounded: "{rounded.navigation}"
    padding: "11px 13px"
  state-label:
    backgroundColor: "{colors.state-background}"
    textColor: "{colors.state-text}"
    typography: "{typography.metadata}"
    rounded: "{rounded.tag}"
    padding: "3px 7px"
  workspace:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.workspace}"
  selected-row:
    backgroundColor: "{colors.selected-row}"
    textColor: "{colors.foreground}"
    typography: "{typography.table}"
    padding: "10px 18px"
  switch:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
    height: "18.4px"
    width: "32px"
---

# Design System: Voice Director dashboard

## Overview

**Creative North Star: "A quiet workspace"**

Voice Director uses a quiet green workspace for inspecting game data beside the game. Dark navigation anchors the page; pale surfaces, fine rules, and compact controls keep long tables and explanations easy to read. The visual character comes from the relationship between rows, selection, and detail.

This document records the implemented dashboard package. The surface strategy remains in [.impeccable/surfaces/apps-dashboard.md](.impeccable/surfaces/apps-dashboard.md), with product constraints in [PRODUCT.md](../../PRODUCT.md). The source is the light theme in src/styles.css and the shadcn components built on Base UI.

**Key Characteristics:**

- A dark navigation rail and a light working area.
- One restrained green accent for actions, selection, and focus.
- Compact Geist typography with aligned numbers.
- Flat tables and panels separated by fine rules.
- Card artwork appears as content inside the inspector.

Extraction scope: current source and the existing desktop, mobile, and user-width captures in [.impeccable/review](.impeccable/review). The finish verdict resolved four findings: narrow inspector access, connection and action accuracy, contrast, and accessible selection. That verdict did not claim whole-surface approval. This documentation pass ran no new browser review or visual detector.

The Prompts extension preserves this system. Its scoped finish verdict, current captures, interaction verification, and remaining runtime limits are recorded in [Prompt editing](../../docs/dashboard-prompts.md).

## Colors

The palette is green throughout, with enough neutral space for dense information. The frontmatter records the reused values; local variations remain in the stylesheet.

The sidecar includes synthesized tonal ramps for swatch previews. Those ramps are illustrations of each color, not additional application tokens.

### Primary

Deep green `primary` carries primary actions and links. `primary-foreground` supplies the text on those actions. `ring` marks keyboard focus. Pale `accent` and its text partner support selection and menu focus.

### Neutral

`background` is the off-white page. `card` is the white table and form surface. `foreground` is the main reading color; `muted-foreground` supports explanatory text. `muted` and `secondary` separate quieter controls and regions. `border` divides surfaces and `input` outlines editable controls.

The sidebar uses its own dark frame, light labels, and a pale selected item with dark text. The inspector has a slightly green surface. Selected rows, ordinary state labels, and generated state labels each have distinct pale fills.

### Status

`destructive` belongs to destructive actions and invalid controls. Failed state labels use their own pale warm background and dark red text. Connection dots accompany explicit connection wording; they do not carry the state alone.

**The State Rule.** Use words and control state alongside color so connection, selection, failure, and pending work remain understandable.

## Typography

Geist Variable is locally imported and used throughout, with a sans-serif fallback. There is no separate display face. The type scale is a practical hierarchy rather than a fixed mathematical ratio.

Page headings use `headline`; the mobile role applies at the smallest breakpoint. Section titles use `title`, with `inspector-title` giving the selected card more emphasis. Body text, table text, labels, and metadata use the corresponding frontmatter roles. Card names are slightly heavier than row values; card descriptions use a larger reading size (15px) and looser line height (1.65). General paragraphs stop at a readable measure (72ch).

Collapsible prompt headings use `prompt-summary` with native strong emphasis. Their model labels and saved-state text use the quieter table-size text so each editor's title remains the first thing to scan.

Numbers in costs, output values, times, and creature statistics use tabular figures. Code is compact (12px) and may wrap within long identifiers. Small metadata sometimes drops to 10px for counts, rarity, and table footers; this is not the default size for explanatory prose.

**The Reading Rule.** Keep supporting text quiet but readable; reserve the smallest type for metadata and counts.

## Layout

The desktop shell has a sticky navigation rail (176px), a flexible content column, and a top status bar (61px). The main region has a maximum width (1720px) and generous horizontal padding from the page spacing token. Working areas stay flat and closely aligned.

The run workspace joins a flexible table to a right inspector (300px) inside one bordered surface. The table toolbar wraps filters and search. Table cells use compact vertical padding (10px) and the cell spacing token horizontally. The inspector uses internal padding (22px). Supporting input and game controls follow the same column alignment below. Settings and reading pages use a main column with a narrower notes column; the console has a command list and a detail area.

Responsive behavior is specific to this dashboard:

| Width | Implemented behavior |
| --- | --- |
| At most 1180px | Rail becomes 146px; page padding becomes 24px; inspector becomes 270px. |
| 701–900px | Rail becomes 68px with accessible icon navigation; table and a 245px inspector remain side by side. Inspector actions move above rationale, and artwork height is capped at 140px. The Type column is hidden. |
| At most 700px | The inspector follows the table in the same surface. Supporting regions and reading layouts stack. |
| At most 600px | Navigation moves above content and wraps; labels are visible. Page padding becomes 16px. The Type column is hidden, search spans the toolbar, and the table scroll region is capped at 420px with a sticky header. |

These measurements describe the current surface; the surface brief owns its task flow and composition.

## Elevation & Depth

Persistent panels use borders and changes of tone. They do not use drop shadows. Select popups are temporary overlays and use the component library's medium shadow with a fine ring. Its exact value is recorded in the sidecar.

Keyboard focus is a visible ring. Standard buttons, links, summaries, and ranges also receive an outline (2px) offset from the control (3px). Base UI form controls add their component focus ring (3px at half ring opacity).

**The Flat Surface Rule.** Use borders and surface tone to separate persistent content. Reserve floating elevation for temporary overlays.

Motion communicates state: navigation changes background over 120ms, standard control transitions use the library's 150ms timing, and selected rows briefly highlight over 230ms. The row highlight runs only when reduced motion is not requested. The reduced-motion override shortens animations and transitions to 0.01ms.

## Shapes

Controls use modestly rounded corners; the workspace is a little softer. State labels are small rounded rectangles. Switches and the cost marker are circular or fully rounded because their function calls for it. One-pixel rules organize tables and panels. The interface uses Lucide SVG icons, never text glyphs as icon substitutes.

## Components

### Buttons

Compact, plainly labeled actions use the shadcn Button backed by Base UI. The primary variant is deep green. Outline actions retain a fine border; ghost actions appear without a resting fill. Destructive actions use a pale red fill with red text. Primary hover reduces fill opacity; outline and ghost hover use the muted surface. Destructive hover strengthens the pale fill.

The standard height and padding are in the frontmatter. Smaller variants are used where needed. Buttons preserve visible focus, show pressed movement where appropriate, and reduce opacity when disabled. Game actions are disabled when the game is unavailable or the request is pending; eligibility can also disable individual actions.

### Inputs / Fields

Text inputs and select triggers share the control radius, input border, compact height, and green focus treatment. Settings fields rest on white. Inputs use text at 16px below the library's medium breakpoint and 14px above it, unless the specific field supplies its own size. Search is deliberately lighter, with no resting border or shadow. Textareas grow vertically; the speech input has a minimum height (88px), white background, and comfortable internal padding (12px).

Base UI manages select behavior. Invalid fields use the destructive border and ring; disabled fields lose emphasis. Labels and nearby help text explain each control.

### Prompt editors

Prompt editors extend the flat settings layout. Six native disclosures are separated by fine horizontal rules; the classifier opens initially. Each summary groups a strong title, muted model label, explicit Default, Custom, or Unsaved state, and a chevron that turns when expanded. Summaries retain the shared keyboard focus outline.

The editor uses the existing white surface, input border, and control radius. Its textarea fills the column, grows vertically from a minimum height (260px), and uses comfortable padding (14px) with body-size text and a looser line height (1.65). The label and nearby description identify the instructions being edited. The action row wraps with the existing compact spacing (8px): Save prompt is primary, Use default is outlined, and Discard edits is a ghost action shown when the draft differs. Pending saves disable the editor and its actions; the primary label becomes Saving….

Required response and game rules sit in a quieter nested disclosure. The notes column explains when edits apply and where prompts are stored. It follows the editors at widths of 900px or less, matching the existing reading layout. Loading uses a status message; a failed load provides an alert and Try again action.

### Navigation

The current page uses a pale filled item with dark green text on the dark rail. Other items use light muted text, gaining a darker green hover fill and white text. Every navigation button has an accessible name. The current page is marked with `aria-current`. At intermediate widths, icons retain those names; mobile restores visible text labels.

### Chips

Status labels are quiet read-only text, with ordinary, generated, and failed treatments. Pile and job filters are buttons with a pale selected background and stronger text. They expose `aria-pressed`; they are not decorative tags.

### Cards / Containers

The run table and inspector share one outer boundary. The inspector uses tone and a divider to read as the detail region of that table. History and job entries use spacing and horizontal rules rather than a separate raised card around every item.

### Selection and inspector

Card names are real buttons. The selected button exposes `aria-pressed` and points to the inspector with `aria-controls`. The corresponding row has a pale selected fill, and row hover uses a separate light fill. Preserve the focus outline so keyboard selection remains visible.

The inspector puts card identity, cost, description, generation actions, and rationale together. At intermediate widths the actions appear before the rationale to keep them within reach.

### Switches

Base UI switches use a green checked track, an input-colored unchecked track, and a light circular thumb. Keep the label and supporting sentence beside the switch, including its expanded interaction area and visible focus.

### Artwork and state messages

Artwork is runtime card content served by the API. The inspector normally crops it to a 4:3 frame; job artwork uses a compact width. Loading and failed artwork states occupy a clear placeholder. No raster artwork is shipped in the dashboard UI asset directory.

Connection text distinguishes game availability from companion failure. Pending work appears as a status message; errors use an alert with recovery wording. Color reinforces these messages.

Speech setup replaces the model folder input with a plain readiness label. During download, a full-width native progress bar uses the primary accent and a text amount below it. Checking and local copying use an indeterminate bar with an explanation. Failure shows an alert and an outlined Retry speech setup button. Settings remains editable while health updates arrive; Voice also shows setup status while preparation is incomplete. Attribution links sit beneath the status in the existing help-text style.

## Do's and Don'ts

### Do:

- **Do** reuse the semantic colors and shadcn components built on Base UI.
- **Do** preserve keyboard focus, accessible selection state, and text labels for status.
- **Do** keep numeric data aligned with tabular figures.
- **Do** let the table scroll inside its container while keeping the inspector available at narrow widths.
- **Do** describe pending, offline, and failed actions accurately, including the available recovery.
- **Do** give runtime card artwork a defined content area and a useful loading or failure state.

### Don't:

- **Don't** treat the unused scaffold dark theme or chart palette as a confirmed dashboard design.
- **Don't** communicate a selected card or a connection state through color alone.
- **Don't** show an unavailable game action as enabled.
- **Don't** turn generated card artwork into a decorative dashboard background.
- **Don't** add promotional copy or invented labels to operational controls.
