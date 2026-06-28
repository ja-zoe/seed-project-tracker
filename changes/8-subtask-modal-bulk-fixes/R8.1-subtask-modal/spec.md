# R8.1 — Subtask modal (create + whole-record edit)

**Status:** in progress (round 2 — review feedback)
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

- [x] `pnpm build` / typecheck passes; `dialog.tsx` imports no `lucide-react` (swapped `XIcon` → Phosphor `X`)
- [x] Playwright: "+ Add subtask" opens a modal (not a navigation); title + submit creates the row
      without a full page load (URL stays on the project page)
- [x] Playwright: "edit in modal" pre-fills all fields; changing title + status saves (row reflects new
      title; deliverable re-derives to In Progress)
- [x] Playwright: the modal date input `max` = deliverable target date (`2026-12-31`)
- [x] App: empty title rejected ("Title is required"); Escape closes without saving
- [x] App: inline edits still work alongside the modal (title pencil visible — regression)
- [x] Build: the `/subtasks/new` route is gone (returns 404) and nothing links to it (grep clean)

## Notes / log
- 2026-06-27 — Specced. No code written.
- 2026-06-27 — Implemented. Added shadcn **Dialog** (`@base-ui/react/dialog`; replaced the Lucide
  `XIcon` with Phosphor `X`). New `SubtaskModal` (create + edit modes) wired to `createSubtask` /
  `updateSubtask` after removing their trailing `redirect` (the `/subtasks/[sid]/edit` page now
  redirects in its own wrapper). Deleted the `/subtasks/new` page. Triggers: "+ Add subtask" opens
  create; a `NotePencil` icon per row opens edit. Added `description` to the subtask interface +
  project-page query (R8.2 reuses it). Updated all older e2e helpers to seed subtasks via the modal
  (`e2e/helpers.ts` `addSubtaskViaModal`); full subtask-surface suite (9 tests) green. Branch:
  `feat/set8/R8.1-subtask-modal`.

## Review feedback — round 2 (2026-06-28)

**Problem:** The modal's description field is a plain `<textarea>`. The user wants the subtask
description to support **Markdown or plain** text (consistent with the rest of the app, which already
ships `react-markdown` + `remark-gfm` and a `MarkdownEditor` component with an MD/Plain toggle).

**Approach:**
- Give the modal's **Description** field Markdown support with an MD/Plain toggle, reusing the existing
  `MarkdownEditor` pattern (`src/components/markdown-editor.tsx` — `react-markdown` + `remark-gfm`,
  `mode: "md" | "plain"`, live preview).
- Caveat: `MarkdownEditor` is **uncontrolled** (it reads/writes via a `name`d field for `<form>`
  submission), but `SubtaskModal` builds `FormData` **manually** from controlled state. Two clean
  options — pick one when implementing:
  1. Wrap the modal body in a `<form>` and let `MarkdownEditor name="description"` feed `FormData`
     (submit via the form's `onSubmit` / a `requestSubmit()`), **or**
  2. Add a small **controlled** markdown field (textarea + MD/Plain toggle + `ReactMarkdown` preview)
     that writes to the modal's existing `description` state.
  Recommendation: option 2 (keeps the modal's controlled-submit flow intact; factor the toggle+preview
  into a tiny reusable piece shared with R8.2's renderer if convenient).
- No DB change — `description` is already `String?`; "md or plain" is an editor/render concern. Plain
  text renders fine through the Markdown renderer, so no per-record format flag is needed.

**Round-2 tests:**
- [x] `pnpm build` / typecheck passes (existing R8.1 test still green — textarea keeps its testid)
- [x] Playwright: the modal description offers MD/Plain + Write/Preview; Preview renders Markdown;
      entering `**bold via modal**` and saving round-trips to the expanded row as a `<strong>`
- [x] App: Plain mode hides the Write/Preview tabs; plain text still saves and displays unchanged

Implemented by making `MarkdownEditor` optionally **controlled** (`value` + `onChange`, `name` now
optional, `textareaTestId` passthrough) and using it for the modal's Description (controlled by the
modal's existing `description` state). No DB change.
