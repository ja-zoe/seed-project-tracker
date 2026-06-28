# R9.2 — Deliverable status + delete microinteractions

**Status:** tests passing
**Files:**
- `src/components/sortable-deliverables.tsx`

**Reuses:** the `InlineConfirm` primitive from R7.2 (CheckFat ✓ green + XCircle ✗).

## Spec

**Problem:** Two deliverable-header controls don't match the subtask status pill's confirm
microinteraction:
1. **Status edit (#2):** for a deliverable with **no subtasks**, the status badge opens
   `DeliverableStatusPopover` (`sortable-deliverables.tsx` ~line 327) and commits the picked status
   **immediately**. It should instead show the animated **✓/✗ `InlineConfirm`** — pick a status, then
   confirm — exactly like the subtask status pill (R7.2).
2. **Delete (#4):** the deliverable **Delete** button (~line 863) submits a form immediately (or with
   no animated confirm). It should use the same **✓/✗ `InlineConfirm`** as the confirm — a click arms
   it, ✓ deletes, ✗ cancels.

**Approach:**
- **Status:** rework the no-subtask deliverable status control to mirror the subtask `StatusPill`:
  clicking the badge opens the status dropdown (portal, reuse `StatusDropdown`/the existing popover
  list); picking a status sets a **pending** state (deliverable-scoped, e.g.
  `pendingDeliverableStatus: { id, status } | null`) and reveals `InlineConfirm`; ✓ →
  `updateDeliverableStatus(id, status)` in a `useTransition`, ✗ → clear pending. Animate the label/bg
  like the pill. (Deliverables **with** subtasks keep the locked badge + R7.3 tooltip — unchanged.)
- **Delete:** replace the immediate-submit Delete with an armed confirm: a `confirmingDeliverableDelete:
  string | null` state; clicking "Delete" arms it and shows `InlineConfirm`; ✓ calls
  `deleteDeliverableAction(id)` in a transition, ✗ disarms. (Pattern mirrors the subtask delete, but
  with the ✓/✗ icons rather than the Yes/No text slide, per the user's request for "the same … check
  and the x icon".)
- Keep both within the deliverable header's control cluster; respect `prefers-reduced-motion` (already
  handled by `InlineConfirm`'s CSS).

No DB changes; no new server actions (reuses `updateDeliverableStatus` + `deleteDeliverableAction`).

## Tests
- [x] `pnpm build` / typecheck passes
- [x] Playwright: on a no-subtask deliverable, picking a new status reveals the ✓/✗ `InlineConfirm`
      (confirm icon is green `rgb(88,129,87)`); ✗ reverts to the original; ✓ commits (badge updates) —
      no immediate commit on pick
- [x] Playwright: clicking Delete arms a ✓/✗ confirm; ✗ cancels (deliverable stays); ✓ deletes it
- [x] App: confirm icons match the subtask status pill's (shared `InlineConfirm` — CheckFat/XCircle)
- [ ] App: deliverables **with** subtasks still show the locked badge + tooltip (unchanged — that
      branch wasn't touched; the pending/confirm logic only applies to the `canEdit` no-subtask branch)

## Notes / log
- 2026-06-28 — Specced. No code written.
- 2026-06-28 — Implemented. `DeliverableStatusPopover` now calls `onSelect` (sets pending) instead of
  committing immediately; the no-subtask badge shows the pending status + a `InlineConfirm`
  (`confirmDeliverableStatus`/`cancelDeliverableStatus`). Delete is now an armed `confirmingDeliverableDelete`
  state with `InlineConfirm` (replaced the immediate form-submit). Confirm regions scoped with
  `deliv-status-confirm` / `deliv-delete-confirm` testids (collapsed `InlineConfirm` keeps a clipped
  non-zero box, so `:visible` can't disambiguate). Branch: `feat/set9/R9.2-deliv-microinteractions`.
