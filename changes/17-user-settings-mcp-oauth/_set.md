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
      resource alongside the existing static-token path (**large, security-sensitive; DB change if AS is
      self-hosted; approach decision required**)

## Sequencing & file overlap
- Independent. R17.1: `account` page + `profile.ts`. R17.2: `api/mcp` + new auth routes/metadata.
- R17.1 is small and ready to implement immediately. R17.2 is a multi-part effort gated on the approach
  decision — do R17.1 first.

## Open questions / decisions before implementing
1. **R17.2 — OAuth Authorization Server: self-host vs. managed provider.** ChatGPT requires a real OAuth
   2.1 AS (authorize/token, PKCE, dynamic client registration / Client-ID-Metadata-Documents). Options:
   (a) **self-host a minimal AS** in the app (new DB tables for clients/codes/tokens; we own the crypto and
   security surface); (b) **front it with a managed provider** (WorkOS AuthKit / Stytch Connected Apps /
   Auth0 / Clerk) that implements the AS and issues tokens we validate. **Recommendation: (b) a managed
   provider** — OAuth AS + token crypto is high-risk to hand-roll, the app already delegates identity to
   CAS, and providers offer MCP-specific support. Confirm the provider (or that you want self-host) before
   R17.2 is built. **Needs your call.**
2. **R17.2 — keep the static-token path?** Recommendation: **yes, dual-auth** — keep the existing
   `Authorization: Bearer <mcpToken>` for local clients (Claude Code/Cursor/Codex) and add OAuth for
   ChatGPT/remote hosts. No regression for current users.

## DB changes in this set
- R17.1: **none** (uses existing `User` columns).
- R17.2: **none if a managed provider is used** (tokens validated against the provider). If self-hosting the
  AS: **additive** tables only — `OAuthClient`, `OAuthAuthCode`, `OAuthAccessToken`/`OAuthRefreshToken`
  (all new, nullable/defaulted), applied via `scripts/apply-schema.ts`. No destructive changes either way.

## Log
- 2026-06-29 — Set 17 scaffolded. R17.1 (settings) is decision-complete and small. R17.2 (MCP OAuth)
  researched against ChatGPT's current connector requirements; spec written with an approach decision left
  for the user. Branch `feat/set17-user-settings-mcp-oauth`.
