# Revision Set 15 — RBAC correctness

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 15. Per-feature specs live in the sibling
`R15.*` files; load only the feature(s) you are working on.

Autonomous set from a cycle-2 interactive RBAC audit of `main`. Branch off `main` (independent of the
unmerged Set 14 — disjoint files, no DB dependency). No Open Questions.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [ ] R15.1 — Role Builder silently strips 4 permissions on any role edit — add the missing permission
      checkboxes so editing a role preserves the full permission set

## Sequencing & file overlap
- Single feature. Touches `src/app/(app)/pm/users/page.tsx` only (plus an e2e spec). No DB.

## Open questions / decisions before implementing
None — autonomous.

## DB changes in this set
None.

## Evidence (cycle-2 audit)
- `roles.ts` `parsePermissions` keeps `Object.values(Permission)` (all 17) filtered by submitted `perm_*`
  checkboxes. The Role Builder form (`pm/users/page.tsx` `ALL_PERMISSIONS`) renders only 13 checkboxes —
  missing `MANAGE_CALENDAR`, `VIEW_LEAD_MEETINGS`, `MANAGE_STATUS_UPDATES`, `MANAGE_MEETING_RECORDS` (added
  Sets 10–11). So any role "Save" drops those 4. **High-severity silent privilege strip** (e.g. editing the
  PM or Eboard role removes calendar/lead-meeting/status/meeting-record powers).

## Log
- 2026-06-29 — Set 15 scaffolded from a cycle-2 RBAC audit. Branch `feat/set15-rbac-correctness`.
