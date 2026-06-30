# Revision Set 18 — MCP connection status, user deletion & action-item CRUD

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 18. Per-feature specs live in the sibling
`R18.*` files; load only the feature(s) you are working on.

> **Planned 2026-06-30 (specs only — no code yet).** Four features grouped as "management +
> MCP surface" polish, building on R17 (settings + MCP OAuth). The Spec sections are the part
> to review/approve before implementation. **R18.1 and R18.2 each carry a real design decision
> (flagged in Open questions) — confirm before those features are implemented.**

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [~] R18.1 — MCP connection status on the account page — show whether the user has a live MCP
      connection and its type (personal access token vs OAuth/ChatGPT), via last-used tracking
- [~] R18.2 — Delete active users — new `DELETE_USERS` permission + a PM UI control with the
      shared inline-confirm microinteraction
- [~] R18.3 — Action-item deletion in the UI — inline (row) and from the modal, both using the
      shared `InlineConfirm` microinteraction
- [ ] R18.4 — Full action-item CRUD over MCP — add `delete_action_item` (create/update/list
      already exist), gated by the same permissions as the UI

## Sequencing & file overlap
- **R18.1** touches new `McpConnection` table (DB), `api/mcp/route.ts` (`authenticate`), `mcp-oauth.ts`
  (return client id), `actions/account.ts`, `account/page.tsx`, `account/mcp-token-section.tsx`.
- **R18.2** touches `Permission` + `UserStatus` enums (DB), `actions/users.ts`, `pm/users/page.tsx`,
  a new `user-row-controls` client component, `auth.ts`/`lib/permissions.ts` (treat DELETED as inactive),
  `db:seed`.
- **R18.3** touches `actions/action-items.ts` (new `deleteActionItem`), `action-items-section.tsx`,
  `action-item-modal.tsx`.
- **R18.4** touches `api/mcp/route.ts` (TOOLS + handler) and `account/mcp-token-section.tsx` (tool list).
- **Overlap:** R18.1 and R18.4 both edit `api/mcp/route.ts` (R18.1 → `authenticate()`; R18.4 → TOOLS
  array + a new `case`) and `mcp-token-section.tsx` (R18.1 → status block; R18.4 → tool list). Disjoint
  regions but the same files — **sequence R18.1 then R18.4**, don't parallelize them. R18.2 and R18.3 are
  independent of everything and of each other.
- Both R18.1 and R18.2 require DDL; since the dev DB is shared, **apply their DDL before testing** and
  stack schema-touching branches in order (see [[sets-11-12-stacked-pending-merge]] lesson).

## Open questions / decisions before implementing
1. **R18.1 — what does "active connection" mean?** **RESOLVED 2026-06-30 (user): a dedicated
   `McpConnection` table** (not the lighter last-used-timestamp approach). One row per (user, type, client),
   with `lastSeenAt` updated by `/api/mcp`; also enables a future connected-apps management/revoke UI. See
   R18.1 for the schema.
2. **R18.2 — delete semantics for users with history.** **RESOLVED 2026-06-30 (user): anonymizing
   soft-delete** — mark the user `DELETED` and scrub PII, keeping all history/FKs intact (no hard delete, no
   FK surgery). **A PM must never be able to delete themselves** (hard guard). See R18.2.

## DB changes in this set
- **R18.1:** new enum `McpConnectionType { ACCESS_TOKEN, OAUTH }` + new table `McpConnection`
  (`id, userId FK→User ON DELETE CASCADE, type, clientId, label, createdAt, lastSeenAt`,
  `UNIQUE(userId, type, clientId)`). Reflect in `schema.prisma` (+ `User.mcpConnections`) and
  `prisma generate`.
- **R18.2:** `ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'DELETE_USERS';` and
  `ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DELETED';` (each in its own statement, before any use).
  Reflect both in `schema.prisma`. Seed `DELETE_USERS` onto the "Project Manager" role (`db:seed`) and
  back-fill existing PM role rows. **No FK changes** (soft-delete keeps the row). **Note:**
  `ALTER TYPE … ADD VALUE` can't run inside a txn that also uses the value — `scripts/apply-schema.ts` runs
  raw statements, so apply each enum value in its own statement first.
- **R18.3 / R18.4:** none.
- Apply all DDL via `tsx scripts/apply-schema.ts` (never `prisma db push` — see CONTEXT).

## Log
- 2026-06-30 — Set 18 scaffolded (specs only). Four features; R18.1 & R18.2 have design decisions for the
  user to confirm. Branch (when work starts): `feat/set18-mcp-status-deletes-crud`.
