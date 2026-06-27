# R6.6 — Semester Calendar

**Status:** planned
**Files:**
- `prisma/schema.prisma` + DB DDL (new `CalendarEvent`, new `CalendarEventType` enum,
  `MANAGE_CALENDAR` permission), `prisma/seed.ts` (grant `MANAGE_CALENDAR` to PM role)
- new `src/lib/actions/calendar.ts` (CRUD server actions)
- new `src/app/(app)/calendar/page.tsx` (server: load + month grid)
- new `src/components/semester-calendar.tsx` (client: grid + event editor)
- `src/components/sidebar.tsx` (nav item)
- `src/app/api/mcp/route.ts` (calendar MCP tools) + `src/app/(app)/account/page.tsx` (tools list)
- `src/lib/permissions.ts` — no change (uses existing helpers)

## Spec

**Problem:** There is no place to see the semester's meeting schedule. The cohort has weekly
project meetings, but some weeks those slots are replaced by non-project events (career panels,
field trips, etc.). Today nothing records "is there a project meeting this week, or something
else?" New and existing members need one view that shows the whole semester's cadence, and
people with the right permission (PM always) need to edit it.

> **Note on scope vs. `MeetingRecord`:** `MeetingRecord` is *retrospective tracking* (status,
> goalMet, blockers for a meeting that happened). `CalendarEvent` is *forward scheduling* — the
> planned calendar. They are intentionally separate; an event may link to a project but does not
> create or read `MeetingRecord` rows.

**Data model (new):**

```prisma
enum CalendarEventType {
  PROJECT_MEETING     // a normal project working meeting
  NON_PROJECT_EVENT   // career panel, field trip, holiday, etc. (replaces a meeting slot)
}

model CalendarEvent {
  id          String            @id @default(cuid())
  title       String
  semester    String            // e.g. "Fall 2026" — scopes the calendar, mirrors Project.semester
  type        CalendarEventType @default(PROJECT_MEETING)
  startsAt    DateTime
  endsAt      DateTime?         // optional; null ⇒ single point / use allDay
  allDay      Boolean           @default(false)
  location    String?
  description String?           @db.Text
  projectId   String?           // optional link to a project (only meaningful for PROJECT_MEETING)
  project     Project?          @relation(fields: [projectId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([semester, startsAt])
}
```
Add the inverse relation `calendarEvents CalendarEvent[]` to `model Project`.

**DDL** (apply via `tsx scripts/apply-schema.ts`; enum `ADD VALUE` must be standalone, not in a
txn; then sync `schema.prisma`, `pnpm prisma generate`, restart dev server):
```sql
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'MANAGE_CALENDAR';
CREATE TYPE "CalendarEventType" AS ENUM ('PROJECT_MEETING', 'NON_PROJECT_EVENT');
CREATE TABLE "CalendarEvent" (
  "id"          TEXT PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "semester"    TEXT NOT NULL,
  "type"        "CalendarEventType" NOT NULL DEFAULT 'PROJECT_MEETING',
  "startsAt"    TIMESTAMP(3) NOT NULL,
  "endsAt"      TIMESTAMP(3),
  "allDay"      BOOLEAN NOT NULL DEFAULT false,
  "location"    TEXT,
  "description" TEXT,
  "projectId"   TEXT REFERENCES "Project"("id") ON DELETE SET NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "CalendarEvent_semester_startsAt_idx" ON "CalendarEvent" ("semester", "startsAt");
```

**Permission (resolved):** add `MANAGE_CALENDAR` and seed it onto the "Project Manager" role in
`prisma/seed.ts`. Viewing the calendar requires only `requireAuth()`; all edit paths (app **and**
MCP write tools) require `MANAGE_CALENDAR`.

**Server actions** — new `src/lib/actions/calendar.ts`, each gated
`await requirePermission(Permission.MANAGE_CALENDAR)` then `revalidatePath("/calendar")`:
- `createEvent(formData)` — title, semester, type, startsAt, endsAt?, allDay, location?,
  description?, projectId?.
- `updateEvent(eventId, formData)` — same fields, partial.
- `deleteEvent(eventId)`.

**Page** `src/app/(app)/calendar/page.tsx` (server component):
- `requireAuth()`; compute `canEdit = hasPermission(roleId, MANAGE_CALENDAR)`.
- Determine the active semester: from `?semester=` search param, defaulting to the most recent
  distinct `Project.semester` (or the semester of the nearest upcoming event). Provide a
  semester `<select>` built from `distinct` `Project.semester` ∪ `CalendarEvent.semester`.
- Load `CalendarEvent`s where `semester = active`, ordered by `startsAt`, with
  `project: { select: { name: true } }`.
- Render `<SemesterCalendar events canEdit semester … />`.

**Component** `src/components/semester-calendar.tsx` (client; resolved ⇒ both views + toggle):
- A **view toggle** (segmented control, mono-styled) switches between **Month** and **Agenda**,
  held in component state (`view: "month" | "agenda"`, default `"month"`; persist last choice in
  `localStorage` so it survives reloads). Both views read the same `events` prop.
- **Month view** — 7-col week grid spanning the months the semester covers, with a prev/next
  month control. Each day cell lists event chips colored by type — `PROJECT_MEETING` in forest
  green `#2E4034`, `NON_PROJECT_EVENT` in at-risk amber `#C99846` — with the title and (if
  linked) project name. Phosphor `Calendar`/`Users`/`Star` icons to distinguish types. Today is
  visually indicated.
- **Agenda view** — a chronological list grouped by week (or by day), each row showing date,
  time, type chip, title, project, location. Same color/icon semantics as the grid. Better for
  scanning the full semester linearly and on narrow screens.
- When `canEdit` (both views): clicking a day (month) / "add" affordance (agenda) opens an
  **event editor** (modal/slide-over) to add an event
  on that date; clicking an existing chip opens it for edit/delete. Reuse the app's existing
  form styling; bind to the `calendar.ts` actions. Heed the R5.1 modal-clipping lesson — keep
  the editor within the viewport, no negative offsets.
- When `!canEdit`: chips are read-only (open a details popover, no edit controls).
- Empty state: "No events scheduled for <semester> yet."

**Sidebar:** add `{ href: "/calendar", label: "Semester Calendar", icon: CalendarBlank }` to
`navItems` in `src/components/sidebar.tsx` (Phosphor `CalendarBlank`/`CalendarDots`). Visible to
all authenticated users (viewing is open; edit controls are permission-gated inside the page).

**MCP tools** — add to the `TOOLS` array + `executeTool` cases in `src/app/api/mcp/route.ts`,
following the existing patterns. Reads are open to any ACTIVE token; writes require
`permissions.includes(Permission.MANAGE_CALENDAR)` (else return
`{ error: "Requires MANAGE_CALENDAR permission" }`). These should call the same Prisma logic as
the `calendar.ts` server actions (factor shared validation if convenient, but the MCP route does
its own permission check — it does not import server actions):
- `list_calendar_events` — args: `semester?` (defaults to the most recent), `from?`/`to?` (ISO
  date filters), `type?`. Returns events with `{ id, title, type, startsAt, endsAt, allDay,
  location, projectId, project: { name } }`.
- `create_calendar_event` — args: `title` (req), `semester` (req), `startsAt` (req, ISO),
  `type?` (default `PROJECT_MEETING`), `endsAt?`, `allDay?`, `location?`, `description?`,
  `projectId?`. Returns `{ id, title }`.
- `update_calendar_event` — args: `eventId` (req) + any updatable field. Partial update.
- `delete_calendar_event` — args: `eventId` (req).

Bump `serverInfo.version` and update the `/account` documented tools list (note these 4 are
read-open / write-`MANAGE_CALENDAR`). Coordinate the version bump with R6.2 if both land before
release. **Note:** R6.2 and R6.6 both edit `route.ts` and `account/page.tsx` — sequence them or
have one agent own those two files to avoid a collision.

**Edge cases:**
- `endsAt` before `startsAt` → reject in the action.
- Deleting a linked project nulls `projectId` (FK `ON DELETE SET NULL`); the event remains as a
  non-linked entry — render gracefully (no "undefined" project name).
- Events spanning the month boundary: render the chip on the start day for v1 (no multi-day
  spanning bars).

## Tests
See `tests.md`.

## Notes / log
See `log.md`.
