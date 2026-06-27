# Revision Set 3 — User Identity & AI Assistant

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 3. Per-feature specs live in the sibling
`R3.*` files.

> Note: R3.4 (bring-your-own-AI chat widget) shipped here but was **rejected and removed in
> set 4** in favor of the MCP server. Its spec is retained in `R3.4-ai-chatbot.md` as the
> historical context for that pivot. See `CONTEXT.md` → Standing decisions.

## Status
- [x] R3.1 — Plain-text / Markdown toggle on description fields
- [x] R3.2 — Inline subtask delete with slide-in confirmation
- [x] R3.3 — User identity: firstName, lastName, nickname; display name throughout
- [x] R3.4 — AI agent chatbot (bring-your-own-AI) — *later removed in set 4*

## Open questions / decisions before implementing
All resolved during implementation (recorded in each feature's Notes). Key calls:
- R3.1 mode defaults to MD, no persistence.
- R3.3 profile gate via layout server component (not middleware); existing users gated on first visit; PM not exempt.
- R3.4 shipped session-only (no DB/encryption), API-key-only (no OAuth), in-process tools (no separate MCP route).

## DB changes in this set
- R3.3 — `User.firstName`, `User.lastName`, `User.nickname` (all nullable). Applied via `scripts/apply-schema.ts`.
- R3.4 — `UserAiProvider` table was specced but **never applied** (shipped session-only). See `R3.4-ai-chatbot.md`.

## Log
- 2026-06-26 — Set 3 complete (`feat/rev3-*`, historically logged as merged to `develop`; `main` is the actual integration branch). All four features implemented.
