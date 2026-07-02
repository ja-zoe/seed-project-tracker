# R22.4 — implementation log

- 2026-07-02 — Implemented. New `src/components/action-feedback.tsx` exports the shared primitives:
  `ActionSpinner` (CircleNotch), `SuccessCheck` (GSAP back.out pop, reduced-motion aware via
  `gsap.matchMedia`), `useSettleFlash(pending)` (success flash after a pending→idle transition),
  `successDelay()` (modals hold ~600 ms so the confirmation is seen before closing), and
  `PendingIconButton` (useFormStatus icon button for server-component `<form action>` one-click controls).
- `SubmitButton` upgraded: spinner + settle-flash check, grid-stacked labels for zero layout shift,
  `data-state` attribute for tests. Rolled out to raw submit buttons in server pages (projects/new, members,
  meeting/new, pm/users ×8, pm/settings ×4, profile setup).
- `InlineConfirm`'s ✓ becomes a spinner while `disabled` — one edit upgraded every armed-confirm flow in the
  app (deliverable/subtask/action-item/project/meeting/status-update deletes, inline field commits).
- Modals (deliverable/subtask/project/action-item/status-update edit) now flash `saved` (SuccessCheck +
  label) before closing; calendar event editor, notification bell, account token controls, projects bulk
  delete, profile settings, my-tasks & action-items quick-completes got per-control spinners.
- Fixed in passing: R22.1's export e2e had a tsc error (exceljs Buffer typing) that slipped in after that
  feature's tsc gate ran — cast added, noted here for honesty.
- Found two PRE-EXISTING e2e failures on main while regression-testing (bell popover click interception on
  the dashboard; r7 semester hidden-input fill) — documented in tests.md, left unfixed (out of scope).
