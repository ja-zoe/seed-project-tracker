# R9.5 — Deliverable priority (inline + modal)

**Status:** tests passing
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
- [x] DDL applied (`Priority` enum + `Deliverable.priority` NOT NULL default MEDIUM); `prisma generate`
      + dev-server restart done (Turbopack WASM cache)
- [x] `pnpm build` / typecheck passes
- [x] Playwright: a deliverable shows a "Med" chip (default); changing it inline (Med→High) persists
      through a reload
- [~] App: priority in the edit modal + on create — deferred to R9.1 (the modal); create defaults to MEDIUM
- [x] App: existing deliverables backfill to `MEDIUM` (column default)

DECISION (user-confirmed): `Priority` enum LOW/MEDIUM/HIGH, default MEDIUM, sort HIGH→LOW.

## Notes / log
- 2026-06-28 — Specced. No code written. DB SQL rolled into `_set.md` "DB changes in this set".

- 2026-06-28 — Implemented & Playwright-verified. Enum `Priority` (LOW/MEDIUM/HIGH) added; column via fix.sql; `PriorityMenu` + inline chip; `updateDeliverablePriority`. Branch: `feat/set9/R9.5-priority`.
