# R6.6 — Notes / log

- 2026-06-27 — Specced. Promoted to a directory feature (carries DDL + will accrue screenshots).
- 2026-06-27 — Decisions locked: dedicated `MANAGE_CALENDAR` permission + calendar MCP tools
  (read-open, write-gated); both month + agenda views with a persisted toggle. Spec/tests
  updated. Note: this feature and R6.2 both edit `api/mcp/route.ts` + `account/page.tsx` —
  sequence or single-owner those files.
- 2026-06-27 — Implemented on `feat/set6/R6.6-semester-calendar`. DDL applied via `apply-schema.ts`. `prisma/seed.ts` updated to include `MANAGE_CALENDAR` in PM permissions. New files: `src/lib/actions/calendar.ts` (3 server actions), `src/app/(app)/calendar/page.tsx` (server), `src/components/semester-calendar.tsx` (client — month grid, agenda view, event editor modal). Sidebar nav item added (`CalendarDots`). 4 MCP calendar tools added; server version bumped to 2.2.0. Account page updated. R6.2 + R6.6 sequenced on same agent to avoid `route.ts`/`account/page.tsx` collision. `pnpm build` clean with zero errors.
