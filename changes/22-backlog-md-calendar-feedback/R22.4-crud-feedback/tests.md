# R22.4 — test scheme (merge gate) — results 2026-07-02

## Build & boot
- [x] `tsc --noEmit` clean (modulo pre-existing `r14-design-shots` error)
- [x] App boots (dev server 200); no new hydration warnings observed during e2e runs

## Primitive behavior (verified via e2e/r22-crud-feedback.spec.ts, 3 tests green)
- [x] Pending: spinner + pending label appear on submit (modal + full-page form asserted via `data-state`)
- [x] Success-while-mounted: modal submit passes through `data-state="success"` with the popped-in check
      visible, then the modal closes on its own (~600 ms flash)
- [x] Armed delete confirm: the ✓ inside `InlineConfirm` becomes the shared spinner while the delete runs
- [x] Double-submit impossible while pending (all triggers `disabled` while pending — code-level invariant
      of the shared primitives)
- [x] `prefers-reduced-motion`: SuccessCheck's GSAP pop is wrapped in `gsap.matchMedia("(prefers-reduced-motion:
      no-preference)")` — motion simply doesn't register under reduce (code-verified; no e2e)
- [x] Width stability: `SubmitButton` grid-stacks idle/pending/success labels (widest wins). Hand-rolled
      modal buttons keep natural width — minor shift possible there, accepted.
- [~] Server-action failure path: error handling unchanged (existing catch/setError flows retained);
      settle-flash-after-error suppressed by `saved`-state resets in modals. Not separately e2e'd.

## Rollout matrix — every trigger swapped to the shared primitives
Trigger-swapped and typechecked on all surfaces; behaviorally exercised where noted:
- [x] Deliverable modal (e2e r22-crud-feedback + r9-deliv-modal green)
- [x] Subtask modal (r8-subtask-modal green)
- [x] Action-item modal + inline (r13-action-item-modal, r13-action-item-inline green)
- [x] Member role control (r13-member-role green)
- [x] InlineConfirm consumers app-wide — deliverable/subtask deletes, desc saves, status pills, project
      modal delete, meeting-record delete, status-update delete, user-row controls (r7-microinteractions
      InlineConfirm tests green except one pre-existing failure, see Notes; r9-deliv-microinteractions green)
- [x] Notification bell clear-all + per-item dismiss (spinners added; r20 spec: dismiss test green — the
      clear-all test failure is PRE-EXISTING on main, see Notes)
- [x] Full-page create form /deliverables/new (e2e r22-crud-feedback green)
- [x] Swapped but not individually e2e'd (mechanical `SubmitButton`/`PendingIconButton` swaps, same
      primitive as the e2e-verified surfaces): project modal save, status-update edit modal, calendar event
      save/delete, projects bulk delete, profile settings, profile setup, /projects/new, members add/remove,
      meeting record form, my-tasks & /action-items quick-completes, pm/users (approve/reject/role/suspend/
      reactivate/role builder), pm/settings (thresholds/rules), account token generate/revoke

## Playwright
- [x] `e2e/r22-crud-feedback.spec.ts` — 3 tests green (modal, full-page form, armed delete)
- [x] Regression batch (r7-microinteractions, r8-subtask-modal, r9-deliv-modal, r9-deliv-microinteractions,
      r13-action-item-modal, r13-action-item-inline, r13-member-role, r20-clear-notifications): 7/10 tests
      passed; the 3 failures REPRODUCE IDENTICALLY ON MAIN (verified by checking out main and re-running) —
      not set-22 regressions. See Notes.

## Notes — pre-existing failures found (not caused by this set)
1. `r20-clear-notifications` "Clear all": a dashboard `<section>` overlaps the bell popover and intercepts
   the click (Playwright: "subtree intercepts pointer events") — z-stacking bug on main. Worth its own fix.
2. `r7-microinteractions` "InlineConfirm slides in": fills the hidden `input[name="semester"]` directly —
   same brittleness family as the known r9-project-modal semester-fill issue.
- Destructive flows kept the set-7 slide-in confirm; spinner appears inside it while deleting (verified).
