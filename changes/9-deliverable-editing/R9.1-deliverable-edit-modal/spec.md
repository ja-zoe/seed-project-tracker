# R9.1 — Deliverable edit modal

**Status:** planned
**Files:**
- `src/components/deliverable-modal.tsx` (new)
- `src/components/sortable-deliverables.tsx` (wire the trigger)
- `src/lib/actions/deliverables.ts` (`updateDeliverable` modal-friendly; maybe `createDeliverable`)
- `src/app/(app)/projects/[id]/deliverables/[did]/edit/` (**deleted** if Q3 = convert)
- `src/app/(app)/projects/[id]/deliverables/new/` (deleted only if Q3 = convert both)

**Depends on:** R9.5 (priority field in the form) and R9.3 (group combobox) — land those first, or
ship the modal with title/dates/description/status and add priority+group as they arrive.

## Spec

**Problem:** Editing a deliverable navigates to a full page (`/deliverables/[did]/edit`). The user
wants it to be a **modal**, mirroring the R8.1 subtask modal (which replaced `/subtasks/new`).

**Approach:**
- Reuse the shadcn **Dialog** from R8.1 (`src/components/ui/dialog.tsx`). New `DeliverableModal`
  (`"use client"`), edit mode (and create mode if Q3 = convert both). Fields: **title** (required),
  **group** (the R9.3 combobox — existing groups + create-new), **start date** + **target date**
  (`startDate ≤ targetDate` guard, as R7.4), **description** (Markdown/plain via `MarkdownEditor` or a
  controlled markdown field, as in R8.1 round-2), **priority** (R9.5), and **status** (only editable
  when the deliverable has **no subtasks** — otherwise it's derived/locked; show it read-only with the
  lock reason, matching the inline rule).
- Wire submit to **`updateDeliverable`** (already exists; it currently `redirect`s — make it
  redirect-free like R8.1 did for `createSubtask`/`updateSubtask`, since the modal closes itself and
  `revalidatePath` refreshes in place). If Q3 = convert both, `createDeliverable` likewise.
- **Trigger:** the deliverable header's existing "Edit" link (`sortable-deliverables.tsx` ~line 856)
  becomes the modal trigger (`render` prop on `DialogTrigger`, as in R8.1). Inline edits from R7.4
  (title/dates) and Set-9 inline edits (group/priority/description) all **stay** — the modal is the
  "edit everything at once" option.
- **Delete the edit page** (Q3) and repoint/remove any links to it. The existing per-field server
  actions are untouched.

No new DB changes here (priority's column is R9.5).

## Tests
- [ ] `pnpm build` / typecheck passes
- [ ] Playwright: the deliverable "Edit" opens a modal (not a navigation); changing title + dates +
      description + priority (+ group) and saving persists them without a full page load
- [ ] App: a deliverable **with** subtasks shows status as locked/derived (not editable) in the modal;
      one **without** subtasks can set status
- [ ] App: `startDate > targetDate` rejected; empty title rejected
- [ ] Build: if Q3 = convert, the `/deliverables/[did]/edit` route is gone and nothing links to it
- [ ] App: inline deliverable edits (R7.4 + R9.x) still work alongside the modal (regression)

## Notes / log
- 2026-06-28 — Specced. No code written.
