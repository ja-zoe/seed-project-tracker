# R9.2 — Deliverable status + delete microinteractions

**Status:** planned
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
- [ ] `pnpm build` / typecheck passes
- [ ] Playwright: on a no-subtask deliverable, picking a new status reveals ✓/✗ (CheckFat/XCircle);
      ✓ commits (badge + bg update), ✗ reverts — no immediate commit on pick
- [ ] Playwright: clicking Delete arms a ✓/✗ confirm; ✗ cancels (deliverable stays); ✓ deletes it
- [ ] App: the confirm icons match the subtask status pill's (same glyphs/weight/green)
- [ ] App: deliverables **with** subtasks still show the locked badge + tooltip (no status confirm)

## Notes / log
- 2026-06-28 — Specced. No code written.
