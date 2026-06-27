# Revision Set 6 — Project CRUD, Dates, Timeline Fix & Semester Calendar

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 6. Per-feature specs live in the sibling
`R6.*` files; load only the feature(s) you are working on.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [t] R6.1 — Signup email — email + in-app alert to all MANAGE_USERS holders when a new user signs up
- [t] R6.2 — Project CRUD — edit page + delete action (app); `create_project`/`update_project` MCP tools, MANAGE_PROJECTS-gated
- [t] R6.3 — Inline subtask status — change a subtask's status from the project page without opening the edit form
- [t] R6.4 — Project dates — add `startDate`/`endDate` to Project; show duration; end blank ⇒ "Present"
- [t] R6.5 — Timeline fix — remove visual artifacts in the deliverable Gantt (misaligned today line, null-start bars, single-date range)
- [t] R6.6 — Semester Calendar — new `/calendar` view of project + non-project meetings, editable by MANAGE_CALENDAR holders

## Open questions / decisions before implementing
All resolved 2026-06-27:
1. **Calendar edit permission (R6.6):** ✅ add dedicated `MANAGE_CALENDAR`, seed onto the
   "Project Manager" role, **and expose calendar MCP endpoints** (list/create/update/delete,
   write tools gated by `MANAGE_CALENDAR`).
2. **Calendar layout (R6.6):** ✅ provide **both** a month grid and an agenda/list view, with a
   user toggle between them.
3. **Subtask status control (R6.3):** ✅ dropdown popover.
4. **Signup notification type (R6.1):** ✅ add `USER_SIGNUP` to the `NotificationType` enum.

## DB changes in this set
Apply by writing raw SQL and running `tsx scripts/apply-schema.ts` (never `prisma db push`).
Enum `ADD VALUE` statements cannot run inside a transaction block — run them as standalone
statements. After applying, update `prisma/schema.prisma` to match, run `pnpm prisma generate`,
then **restart the dev server** (Turbopack caches the old WASM bundle).

- **R6.1** — `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'USER_SIGNUP';`
- **R6.4** — `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3); ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);`
- **R6.6** —
  - `ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'MANAGE_CALENDAR';`
  - New enum `CalendarEventType { PROJECT_MEETING, NON_PROJECT_EVENT }`
  - New table `CalendarEvent` (see `R6.6-semester-calendar/spec.md` for full DDL)
  - Seed: add `MANAGE_CALENDAR` to the "Project Manager" role's permissions in `prisma/seed.ts`.

## Log
- 2026-06-27 — Set 6 created; R6.1–R6.6 specced.
- 2026-06-27 — All 6 features implemented and merged to feat/set6-projects-calendar. pnpm build passes clean. Awaiting user verification + approval to merge to main.
