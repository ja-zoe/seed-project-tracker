# Revision Set 22 — Deliverable backlog, markdown headings, multi-day events, CRUD feedback

Bootstrap: read `changes/CONTEXT.md` first for project invariants (especially the set-21
cross-surface-parity section — R22.1 and R22.4 live and die by it).
This file is the index and roll-up log for set 22. Per-feature specs live in the sibling `R22.*` files;
load only the feature(s) you are working on.

> **Planned 2026-07-02 (specs only — no code yet).** Four user-requested items: leads need to move
> deliverables to a backlog to right-size their semester tasking; markdown preview renders #/##/### headings
> identically; a multi-day meeting shows only on its first calendar day; and every CRUD mutation in the app
> should have a satisfying loading + confirmation state.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [~] R22.1 — Deliverable backlog — move a deliverable to/from a Backlog section so current-semester
      tasking reflects real capacity; excluded from timeline and red-flag lateness
- [x] R22.2 — Markdown heading hierarchy — h1/h2/h3 must be visually distinct in preview and display;
      consolidate the editor's duplicate render path into MarkdownView
- [x] R22.3 — Multi-day calendar events — an event spanning days appears on every day it covers in the
      month grid, not just its start day
- [ ] R22.4 — CRUD loading & confirmation feedback — shared pending-spinner + success-confirmation
      primitives rolled out to every create/update/delete trigger in the app

## Sequencing & file overlap
- **R22.2 and R22.3 are independent** of everything (single-file each: `markdown-view.tsx`+`markdown-editor.tsx`,
  and `semester-calendar.tsx`) — safe to parallelize.
- **R22.1 before R22.4.** R22.1 touches `sortable-deliverables.tsx`, `deliverables.ts`, and the MCP route;
  R22.4 touches nearly every component with a mutation trigger, including those same files and
  `semester-calendar.tsx` (which R22.3 also edits). R22.4 goes **last**, after the others merge.
- R22.1 is the only feature with a DB change — per the shared-dev-DB lesson (sets 11/12), any future
  schema-touching set must stack on this one until its DDL is applied.

## Open questions / decisions before implementing
1. **R22.1 — how is "backlog" represented?** Recommendation: a `backlog Boolean @default(false)` column on
   `Deliverable`, keeping `targetDate` required and untouched (cheap, reversible, no enum migration, dates
   survive a round-trip to backlog and back). Alternatives rejected in spec: nullable `targetDate`, new
   `TimelineStatus` value. Confirm.
2. **R22.1 — does backlogging suppress red-flag lateness?** Backlogged-and-overdue deliverables would stop
   counting toward red-flag Condition A (that's the point of the feature: adjusting tasking to capacity),
   which also means a lead could dodge the BEHIND flag by backlogging everything. Recommendation: exclude
   backlogged items from Condition A, and keep the Backlog section fully visible on the project page (PMs
   see exactly what was deferred). Confirm this trade-off.
3. **R22.4 — confirmation style: in-place micro-confirmation or a toast system?** Recommendation: in-place
   (button morphs spinner → check via GSAP, rows flash-settle) — no toast library, consistent with the
   Forest Floor minimalism and the set-7 confirm-microinteraction conventions. Confirm before implementing,
   since a toast system would change the architecture.

## DB changes in this set
- **R22.1:** `ALTER TABLE "Deliverable" ADD COLUMN "backlog" BOOLEAN NOT NULL DEFAULT false;`
  Apply via `/tmp/schema.sql` + `tsx scripts/apply-schema.ts` (never `prisma db push` — see CONTEXT.md),
  mirror in `prisma/schema.prisma`, run `prisma generate`, then **restart the dev server** (Turbopack caches
  the old WASM client).
- R22.2/R22.3/R22.4: none.

## Log
- 2026-07-02 — Set 22 scaffolded (specs only). Branch (when work starts): `feat/set22-backlog-md-calendar-feedback`.
