# Revision Set 17 — User settings & MCP OAuth (for ChatGPT)

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 17. Per-feature specs live in the sibling
`R17.*` files; load only the feature(s) you are working on.

> **Planned 2026-06-29 (specs only — no code yet).** Two user requests:
> (1) a self-service settings page so any user can edit their nickname/name;
> (2) make the MCP server usable from ChatGPT's web "custom connectors", which require OAuth.
> The Spec sections are the part to review/approve before implementation. **R17.2 carries a real
> build-approach decision (flagged below) — confirm it before that feature is implemented.**

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [ ] R17.1 — Self-service user settings page — any user can edit firstName / lastName / nickname
      (email is read-only CAS identity); lives on the existing `/account` page
- [ ] R17.2 — MCP OAuth 2.1 support so ChatGPT (web) can connect — make `/api/mcp` an OAuth-protected
      resource via **Stytch Connected Apps** (keeps CAS login) alongside the static-token path (**large,
      security-sensitive; no DB change; needs a Stytch project + public HTTPS deploy — both user-provided**)

## Sequencing & file overlap
- Independent. R17.1: `account` page + `profile.ts`. R17.2: `api/mcp` + new auth routes/metadata.
- R17.1 is small and ready to implement immediately. R17.2 is a multi-part effort gated on the approach
  decision — do R17.1 first.

## Open questions / decisions before implementing
1. **R17.2 — OAuth Authorization Server.** **RESOLVED 2026-06-29 (user): managed provider → Stytch Connected
   Apps.** Keeps CAS as the login; Stytch supplies the AS mechanics. (Considered WorkOS = equivalent
   fallback; Supabase OAuth Server rejected — ties identity to Supabase Auth, app is CAS-based.) User
   prerequisites before build: create the Stytch project + keys, and deploy to public HTTPS.
2. **R17.2 — keep the static-token path?** **RESOLVED: yes, dual-auth** — keep `Authorization: Bearer
   <mcpToken>` for local clients (Claude Code/Cursor/Codex) and add OAuth for ChatGPT/remote. No regression.
3. **R17.2 — deployment reality.** ChatGPT can only connect to a **public HTTPS** server, not `localhost`.
   This feature is only end-to-end testable against a deployed instance (e.g. Vercel) with real CAS — call
   out at review; local verification is limited to the metadata endpoints + token-validation unit paths.

## DB changes in this set
- R17.1: **none** (uses existing `User` columns).
- R17.2: **none** — managed provider holds clients/codes/tokens; the app only stores provider config in env
  and validates tokens. (A small optional `McpConnection` audit table could be added later, but is not
  required for the MVP.)

## Log
- 2026-06-29 — Set 17 scaffolded. R17.1 (settings) is decision-complete and small. R17.2 (MCP OAuth)
  researched against ChatGPT's current connector requirements; spec written with an approach decision left
  for the user. Branch `feat/set17-user-settings-mcp-oauth`.
