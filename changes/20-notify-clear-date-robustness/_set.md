# Revision Set 20 — Notification clearing & date-input robustness

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 20. Per-feature specs live in the sibling `R20.*` files;
load only the feature(s) you are working on.

> **Planned 2026-06-30 (specs only — no code yet).** Two independent fixes from user review that don't
> belong to set 18 (MCP/deletes/action-CRUD) or set 19 (clickability): users can't clear notifications, and
> entering an impossible date (e.g. 06/31/2026) crashes the whole page instead of being caught in the field.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [x] R20.1 — Clear notifications — a "Clear all" control (and per-item dismiss) in the notification bell,
      backed by a delete endpoint/action
- [x] R20.2 — Date-input robustness — an impossible/invalid date must surface inline on the field, never
      throw and crash the page; guard every date-accepting path client + server

## Sequencing & file overlap
- Independent features, no overlap. R20.1: `notification-bell.tsx` + a notifications clear endpoint.
  R20.2: the date `<input type="date">` usages + their server actions + a shared parse guard.
- No DB changes.

## Open questions / decisions before implementing
1. **R20.1 — clear = delete, or mark-hidden?** **Recommendation:** hard-delete the user's notifications
   (`prisma.notification.deleteMany`) — they're transient and there's no archive UI. Provide both "Clear all"
   and per-item dismiss (×). Confirm delete (vs adding a `dismissedAt`/soft-hide column).
2. **R20.2 — scope of the date guard.** **Recommendation:** fix the crash at the root (a shared safe
   date-parse used by every date-accepting server action so an invalid value never reaches Prisma/`.toISOString()`),
   AND add inline field-level validation so the user sees the problem in the picker. Apply to all native
   `<input type="date">` sites (project/deliverable/subtask/action-item modals + inline edits + the
   new-deliverable & subtask-edit pages). Confirm the shared-helper approach over per-call patches.

## DB changes in this set
- None. (R20.1 deletes rows from the existing `Notification` table; R20.2 is logic only.)

## Log
- 2026-06-30 — Set 20 scaffolded (specs only). Two independent fixes: notification clearing (R20.1) and
  date-input robustness (R20.2). Branch (when work starts): `feat/set20-notify-clear-date-robustness`.
- 2026-06-30 — Both features implemented & merged into the set branch. Open questions resolved by user:
  R20.1 = hard-delete; R20.2 = shared parse guard + inline validation.
  - R20.1 [x]: `POST /api/notifications/clear` + bell Clear all / per-item dismiss.
    `e2e/r20-clear-notifications.spec.ts` green (3 tests).
  - R20.2 [x]: `src/lib/date.ts` guard rolled out across all date-accepting actions + modals/inline editors;
    render guards added. `e2e/r20-date-robustness.spec.ts` green (4 tests).
  - `pnpm build` clean. Pre-existing unrelated failure: `e2e/r9-project-modal.spec.ts` (semester `<select>`
    `.fill()` brittleness — see R20.2 notes). **Set branch ready; awaiting user approval to merge to `main`.**
