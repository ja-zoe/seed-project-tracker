# Revision Set 16 — RBAC regression coverage

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 16. Per-feature specs live in the sibling
`R16.*` files; load only the feature(s) you are working on.

Autonomous set from the cycle-2 interactive RBAC audit. The audit found one real bug (the silent
permission-strip, fixed in Set 15) and otherwise confirmed the access gates are correct — but those
security-critical gates had **no automated coverage**. This set locks them in. Branch off `main`
(independent; no DB).

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [x] R16.1 — RBAC gating regression coverage — a multi-context e2e asserting the PENDING gate and
      global-role URL-gating (a Viewer is redirected away from PM-only pages)

## Sequencing & file overlap
- Single feature. Adds `e2e/r16-rbac-audit.spec.ts` only. No source/DB change (coverage, not behavior).

## Open questions / decisions before implementing
None — autonomous.

## DB changes in this set
None.

## Evidence (cycle-2 audit)
- PENDING gate: a fresh dev-login netId is created `PENDING` and lands on `/pending` (`requireAuth` in
  `permissions.ts:18`). Screenshot: `screenshots/pending.png`.
- A newly-activated user without `firstName` is sent to `/profile/setup` (`(app)/layout.tsx:22`) before the
  app — documented, not a bug; the test sets `firstName` to get past it.
- Global-role URL-gating: a **Viewer** (no `MANAGE_USERS` / `CONFIGURE_NOTIFICATIONS` / `VIEW_MONTHLY_REVIEW`)
  hitting `/pm/users`, `/pm/settings`, `/pm/review` is redirected to `/dashboard` (`requirePermission`).
  All three verified.
- Test hygiene: activation + teardown go through the DB (deterministic); the audit user
  (`auditv<ts>@…`) is deleted in a `finally`. Confirmed 0 leftover audit users after the run.

## Log
- 2026-06-29 — Set 16 scaffolded from the cycle-2 RBAC audit. Branch `feat/set16-rbac-coverage`.
- 2026-06-29 — R16.1 added (e2e `r16-rbac-audit`, passing) and committed to the set branch. Coverage-only,
  no source/DB change. Set 16 complete on its branch (not merged to `main`).
