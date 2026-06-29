# Revision Set 13 — Error page, SUBLEAD fix & action-item/member editing

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 13. Per-feature specs live in the sibling
`R13.*` files; load only the feature(s) you are working on.

> **Planned 2026-06-28 (specs only — no code yet).** Scaffolded from the user's request.
> The Spec sections are the part to review/approve before implementation; resolve the Open
> Questions below first. Set branch `feat/set13-error-and-editing-polish` (off `main`, which
> already contains Sets 11 + 12).

This set adds a **catch-all error/not-found experience**, fixes the **missing `SUBLEAD`
database enum value** (which crashes adding a sub-lead), moves **action-item create/edit into a
modal** with **inline per-field edits + confirmation microinteractions**, and lets privileged
users **edit a project member's role**.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [x] R13.1 — Catch-all error & not-found pages — `global-error.tsx` + in-app `error.tsx` + `not-found.tsx`
- [x] R13.2 — Fix missing `SUBLEAD` enum value in the DB (**DB change**) — adding a sub-lead currently throws
- [x] R13.3 — Action-item create/edit in a **modal** (remove the separate edit page + inline create form)
- [t] R13.4 — Action-item **inline per-field edits** with `InlineConfirm` microinteractions
- [ ] R13.5 — **Edit a project member's role** (permission-gated)

## Sequencing & file overlap
- **R13.2 before R13.5** — editing a member's role to "Sub-lead" only works once the DB enum has `SUBLEAD`.
- **R13.3 before R13.4** — both rewrite the project page's action-item rendering into a shared client
  component (`ActionItemRow` / `ActionItemsSection`); R13.3 introduces it (modal + redirect-free
  `updateActionItem`), R13.4 enhances the rows with inline editing. Same files → sequence, don't parallelize.
- R13.1 is independent of everything.

## Open questions / decisions before implementing
**All resolved 2026-06-29 — user approved the recommended answers:**
1. Member-role-edit gated by **`MANAGE_PROJECTS`** (no new permission).
2. Action-item modal **also wired into the global `/action-items` list** for editing (one edit path).
3. **Modal = create + full edit; inline ✓/✗ = quick single-field edits** (description / owner / deadline).
4. Member-role control = **inline with the `InlineConfirm` ✓/✗ microinteraction** (consistent with R13.4).

## DB changes in this set
- `ProjectMemberRole` enum: the Prisma schema already declares `LEAD | SUBLEAD | MEMBER`, but the **live
  DB enum only has `LEAD, MEMBER`** (verified) — so `prisma.projectAssignment.upsert({ role: "SUBLEAD" })`
  throws `invalid input value for enum "ProjectMemberRole": "SUBLEAD"`. Fix is **DB-only** (no
  `schema.prisma` or client change — the generated client already knows `SUBLEAD`). Apply
  statement-by-statement (ALTER TYPE ADD VALUE can't share a txn) via `scripts/apply-schema.ts`:
  `ALTER TYPE "ProjectMemberRole" ADD VALUE IF NOT EXISTS 'SUBLEAD' BEFORE 'MEMBER';`

## Log
- 2026-06-28 — Set 13 scaffolded (specs only). Verified the `SUBLEAD` DB-enum gap and the absence of any
  error/not-found pages. Branch `feat/set13-error-and-editing-polish`. No code yet — awaiting review of the
  specs + Open Questions.
