# Revision Set 5 — Logo, MCP Expansion & Notification Fix

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 5. Per-feature specs live in the sibling
`R5.*` files; load only the feature(s) you are working on.

## Status
- [x] R5.0 — Logo + favicon — replace Plant icon with `seed-logo-transparent.png` (sidebar, favicon, dev-login)
- [x] R5.1 — Notification fix — modal was clipping off the left edge of the screen
- [x] R5.2 — MCP deliverable & subtask CRUD — 6 new tools
- [x] R5.3 — MCP member/action/task tools — `list_members`, `update_action_item`, `list_action_items`, `get_my_subtasks` (4 new tools)
- [x] R5.5 — Account page — update tools list to all 14, grouped with RBAC notes

(R5.4 logo/favicon follow-up fixes folded into R5.0 — same feature and files.)

## Open questions / decisions before implementing
None.

## DB changes in this set
None. All new MCP tools operate on existing schema.

## Log
- 2026-06-27 — Set 5 created; R5.0–R5.3 specced.
- 2026-06-27 — R5.0–R5.3 implemented. MCP route expanded 4 → 14 tools; server version bumped to `2.0.0`.
- 2026-06-27 — Playwright screenshots surfaced R5.4 (logo/favicon follow-up) and R5.5 (account tools list) — both specced and implemented same day.
- 2026-06-27 — Set 5 complete.
