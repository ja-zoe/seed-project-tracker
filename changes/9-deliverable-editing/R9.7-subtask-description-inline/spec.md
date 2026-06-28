# R9.7 — Subtask description inline edit (like the deliverable description)

**Status:** tests passing
**Files:**
- `src/components/sortable-deliverables.tsx`
- `src/lib/actions/deliverables.ts` (`updateSubtaskDescription`)

**Mirrors:** R9.4 (deliverable description inline edit). Reuses `MarkdownView`, the controllable
`MarkdownEditor`, and `InlineConfirm`.

## Spec

**Problem:** A subtask's description currently expands read-only (R8.2 renders it as Markdown), and
can only be **edited** in the subtask modal (R8.1). The user wants to edit it **inline** in the
expanded subtask region — exactly like the deliverable description (R9.4) — without opening the modal.

**Approach:**
- **Server action** `updateSubtaskDescription(subtaskId, description: string | null)` in
  `deliverables.ts` — membership/`MANAGE_MILESTONES`-gated like the other subtask inline edits; empty
  → `null`; `revalidatePath`.
- **UI:** in the expanded subtask description region (`data-testid="subtask-description"`, added in
  R8.2), when `canEdit`, add an "Edit" affordance (a hover `PencilSimple`, matching R9.4) that swaps the
  rendered `MarkdownView` for a controlled `MarkdownEditor` (MD/Plain toggle) + the shared
  `InlineConfirm` ✓/✗. ✓ → `updateSubtaskDescription` in a `useTransition`; ✗ → revert; `Esc` cancels.
- **State:** `subtaskDescEdit: { id: string; value: string } | null` + a `useTransition`, parallel to
  R9.4's `deliverableDescEdit`. Gate on `canEdit`.
- The subtask **modal** (R8.1) keeps its description field too — inline is an *additional* path, exactly
  as for deliverables.

No DB changes (`Subtask.description` already exists; Markdown vs plain is a render/edit concern).

## Tests
- [x] `pnpm build` / typecheck passes
- [x] Playwright: expand a subtask → "No description" + Edit pencil; click → `MarkdownEditor`; entering
      `**bold**` + ✓ persists and re-renders as Markdown (`<strong>`)
- [x] Playwright: ✗ cancels without saving (reverts to the prior description)
- [x] App: empty description shows "No description"; the subtask modal description still works (unchanged)

## Notes / log
- 2026-06-28 — Specced. No code written.

- 2026-06-28 — Implemented & Playwright-verified. `updateSubtaskDescription` + `subtaskDescEdit` state; the expanded region mirrors R9.4 (MarkdownView read / MarkdownEditor + InlineConfirm edit). Branch: `feat/set9/R9.7-subtask-desc-inline`.
