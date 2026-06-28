# R8.2 — Expandable subtask description

**Status:** in progress (round 2 — review feedback)
**Files:**
- `src/components/sortable-deliverables.tsx`
- the project page that queries deliverables/subtasks (add `description` to the `select` and pass it
  through) — `src/app/(app)/projects/[id]/page.tsx` (or whichever route renders `SortableDeliverables`)

## Spec

**Problem:** Subtask **descriptions** aren't visible in the list at all. Clicking a subtask should
reveal its description inline, **pushing the sibling subtasks down** (an accordion-style expand), so a
description can be read without opening the edit page/modal.

**Approach:**

*Data plumbing* — the `Subtask` Prisma model already has `description: String?`, but the component's
`Subtask` interface (`sortable-deliverables.tsx` ~line 33) and the page's query `select` don't include
it. Add `description: string | null` to the interface and add `description: true` to the subtask
`select` in the project page query, passing it through to `SortableDeliverables`.

*Expand state* — add `expandedSubtaskId: string | null` state. Clicking a subtask **toggles** it
(click again or click another to collapse/switch). The expanded region renders **below** the subtask
row, inside the existing `divide-y` list, so document flow pushes later rows down naturally — no
absolute positioning. Content: the description text (mono/secondary styling), or a muted
"No description" when null. A light height/opacity transition is fine but not required (the reflow is
the key behavior).

*Click target — don't fight the inline controls* — the row already has many interactive elements
(title pencil, status pill, assignee name, due-date calendar, delete, and R8.1's modal trigger).
Clicking those must **not** toggle expansion. Put the toggle handler on the **title text span only**
(make the static title text a button/clickable region), or put it on the row with `stopPropagation`
on every interactive child. Prefer the explicit "title text toggles" approach — it's unambiguous and
keeps the controls click-safe. The title's edit **pencil** stays separate (hover-revealed) and does
not toggle expansion.

*Accessibility* — the clickable title gets `aria-expanded` and toggles on `Enter`/`Space`.

No DB changes (description already exists); no new server actions.

## Tests

- [x] `pnpm build` / typecheck passes
- [x] Playwright: clicking a subtask's title expands a region showing its description; the next row
      moves **down** (y 325 → 353)
- [x] Playwright: clicking the title again collapses; switching to another subtask switches expansion
- [x] Playwright: clicking the status pill does **not** toggle expansion
- [x] App: a subtask with no description shows a muted italic "No description" when expanded
- [x] App: `aria-expanded` reflects state (the title is a real `<button>`, so Enter/Space toggle it)

## Notes / log
- 2026-06-27 — Specced. No code written.
- 2026-06-27 — Implemented. `description` already plumbed in R8.1. Added `expandedSubtaskId` state;
  restructured each subtask row into a column (inner flex row + an expansion region below) so the
  expanded description pushes following rows down via normal flow. The static title became a
  `<button data-testid="subtask-title-toggle">` with `aria-expanded`; the inline pencil/pill/assignee
  controls are separate elements, so they don't toggle expansion. Branch: `feat/set8/R8.2-expandable-desc`.

## Review feedback — round 2 (2026-06-28)

Two changes:

**1. Render the description as Markdown (pairs with R8.1 round-2).** The expanded region currently
renders the description as plain `<p className="whitespace-pre-wrap">`. Render it with `ReactMarkdown`
+ `remark-gfm` (the libs are already installed) inside a `.prose`-ish wrapper sized for the small
muted text. Plain text still renders correctly. Keep the muted italic "No description" fallback.

**2. Click anywhere on the row (not a control) toggles the description (#5).** Today only the title
`<button data-testid="subtask-title-toggle">` toggles expansion. Make the **whole row** a toggle
target: add an `onClick` to the inner row-content container that toggles `expandedSubtaskId`, but
**ignore clicks that originate from an interactive element** — guard with
`if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"], [data-no-expand]')) return;`
so the status pill, assignee name/picker, pencils, due-date calendar, edit-modal trigger, and delete
all keep working without toggling. Give the row content `cursor-pointer` and `role="button"` +
`aria-expanded` for affordance/accessibility. The title can stop being its own button (the row handles
it) or stay — either is fine as long as exactly one toggle fires per click.

Caveat to watch: the `InlineConfirm` ✓/✗, the assignee picker portal, and the bullet are inside the
row — the `closest(...)` guard covers the buttons; the bullet is an `aria-hidden` span (clicking it
toggling is acceptable, or add `[data-no-expand]` to exclude it).

**Round-2 tests:**
- [x] `pnpm build` / typecheck passes
- [x] Playwright: a Markdown description (`**bold**` + a list) renders as HTML (`<strong>` + `<li>`),
      not literal `**`
- [x] Playwright: clicking the row body (the bullet / non-control area) toggles the description;
      clicking the status pill does **not** toggle it
- [x] App: `role="button"` + `aria-expanded` on the row body (`data-testid="subtask-row-body"`); the
      title button still provides the keyboard toggle path

Implemented via a shared `MarkdownView` (`src/components/markdown-view.tsx`, `react-markdown`+`remark-gfm`).
Row-body `onClick` toggles `expandedSubtaskId` with a `closest('button, a, input, select, textarea,
[data-no-expand]')` guard; the row's own `role="button"` is a `<div>` so it never self-matches.
