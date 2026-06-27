# Revision Set 2 — Fixes & Deliverable Groups

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 2. Per-feature specs live in the sibling
`R2.*` files.

## Status
- [x] R2.1 — Fix /pm/users crash (onClick handler in a Server Component)
- [x] R2.2 — Prevent double-submit on create forms (SubmitButton + useFormStatus)
- [x] R2.3 — Edit subtask page
- [x] R2.4 — Edit action item page
- [x] R2.5 — Deliverable groups (optional `group` label)
- [x] R2.6 — Sort deliverables by status (client-side toggle)

## Open questions / decisions before implementing
None (set complete).

## DB changes in this set
`Deliverable.group` (nullable) — see `R2.5-deliverable-groups.md`.
```sql
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "group" TEXT;
```
Applied via `scripts/apply-schema.ts`.

## Log
- 2026-06-26 — Set 2 complete (`feat/rev2-fixes-and-groups`, historically logged as merged to `develop`; `main` is the actual integration branch).
