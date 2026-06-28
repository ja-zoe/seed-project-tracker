# Revision Set 9 — Deliverable editing & organization

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 9. Per-feature specs live in the sibling
`R9.*` directories; load only the feature(s) you are working on.

This set brings deliverables up to the same editing richness as subtasks (sets 6–8): a full **edit
modal**, **check/✗ confirm microinteractions** on status + delete, an **inline group combobox**, an
**expandable + inline-editable description** (Markdown/plain), a new editable **priority**, and
**group filtering + within-group reordering** (default: priority, highest on top). All features center
on `src/components/sortable-deliverables.tsx` + `src/lib/actions/deliverables.ts`.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [t] R9.1 — Deliverable edit modal — convert the `/deliverables/[did]/edit` screen into a modal (mirrors R8.1's subtask modal); includes priority (R9.5) + group (R9.3)
- [t] R9.2 — Deliverable status + delete microinteractions — the inline deliverable **status** edit and the **delete** button use the same animated ✓/✗ `InlineConfirm` (CheckFat/XCircle) as the subtask status pill
- [t] R9.3 — Inline group combobox — edit a deliverable's group inline via a dropdown of existing groups, with type-to-create-new
- [t] R9.4 — Deliverable description expand + inline edit — clicking the deliverable body (not a control) shows its description; edit it inline (Markdown or plain) without a modal
- [t] R9.5 — Deliverable priority — new editable `priority` field, inline in the header and in the edit modal (**DB change**)
- [t] R9.6 — Group filter + within-group ordering — filter deliverables by group; reorder within a group; default sort is by priority (highest at top)
- [ ] R9.7 — Subtask description inline edit — edit a subtask's description inline (Markdown/plain) in the expanded region, like the deliverable description (R9.4)
- [ ] R9.8 — Project edit modal — convert the `/projects/[id]/edit` screen into a modal (mirrors R9.1/R8.1)
- [ ] R9.9 — Status-confirm contrast — the confirm ✓ is invisible on the COMPLETE (green) status pill; make it legible on any pill color
- [ ] R9.10 — e2e test cleanup — tag test projects and auto-delete them after the run (no manual cleanup)

**Added 2026-06-28 (round 2):** R9.7–R9.10 — editing-UX/bug/test refinements requested by the user
alongside the new Set 10 (calendar/status) work. Set 9 reopens until these ship; then R9.1–R9.10 merge
to `main` together.

## Sequencing & file overlap
- Every feature touches `src/components/sortable-deliverables.tsx` and/or `deliverables.ts`, so they
  are developed **sequentially on the set branch**, not fanned out to parallel agents.
- **R9.5 (priority) lands early** — R9.1 (modal) and R9.6 (ordering) both consume it.
- **R9.3 (groups)** lands before **R9.6** (group filter needs the group editing in place).
- R9.2 (microinteractions) and R9.4 (description) are independent of the others.
- Reuses primitives from sets 7–8: `InlineConfirm` (R7.2), the portal `useAnchorPos`/`AssigneeSearch`
  pattern (R6.3/R7.1) for the group combobox, the Dialog (R8.1) for the modal, `MarkdownEditor` /
  `react-markdown` for descriptions, and `deriveDeliverableStatus` stays authoritative for status.

## Open questions / decisions before implementing
1. **Branch base.** Set 9 builds on set-8 deliverable/subtask code (not in `main`; sets 6–8 await
   merge). Recommendation: branch `feat/set9-deliverable-editing` off the **final** `feat/set8-…`
   branch **after** the set-8 round-2 changes land and the user verifies set 8 is done. Merge order to
   main: 6 → 7 → 8 → 9. Confirm.
2. **Priority type (R9.5).** Recommendation: a Postgres enum **`Priority { LOW, MEDIUM, HIGH }`**
   (default `MEDIUM`), sorting `HIGH > MEDIUM > LOW` (highest on top). Simple, user-friendly, and
   orderable. Alternative: an integer rank. Confirm enum + levels.
3. **Convert the deliverable CREATE page too? (R9.1).** The user said the "edit screen" → modal.
   Recommendation: convert **both** create and edit into one `DeliverableModal` (consistent with the
   R8.1 subtask modal; the existing "+ Add deliverable" / `/deliverables/new` page would be removed).
   Confirm (alternative: modal for edit only, keep the create page).
4. **Reorder mechanism (R9.6).** No drag-and-drop library is installed. Recommendation: **up/down
   buttons** per deliverable that swap `orderIndex` with the neighbor in the same group (no new
   dependency). Alternative: add `@dnd-kit` for drag. Confirm.
5. **Default order vs manual order (R9.6).** "Default by priority, highest at top" + "edit the
   ordering." Recommendation: within each group, sort by `orderIndex`; seed `orderIndex` from priority
   so the default *is* priority order, and the up/down buttons rewrite `orderIndex`. Offer a "sort by
   priority" reset. Confirm.

## DB changes in this set
**R9.5 — add `priority` to `Deliverable`** (apply via `scripts/apply-schema.ts`, per `CONTEXT.md`).
Pending Q2 (enum vs int). If enum (recommended):

```sql
-- APPLIED 2026-06-28 via scripts/apply-schema.ts (also at R9.5-…/fix.sql)
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');  -- (idempotent guard in fix.sql)
ALTER TABLE "Deliverable" ADD COLUMN "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';
```

Also reconcile `prisma/schema.prisma` (`enum Priority` + `priority Priority @default(MEDIUM)` on
`Deliverable`) and regenerate the client (restart the dev server — Turbopack caches the WASM bundle).
No other DB changes (`description`, `group`, `orderIndex` already exist).

## Log
- 2026-06-28 — Set 9 scaffolded; R9.1–R9.6 specced. No code written. Gated on the user verifying Set 8
  (incl. its round-2 changes) is done before building Set 9.
- 2026-06-28 — All R9.1–R9.6 implemented, Playwright-verified, and merged into the set branch
  (`feat/set9-deliverable-editing`, off `main`). DB: `Priority` enum + `Deliverable.priority` applied.
  Full e2e suite green (25 tests; `retries:1` absorbs transient shared-dev-server flakes); `pnpm build`
  clean. Decisions: priority enum LOW/MEDIUM/HIGH; deliverable EDIT→modal (create page kept); up/down
  reorder within a priority tier. **Awaiting the user's validation before merging to `main`** (6→7→8 are
  already in main; this would be set 9).
