# Revision Set 11 — Meeting-record deletion & MCP capability expansion

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 11. Per-feature specs live in the
sibling `R11.*` files; load only the feature(s) you are working on.

This set adds the ability to **delete meeting records** (gated by a new
`MANAGE_MEETING_RECORDS` permission), and expands the **MCP server** with the missing
meeting-record tools, a status-update read tool, and a fix to calendar-event visibility
so lead/eboard meetings aren't leaked through MCP.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [x] R11.1 — Delete meeting records — new `MANAGE_MEETING_RECORDS` permission; `deleteMeetingRecord`
      server action; delete microinteraction on the project page + standing-history page (**DB change**)
- [t] R11.2 — MCP capability expansion — add `list_meeting_records`, `create_meeting_record`,
      `delete_meeting_record`, `list_status_updates`; add `LEAD_MEETING`/`EBOARD_MEETING` to the calendar
      tool enums and enforce `VIEW_LEAD_MEETINGS` in `list_calendar_events`

## Sequencing & file overlap
- **R11.1 lands first** — it introduces the `MANAGE_MEETING_RECORDS` permission (schema + generated
  client) that R11.2's `delete_meeting_record` tool gates on.
- The two features otherwise touch disjoint files (R11.1: actions/UI/seed/schema; R11.2: `api/mcp/route.ts`).

## Open questions / decisions before implementing
None. Confirmed with the user 2026-06-28:
- Meeting-record deletion is gated by a **new `MANAGE_MEETING_RECORDS`** permission (not POST_MEETING_TRACKING).
- MCP additions: **all three** — meeting-record tools, calendar visibility fix, and `list_status_updates`.

## DB changes in this set
- `Permission` enum: add `MANAGE_MEETING_RECORDS`. Apply statement-by-statement (ALTER TYPE ADD VALUE
  cannot share a txn — see Set 10):
  `ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'MANAGE_MEETING_RECORDS';`
  Then add it to the `Permission` enum in `prisma/schema.prisma`, `prisma generate`, and `pnpm db:seed`
  (granted to **Project Manager** only — meeting records are PM-domain, matching `POST_MEETING_TRACKING`).

## Log
- 2026-06-28 — Set 11 outlined and scaffolded (theme + R11.1/R11.2 specs). User confirmed the new
  permission + full MCP scope. Branch `feat/set11-meeting-delete-mcp`.
