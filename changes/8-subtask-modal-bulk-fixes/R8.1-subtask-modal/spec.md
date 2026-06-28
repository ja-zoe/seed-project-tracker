# R8.1 — Subtask modal (create + whole-record edit)

**Status:** planned
**Files:**
- `src/components/ui/dialog.tsx` (new — shadcn Dialog)
- `src/components/subtask-modal.tsx` (new)
- `src/components/sortable-deliverables.tsx` (wire triggers)
- `src/lib/actions/deliverables.ts` (make `createSubtask`/`updateSubtask` modal-friendly)
- `src/app/(app)/projects/[id]/deliverables/[did]/subtasks/new/` (**deleted** — modal replaces it)

**Depends on:** R8.4 (`deriveDeliverableStatus` helper) for the create path; R8.3 for date bounds in
the modal's date input.

## Spec

**Problem:** Subtask **creation** currently navigates to a separate full page
(`/projects/[id]/deliverables/[did]/subtasks/new`). The user wants creation to happen in a **modal**
instead, and additionally wants a modal to **edit the whole subtask at once** (title, description,
assignee, due date, status) as an alternative to the per-field inline edits added in sets 6–7. The
inline edits **stay** — the modal is an *additional* option, not a replacement.

**Approach:**

*Dialog primitive* — add shadcn Dialog: `pnpm dlx shadcn@latest add dialog` → `src/components/ui/dialog.tsx`
(Base UI-backed, like the R7.3 Tooltip). **Lucide check:** verify the generated file imports nothing
from `lucide-react`; if a close-icon sneaks in, swap it for Phosphor `X`. Restyle `DialogContent` to
Forest Floor (card bg, border, `rounded-xl`, no heavy shadow).

*`SubtaskModal` component* (`"use client"`) — one component, two modes:
- `mode: "create"` — props `{ deliverableId, members, deliverableStart, deliverableTarget }`. Fields:
  title (required), description (textarea), assignee (member picker — reuse the `AssigneeSearch` list
  or a simple `<select>` of `members`), due date (`<input type="date">`, bounded per R8.3). Status is
  fixed to `NOT_STARTED` on create (derived afterward). Submit → `createSubtask`.
- `mode: "edit"` — props `{ subtask, members, deliverableStart, deliverableTarget }`. Same fields,
  pre-filled, **plus** a status control (the full `ALL_STATUSES` set). Submit → `updateSubtask`.
- Local form state in the modal; on submit, build a `FormData` and call the server action inside a
  `useTransition`; close the dialog on success. Show inline validation for empty title.

*Make the actions modal-friendly* — `createSubtask` and `updateSubtask` currently end with
`redirect(\`/projects/${projectId}\`)`. A redirect is hostile to a client-modal flow. Remove the
trailing `redirect` from both (the existing `revalidatePath(\`/projects/${projectId}\`)` already
refreshes the RSC tree in place); the modal closes itself client-side.

*Delete the old page* — remove the `/projects/[id]/deliverables/[did]/subtasks/new/` route entirely;
the modal fully replaces it. Grep for any `Link`/`href` to `…/subtasks/new` and repoint them at the
modal trigger.

*Triggers in `sortable-deliverables.tsx`* —
- The "**+ Add subtask**" affordance under each deliverable currently links to the new-subtask page;
  change it to open `SubtaskModal` in `create` mode for that deliverable.
- Add an "**edit in modal**" affordance on each subtask row (e.g. a small expand/pencil-page icon, or
  surface it from R8.2's expanded view) that opens `SubtaskModal` in `edit` mode with that subtask.
- All existing inline edits (title pencil, status pill, assignee name, due-date calendar) **remain
  unchanged** and continue to work.
- `canEdit` gates create/edit triggers exactly as the inline edits do.

No DB changes; reuses existing `createSubtask` / `updateSubtask` (minus their redirects).

## Tests

- [ ] `pnpm build` / typecheck passes; `dialog.tsx` imports no `lucide-react`
- [ ] Playwright: clicking "+ Add subtask" opens a modal (not a navigation); filling title + submit
      creates the subtask and the row appears without a full page load
- [ ] Playwright: opening a subtask's "edit in modal" pre-fills all fields; changing title + status +
      due date and saving persists all three (row reflects them after revalidation)
- [ ] Playwright: the modal's date input enforces the deliverable bound (R8.3) — `max` = deliverable
      target date
- [ ] App: empty title is rejected in the modal (no submit); Escape / overlay click closes without saving
- [ ] App: inline edits still work alongside the modal (regression check on the status pill + title pencil)
- [ ] Build: the `/subtasks/new` route is gone and nothing links to it (grep clean)

## Notes / log
- 2026-06-27 — Specced. No code written.
