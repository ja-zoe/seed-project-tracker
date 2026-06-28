# R8.3 — Subtask due-date bounds & year display

**Status:** tests passing
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

- [x] `pnpm build` / typecheck passes
- [x] Playwright: the inline subtask due-date input exposes `max` = the deliverable's target date
      (`2026-12-31`); the R8.1 modal date input does too (asserted in R8.1)
- [x] Playwright: the modal guards an out-of-range date ("Due date can't be after the deliverable's
      target date"); server-side `assertDueWithinDeliverable` enforces it in create/update/dueDate paths
- [x] Playwright: a current-year due date renders without a year; a different-year date renders **with**
      the year (asserted on year presence due to a pre-existing UTC/local day-shift in display)

## Notes / log
- 2026-06-27 — Specced. No code written.
- 2026-06-27 — Implemented. Server: `assertDueWithinDeliverable(deliverableId, dueDate)` rejects dates
  past `targetDate` / before `startDate`; called from `createSubtask`, `updateSubtask`,
  `updateSubtaskDueDate`. Client: inline date input gained `max`/`min` from the deliverable (the modal
  already had them from R8.1); new `formatDueDate()` adds the year only when it isn't the current year.
  Branch: `feat/set8/R8.3-date-bounds`. Note: dates display one day early due to a pre-existing
  UTC-midnight/local-timezone quirk (out of scope here).
