# R7.4 — Inline deliverable editing (title + start/end date)

**Status:** tests passing
**Files:**
- `src/components/sortable-deliverables.tsx`
- `src/lib/actions/deliverables.ts`

**Depends on:** R7.2 (`InlineConfirm` primitive — must land first).

## Spec

**Problem:** A deliverable's title and dates can only be changed on the separate
`/projects/[id]/deliverables/[did]/edit` page. We want to edit the deliverable **title**,
**start date**, and **end date** inline in `SortableDeliverables`, using the same animated
confirm microinteraction as the status pill (R7.2).

**Date mapping (decision):** the `Deliverable` model has `startDate` (nullable) and `targetDate`
(required); there is no `endDate` column. **"Start date" = `startDate`, "end date" = `targetDate`.**
No schema change.

**Approach:**

*Server actions* — add to `src/lib/actions/deliverables.ts`, mirroring the R6.3 subtask inline
actions (auth via project membership / `MANAGE_MILESTONES`, same as the existing
`updateDeliverableStatus`), each calling `revalidatePath` on the project page:
- `updateDeliverableTitle(deliverableId, title)` — trim; reject empty.
- `updateDeliverableDates(deliverableId, startDate: string | null, targetDate: string)` — parse
  `YYYY-MM-DD`; `targetDate` is required; when both are present, validate `startDate <= targetDate`
  and reject otherwise. (One combined dates action keeps the ordering check in one place.)

*UI* — in the deliverable header (~lines 540–555):
- **Title:** add a hover-revealed `PencilSimple` affordance immediately after the title (matching
  the subtask title pattern from R6.3). Clicking it swaps the title `<span>` for an inline
  `<input>` with the shared **`InlineConfirm`** `✓ / ✗`. `Enter` commits, `Esc` cancels.
- **Dates:** render the deliverable's start and target dates near the title (or in the existing
  "Target:" line on the project page) with the same hover pencil → inline `<input type="date">` +
  `InlineConfirm`. Editing either date opens both date inputs together (since they commit through
  the one `updateDeliverableDates` action and share the `start <= target` validation).
- **State:** add deliverable-scoped edit state separate from the subtask `pendingEdit` —
  `deliverableEdit: { id: string; field: "title" | "dates"; title: string; startDate: string; targetDate: string } | null`
  plus a `useTransition`. Confirm/cancel reuse the animated `InlineConfirm` from R7.2.
- **Permissions:** gate the pencils and inline inputs on `canEdit` / `canManage`, exactly as the
  subtask inline edits. `!canEdit` users see static title and dates.

No DB changes.

## Tests

- [x] `pnpm build` / typecheck passes
- [x] Playwright `r7-deliv-title-edit`: title pencil hidden at rest (opacity 0), shows on hover (opacity 1); click → inline input + InlineConfirm ✓/✗; ✓ commits new title; cancel reverts
- [x] Playwright `r7-deliv-dates-edit`: dates pencil shows on hover; click → two date inputs + InlineConfirm; ✓ persists new dates (Nov 30 visible after commit); startDate > targetDate shows error inline, does not commit
- [x] App: setting `startDate > targetDate` is rejected with "Start must be before target" error visible in UI
- [x] App: confirm/cancel uses the **same** `InlineConfirm` primitive as the status pill (R7.2)

## Notes / log
- 2026-06-27 — Specced. No code written. Reuses R7.2 `InlineConfirm`.
- 2026-06-27 — Implemented. `updateDeliverableTitle` and `updateDeliverableDates` added to `deliverables.ts`. Deliverable header uses `group/deliv` + `group/deliv-dates` for hover pencils. `deliverableEdit` state is separate from subtask `pendingEdit`. `toDateInput()` helper slices ISO strings to YYYY-MM-DD for `<input type="date">`. Both tests pass. Branch: `feat/set7/R7.4-inline-deliverable-editing`.
