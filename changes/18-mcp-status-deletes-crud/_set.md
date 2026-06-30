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
- [ ] R18.1 — MCP connection status on the account page — show whether the user has a live MCP
      connection and its type (personal access token vs OAuth/ChatGPT), via last-used tracking
- [ ] R18.2 — Delete active users — new `DELETE_USERS` permission + a PM UI control with the
      shared inline-confirm microinteraction
- [ ] R18.3 — Action-item deletion in the UI — inline (row) and from the modal, both using the
      shared `InlineConfirm` microinteraction
- [ ] R18.4 — Full action-item CRUD over MCP — add `delete_action_item` (create/update/list
      already exist), gated by the same permissions as the UI

## Sequencing & file overlap
- **R18.1** touches `User` (DB), `api/mcp/route.ts` (`authenticate`), `account/page.tsx`,
  `account/mcp-token-section.tsx`.
- **R18.2** touches `Permission` enum + FK DDL (DB), `actions/users.ts`, `pm/users/page.tsx`,
  a new `user-row-controls` client component, `lib/permissions.ts` (seed/role wiring), `db:seed`.
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
1. **R18.1 — what does "active connection" mean?** We don't currently record MCP usage, and OAuth tokens
   are Stytch-managed (no local row). **Recommendation:** add two nullable `timestamptz` columns to
   `User` (`mcpTokenLastUsedAt`, `mcpOauthLastUsedAt`) stamped by `/api/mcp`'s `authenticate()` on each
   successful call; the account page shows per-type "last used <relative>" with a green dot if within 7
   days. This is lightweight (no new table), and the two auth branches naturally distinguish the type.
   *Alternative:* a full `McpConnection` audit table (richer, more code) — deferred. Confirm the
   timestamp approach.
2. **R18.2 — delete semantics for users with history.** Hard-deleting a `User` cascades
   Account/Session/ProjectAssignment/Notification, but `Subtask.assignee` & `ActionItem.owner` are
   RESTRICT (optional FKs with no `onDelete`) and `StatusUpdate`/`MeetingRecord` are required-author.
   **Recommendation:** change the two optional FKs to `ON DELETE SET NULL` (DDL), and **block deletion
   when the user has authored StatusUpdates or MeetingRecords** — the UI tells the PM to *suspend*
   instead (suspension already exists and preserves history). So "delete" = remove users with no authored
   history. *Alternative:* a fully anonymizing soft-delete (new `DELETED` status). Confirm hard-delete +
   block-on-history.

## DB changes in this set
- **R18.1:** `ALTER TABLE "User" ADD COLUMN "mcpTokenLastUsedAt" TIMESTAMPTZ, ADD COLUMN "mcpOauthLastUsedAt" TIMESTAMPTZ;`
  (both nullable). Add to the Prisma `User` model + `prisma generate`.
- **R18.2:** `ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'DELETE_USERS';` plus FK changes
  `ALTER TABLE "Subtask" … assignee FK → ON DELETE SET NULL` and `ALTER TABLE "ActionItem" … owner FK →
  ON DELETE SET NULL` (drop + re-add the constraints). Reflect in `schema.prisma`. Seed `DELETE_USERS`
  onto the "Project Manager" role (`db:seed`). **Note:** `ALTER TYPE … ADD VALUE` can't run inside a
  txn that also uses the value — `scripts/apply-schema.ts` runs raw statements, so apply the enum value
  in its own statement first.
- **R18.3 / R18.4:** none.
- Apply all DDL via `tsx scripts/apply-schema.ts` (never `prisma db push` — see CONTEXT).

## Log
- 2026-06-30 — Set 18 scaffolded (specs only). Four features; R18.1 & R18.2 have design decisions for the
  user to confirm. Branch (when work starts): `feat/set18-mcp-status-deletes-crud`.
