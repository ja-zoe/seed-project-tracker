# Revision Set 12 — Calendar semester default & multi-pending status updates

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 12. Per-feature specs live in the
sibling `R12.*` files; load only the feature(s) you are working on.

This set fixes two related defects the user hit while testing lead meetings, plus the
UX the second defect implies:

- **R12.1 (Defect A):** the calendar opens on the wrong semester. The default is computed
  with a lexicographic `sort().reverse()`, which picks e.g. `"Test 2026"` over `"Fall 2026"`
  even though every project is in Fall 2026 — so a lead meeting that *is* offering a submit
  button (keyed off the project's semester) doesn't appear on the calendar (which shows a
  different semester). Reproduced: `allSemesters[0]` → `"Test 2026"`, projects all `"Fall 2026"`.
- **R12.2 (Defect B + the requested UX):** only one pending lead meeting is ever "active."
  `getActiveLeadMeeting` returns just the *latest* in-window meeting (`findFirst orderBy desc`),
  so when several lead meetings are simultaneously in-window only one gets a submit button;
  after submitting it, the earlier meeting never offers one. Reproduced: Fall 2026 had 3
  in-window meetings (Jun 29 / Jun 30 / Jun 30) but only one was returned. Fix: model the full
  **pending set**, add a separately configurable **late window**, and a single-page **switcher**
  to submit each pending update (date-labeled).

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [x] R12.1 — Calendar opens on the correct semester (and month) — default to the semester whose
      events are nearest **today**, not a lexicographic sort
- [ ] R12.2 — Multiple pending project standings — pending-set model + configurable late window
      (**DB change**) + "You have N Project Standing Updates to submit" + single-page date-labeled switcher

## Sequencing & file overlap
- Independent features, disjoint files (R12.1: calendar page + component; R12.2: lead-meeting,
  status-updates, settings, status/new, project + dashboard pages). Either order; R12.2 carries the DB change.

## Open questions / decisions before implementing
None. Confirmed with the user 2026-06-28:
- Late cutoff is **separately configurable** like the submit window → new `Settings.statusLateWindowDays`.
- Multi-submit UX = **one page with a switcher** (prev/next, each meeting date-labeled).
- Calendar default semester = **nearest to today** by event date.

## DB changes in this set
- `Settings`: add `statusLateWindowDays Int @default(3)` — days **after** a lead meeting a status
  update may still be submitted (late) before it's considered missed/dropped from the pending list.
  Column add (can share a txn): `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "statusLateWindowDays" INTEGER NOT NULL DEFAULT 3;`
  Apply via `scripts/apply-schema.ts`; add to `schema.prisma`; `prisma generate`. (No seed change — the
  Settings singleton already exists; the column default covers it.)

## Log
- 2026-06-28 — Set 12 outlined & scaffolded after the user reported the calendar/lead-meeting bug.
  Both defects reproduced against live data. User confirmed: configurable late window + single-page
  switcher + nearest-today semester default. Branch `feat/set12-calendar-pending-fixes`.
