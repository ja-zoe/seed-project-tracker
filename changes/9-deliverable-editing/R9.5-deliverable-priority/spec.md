# R9.5 — Deliverable priority (inline + modal)

**Status:** planned
**Files:**
- `prisma/schema.prisma` (+ DDL via `scripts/apply-schema.ts`) — **DB change**
- `src/lib/actions/deliverables.ts` (`updateDeliverablePriority`; include priority in create/update)
- `src/components/sortable-deliverables.tsx` (inline priority control)
- `src/components/deliverable-modal.tsx` (priority field — R9.1)
- `src/app/(app)/projects/[id]/page.tsx` (select + pass `priority`)

**Lands early in the set** — R9.1 (modal) and R9.6 (ordering) consume it.

## Spec

**Problem:** Deliverables have no **priority**. The user wants an editable priority — inline in the
header and in the edit modal — and it drives the default within-group order (R9.6).

**Approach:**

*DB (Q2 — recommended enum):*
```sql
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
ALTER TABLE "Deliverable" ADD COLUMN "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';
```
Apply via `tsx scripts/apply-schema.ts` (never `prisma db push`). Add to `schema.prisma`:
`enum Priority { LOW MEDIUM HIGH }` and `priority Priority @default(MEDIUM)` on `Deliverable`; run
`prisma generate` and **restart the dev server** (Turbopack caches the WASM bundle — see `CONTEXT.md`).
Sort weight: `HIGH > MEDIUM > LOW` (highest on top).

*Server:* `updateDeliverablePriority(deliverableId, priority)` — membership/`MANAGE_MILESTONES`-gated;
`revalidatePath`. Also accept `priority` in `createDeliverable`/`updateDeliverable` (default `MEDIUM`).

*UI:*
- Inline: a small priority control in the deliverable header — a colored chip/label (e.g. LOW grey,
  MEDIUM amber, HIGH clay) that, when `canEdit`, opens a tiny portal menu (LOW/MEDIUM/HIGH) and commits
  on pick via `updateDeliverablePriority`. (Match the design system; no new heavy components.)
- Modal: a priority `<select>` in `DeliverableModal` (R9.1).
- Pass `priority` from the project page query into `SortableDeliverables`; add it to the `Deliverable`
  interface.

## Tests
- [ ] DDL applied; `priority` column exists with default `MEDIUM`; `prisma generate` + dev restart done
- [ ] `pnpm build` / typecheck passes
- [ ] Playwright: a deliverable shows a priority chip; changing it inline (LOW→HIGH) persists after
      revalidation
- [ ] App: priority is settable in the edit modal (R9.1) and on create
- [ ] App: existing deliverables backfill to `MEDIUM`

## Notes / log
- 2026-06-28 — Specced. No code written. DB SQL rolled into `_set.md` "DB changes in this set".
