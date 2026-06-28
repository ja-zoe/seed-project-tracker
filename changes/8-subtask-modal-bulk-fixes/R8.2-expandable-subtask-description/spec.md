# R8.2 — Expandable subtask description

**Status:** planned
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

- [ ] `pnpm build` / typecheck passes
- [ ] Playwright: clicking a subtask's title expands a region showing its description; the next
      subtask row moves **down** (its `y` increases vs collapsed)
- [ ] Playwright: clicking the title again (or another subtask) collapses/switches the expansion
- [ ] Playwright: clicking the status pill / assignee name / pencil does **not** toggle expansion
- [ ] App: a subtask with no description shows a muted "No description" when expanded
- [ ] App: `aria-expanded` reflects state; `Enter`/`Space` on the title toggles it

## Notes / log
- 2026-06-27 — Specced. No code written.
