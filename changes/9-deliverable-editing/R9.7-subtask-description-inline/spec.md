# R9.7 — Subtask description inline edit (like the deliverable description)

**Status:** planned
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
- [ ] `pnpm build` / typecheck passes
- [ ] Playwright: expand a subtask → an Edit affordance shows; clicking it opens a `MarkdownEditor`
      with the current description; entering `**bold**` + ✓ persists and re-renders as Markdown
- [ ] Playwright: ✗ / Esc cancels without saving
- [ ] App: empty description clears to "No description"; the subtask modal description still works

## Notes / log
- 2026-06-28 — Specced. No code written.
