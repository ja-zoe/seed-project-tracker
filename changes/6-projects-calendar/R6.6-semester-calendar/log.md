# R6.6 — Notes / log

- 2026-06-27 — Specced. Promoted to a directory feature (carries DDL + will accrue screenshots).
- 2026-06-27 — Decisions locked: dedicated `MANAGE_CALENDAR` permission + calendar MCP tools
  (read-open, write-gated); both month + agenda views with a persisted toggle. Spec/tests
  updated. Note: this feature and R6.2 both edit `api/mcp/route.ts` + `account/page.tsx` —
  sequence or single-owner those files.
