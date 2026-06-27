# Revision Set 4 — MCP Server Pivot

Bootstrap: read `changes/CONTEXT.md` first for project invariants (the MCP decision lives there under Standing decisions).
This file is the index and roll-up log for set 4. Per-feature specs live in the sibling
`R4.*` files.

## Status
- [x] R4.0 — Fix R3.4 carry-over bugs (zod dep; API-key verify built but superseded)
- [x] R4.1 — Remove the R3.4 chat widget infrastructure (bring-your-own-key approach)
- [x] R4.2 — MCP server: expose project tools via JSON-RPC 2.0 at `POST /api/mcp`
- [x] R4.3 — Account page: per-user MCP token generation + client config instructions

## Open questions / decisions before implementing
None (set complete). The core decision — MCP server over bring-your-own-key chat — is recorded in `CONTEXT.md`.

## DB changes in this set
`User.mcpToken` — see `R4.3-account-page.md`.
```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mcpToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_mcpToken_key" ON "User"("mcpToken");
```
Applied via `scripts/apply-schema.ts`.

## Log
- 2026-06-26 — Set 4 created; R4.0 specced.
- 2026-06-27 — Pivoted AI approach: removed bring-your-own-key chat widget, replaced with MCP server. R4.0–R4.3 implemented.
- 2026-06-27 — Post-deploy note: after `prisma generate` the dev server must be restarted (Turbopack caches the compiled Prisma WASM bundle and won't hot-reload it). Generated files on disk are correct; only the in-memory bundle is stale. (Now captured in `CONTEXT.md`.)
- 2026-06-27 — Set 4 complete.
