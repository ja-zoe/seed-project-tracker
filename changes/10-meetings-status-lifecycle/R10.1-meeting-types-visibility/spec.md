# R10.1 — Calendar meeting types, visibility & configurable submit window

**Status:** planned
**Files:**
- `prisma/schema.prisma` + DDL via `scripts/apply-schema.ts` (**DB changes**)
- `src/lib/actions/calendar.ts` (create/update accept the new types)
- `src/components/semester-calendar.tsx` + the `/calendar` page (type options + visibility filter)
- `src/lib/actions/users.ts` / `roles.ts` + `prisma/seed.ts` (Eboard role + permission)
- PM settings page (`/pm/settings`) — configurable submit window

**Lands first in the set** — R10.2 (status↔meeting) and R10.3 (export visibility) depend on it.

## Spec

**Problem:** The calendar only has `PROJECT_MEETING` / `NON_PROJECT_EVENT`. The user wants **lead
meeting** and **eboard meeting** types; lead/eboard meetings should be visible **only to leads +
eboard**; and the window in which "Submit Update" appears before a lead meeting (default **3 days**)
should be **configurable**.

**Approach:**

*DB (apply via `scripts/apply-schema.ts`, reconcile `schema.prisma`, regenerate + restart dev):*
- `CalendarEventType` enum: add `LEAD_MEETING`, `EBOARD_MEETING`.
  `ALTER TYPE "CalendarEventType" ADD VALUE 'LEAD_MEETING'; ADD VALUE 'EBOARD_MEETING';`
- `Settings`: `statusSubmitWindowDays Int @default(3)`.
  `ALTER TABLE "Settings" ADD COLUMN "statusSubmitWindowDays" INT NOT NULL DEFAULT 3;`
- **Eboard (confirmed decision = new role + permission):** add a `Permission` value
  `VIEW_LEAD_MEETINGS` (visibility of lead/eboard meetings). `ALTER TYPE "Permission" ADD VALUE
  'VIEW_LEAD_MEETINGS';`. Seed a built-in **"Eboard"** role with `VIEW_LEAD_MEETINGS` (+ whatever
  baseline it needs), and grant `VIEW_LEAD_MEETINGS` to **Project Manager** and **Project Lead** too
  (leads must see lead meetings). Update `prisma/seed.ts`.

*Permission helper:* a server helper `canSeeRestrictedMeetings(user)` = has `VIEW_LEAD_MEETINGS` (PM,
Lead, Eboard). Members (Viewer) → false.

*Calendar UI + actions:*
- The event editor's type picker offers LEAD_MEETING / EBOARD_MEETING (creating them gated on
  `MANAGE_CALENDAR`, as today).
- **Visibility (enforce server-side):** the calendar event **query** that feeds `/calendar` filters out
  `LEAD_MEETING`/`EBOARD_MEETING` for users without `VIEW_LEAD_MEETINGS`. Do this in the data fetch, not
  just the client, so members never receive them (also reused by R10.3 export).

*Settings:* the PM settings page gets a "Status submit window (days before a lead meeting)" field bound
to `Settings.statusSubmitWindowDays` (gated `CONFIGURE_NOTIFICATIONS`/PM).

## Tests
- [ ] DDL applied (enum values, `statusSubmitWindowDays`, `VIEW_LEAD_MEETINGS`); seed grants the
      permission to PM/Lead/Eboard; `prisma generate` + dev restart
- [ ] `pnpm build` / typecheck passes
- [ ] Playwright (PM): create a LEAD_MEETING event; it appears on the calendar
- [ ] App: a member (Viewer, no `VIEW_LEAD_MEETINGS`) does **not** see lead/eboard meetings on `/calendar`
      (server-filtered) — verify via a Viewer login or by asserting the query excludes them
- [ ] App: the submit window is editable in settings and persists

## Notes / log
- 2026-06-28 — Specced (Set 10, phase 2). No code written. Open: exact Eboard baseline permissions;
  whether eboard meetings are visible to leads or eboard-only (recommend: lead+eboard see both).
