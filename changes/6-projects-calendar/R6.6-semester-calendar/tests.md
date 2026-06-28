# R6.6 — Tests (merge gate)

Run all; mark each pass/fail during verification. Merge only when all pass and the app boots.

## Build / schema
- [x] DDL applied via `tsx scripts/apply-schema.ts` (enum `ADD VALUE` standalone), `schema.prisma`
      synced, `pnpm prisma generate` clean, dev server restarted.
- [x] `pnpm build` / typecheck passes.
- [ ] `pnpm db:seed` re-run: the "Project Manager" role now includes `MANAGE_CALENDAR`.

## Permissions
- [ ] As a PM (has `MANAGE_CALENDAR`): `/calendar` shows edit affordances (day cells clickable,
      chips editable).
- [ ] As a non-privileged ACTIVE user: `/calendar` renders read-only — no add/edit/delete
      controls; chips open a details popover only.
- [ ] Calling `createEvent`/`updateEvent`/`deleteEvent` without `MANAGE_CALENDAR` is rejected
      (redirect to /dashboard).

## CRUD + data
- [ ] Create a `PROJECT_MEETING` linked to a project → chip appears on the correct day in forest
      green with the project name.
- [ ] Create a `NON_PROJECT_EVENT` (e.g. "Career Panel") on a normal meeting day → chip appears
      in amber, no project name.
- [ ] Edit an event's date → chip moves to the new day. Delete an event → chip disappears.
- [ ] `endsAt` < `startsAt` is rejected with a clear error.
- [ ] Delete the linked project → event remains, project name no longer shown, no crash
      (FK SET NULL).

## View / navigation
- [ ] Sidebar "Semester Calendar" item navigates to `/calendar` and highlights when active.
- [ ] Semester `<select>` switches the visible event set; default semester is sensible.
- [ ] Empty semester shows the empty state, not a broken grid.
- [ ] Month prev/next navigation works; today is visually indicated.
- [ ] Month⇄Agenda toggle switches views; both show the same events; choice persists across
      reload (localStorage).
- [ ] Agenda view lists events chronologically grouped by week/day with correct type chips.
- [ ] Editor modal stays within the viewport at 1280/1440 widths (no R5.1-style clipping).

## MCP
- [ ] `tools/list` includes the 4 calendar tools.
- [ ] Any ACTIVE token: `list_calendar_events` returns events (read is open).
- [ ] `MANAGE_CALENDAR` token: `create_calendar_event` → `update_calendar_event` →
      `delete_calendar_event` round-trips and is reflected in the app `/calendar` view.
- [ ] Non-`MANAGE_CALENDAR` token: the 3 write tools return the permission error and change
      nothing; `list_calendar_events` still works.

## Screenshots
Capture month-view (populated), agenda-view, event editor (open), and read-only viewer states
into `log.md`.
