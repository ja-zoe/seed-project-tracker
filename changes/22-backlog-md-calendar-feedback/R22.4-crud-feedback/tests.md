# R22.4 — test scheme (merge gate)

## Build & boot
- [ ] `pnpm build` / `tsc --noEmit` clean (modulo pre-existing `r14-design-shots` error)
- [ ] App boots; no hydration warnings introduced

## Primitive behavior (verify once, on any form)
- [ ] Pending: spinner + pending label appear immediately on submit; button width does not shift
- [ ] Success-while-mounted: check + success label for ~1 s, then reset to idle
- [ ] Modal-closing forms: the affected row shows the tint-settle confirmation after close
- [ ] Server-action failure: button returns to idle and the surface's existing error handling still shows
- [ ] Double-submit impossible while pending (button disabled)
- [ ] `prefers-reduced-motion: reduce` → no motion; instant state swaps only

## Rollout matrix — each surface shows pending AND confirmation
Modals:
- [ ] Project create/edit (project-modal)
- [ ] Deliverable create/edit (deliverable-modal)
- [ ] Subtask create/edit (subtask-modal)
- [ ] Action-item create/edit (action-item-modal)
- [ ] Standing edit (status-update-controls) + delete
- [ ] Meeting record edit/delete (meeting-record-controls)
- [ ] Calendar event create/edit/delete (semester-calendar)

Inline:
- [ ] Deliverable status pill / priority / group / date chips / reorder / delete (sortable-deliverables)
- [ ] Backlog move/restore control (after R22.1 merges)
- [ ] Action-item close/reopen/delete (action-items-section + /action-items hub)
- [ ] Member role change + remove (member-role-control)
- [ ] PM user activate/role/deactivate (user-row-controls)
- [ ] Notification bell: clear all + per-item dismiss
- [ ] My Tasks: subtask quick-complete + action-item quick-complete

Full-page forms:
- [ ] /deliverables/new · subtask edit page · /status/new (switcher) · profile settings ·
      /account token generation · pm/settings · role builder

## Playwright
- [ ] `e2e/r22-crud-feedback.spec.ts` — representative flows (one modal, one inline, one full-page form):
      assert spinner appears on submit, success indicator appears, then state settles; screenshots captured
      (restore any deleted tracked PNGs in `e2e/screenshots` afterward — known gotcha)

## Notes
- Destructive flows must retain the set-7 slide-in confirm; the spinner appears inside it while deleting.
