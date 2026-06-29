# Revision Set 14 — Correctness & design-system polish

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 14. Per-feature specs live in the sibling
`R14.*` files; load only the feature(s) you are working on.

Autonomous set built from a cycle-1 evidence audit of `main` (Sets 1–13 merged). Findings were
collected by static analysis + a Playwright drive; each feature traces to concrete evidence. No
Open Questions — every decision is resolved in the feature's Spec/Notes, in the most
architecture-consistent way.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [x] R14.1 — Date-only fields render one day early in negative-UTC timezones (deadline / dueDate /
      targetDate / startDate / meeting-record date) — format date-only values in UTC
- [x] R14.2 — Design-system drift: heavy shadows (`shadow-md/lg`) + dialog `backdrop-blur` glassmorphism
      violate the documented "no heavy shadows / no glassmorphism" rule — conform to flat border elevation

## Sequencing & file overlap
- Independent. R14.1 touches date-display call sites + a `utils.ts` helper; R14.2 touches component
  className strings (modals/menus/dialog). Minor shared file: `sortable-deliverables.tsx` (R14.1 edits its
  date formatters; R14.2 edits its popover shadow classes) — disjoint lines, but sequence R14.1 → R14.2 to
  avoid churn.

## Open questions / decisions before implementing
None — autonomous. Decisions recorded in each feature's Spec/Notes.

## DB changes in this set
None. Both features are presentation-only (no schema, no DDL).

## Evidence (cycle-1 audit)
- Baseline: individual e2e specs pass on `main` (r13-not-found, r9-priority, etc.). **The full suite is not
  runnable as one batch here** — ~41 tests on one Turbopack dev server mass-time-out (1.4h) and the server
  degrades; gate features on targeted spec runs and restart the dev server when it slows. (Logged for
  future cycles.)
- R14.1: `toLocaleDateString` without `timeZone:"UTC"` at ~22 sites; date-only fields (stored as UTC
  midnight from `type="date"` inputs) shift a day for sub-UTC users (Rutgers = US Eastern). Reproduced in
  R13.4 (a `2026-12-15` deadline rendered "Dec 14" under `America/New_York`).
- R14.2: `grep` hits — `shadow-lg` (semester-calendar modal), `shadow-md` (sortable-deliverables menus
  ×5), `supports-backdrop-filter:backdrop-blur-xs` (ui/dialog overlay). CONTEXT/CLAUDE: "No heavy shadows,
  no gradients, no glassmorphism."

## Log
- 2026-06-29 — Set 14 scaffolded from a cycle-1 audit. `main` confirmed healthy (targeted specs pass);
  full-suite marathon flagged as an environment constraint. Branch `feat/set14-correctness-design-polish`.
