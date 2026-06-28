# R8.3 — Subtask due-date bounds & year display

**Status:** planned
**Files:**
- `src/components/sortable-deliverables.tsx`
- `src/components/subtask-modal.tsx` (the R8.1 modal date input — same bounds)
- `src/lib/actions/deliverables.ts` (server-side validation)

**Depends on:** R8.1 (modal date input shares these bounds).

## Spec

**Problem:** Two date issues:
1. **Unbounded due date.** A subtask's due date can be set **after** the parent deliverable's target
   date (and before its start date), which is nonsensical — a subtask should finish within its
   deliverable's window.
2. **No year in labels.** Due dates render via `formatDateShort` (month + day only). When a due date
   is in a **different year** than the current one, the label is ambiguous — show the year then.

**Approach:**

*Bound the input (client)* — wherever a subtask due date is edited (the inline `<input type="date">`
in `sortable-deliverables.tsx` ~line 990, and the R8.1 modal date field), set:
- `max` = the deliverable's `targetDate` (`YYYY-MM-DD`)
- `min` = the deliverable's `startDate` (`YYYY-MM-DD`) when present
The row already has `deliverable.targetDate` / `startDate` in scope; pass them into the subtask map /
modal as needed.

*Validate (server)* — defense in depth, since `max`/`min` are bypassable. In `updateSubtaskDueDate`
(and the create/update paths in `createSubtask` / `updateSubtask` if they accept a due date), load the
parent deliverable's `startDate`/`targetDate` and reject when `dueDate > targetDate` (or
`dueDate < startDate`). Throw a clear `Error` ("Due date must fall within the deliverable's dates").

*Year-aware formatting* — add a `formatDueDate(iso)` helper (or extend `formatDateShort`): show
`{month} {day}` when `new Date(iso).getFullYear() === new Date().getFullYear()`, else
`{month} {day}, {year}`. Use it for the subtask due-date label (~line 1010). Leave the deliverable
`formatDate` (which already includes the year) as-is.

No DB changes; no new server actions (extends existing ones).

## Tests

- [ ] `pnpm build` / typecheck passes
- [ ] Playwright: the subtask due-date input exposes `max` = the deliverable's target date (and `min`
      = start date when set)
- [ ] App: attempting to save a due date after the deliverable target is rejected (server throws /
      no persist); a date within the window saves
- [ ] Playwright/unit: a due date in the current year renders without a year; a date in another year
      renders **with** the year
- [ ] App: the bound applies in **both** the inline editor and the R8.1 modal

## Notes / log
- 2026-06-27 — Specced. No code written.
