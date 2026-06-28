# Revision Set 8 — Subtask modal, expandable rows, bulk ops & fixes

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 8. Per-feature specs live in the sibling
`R8.*` directories; load only the feature(s) you are working on.

This set adds a full-subtask **modal** (for create and whole-record edit) alongside the inline
edits from sets 6–7, makes subtask rows **expand** to show their description, **bounds** subtask
due dates by the parent deliverable, and fixes three correctness bugs (deliverable status not
re-deriving on subtask add/delete; status-update submission crashing on a Prisma null constraint;
plus a new bulk project-delete for PMs).

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [x] R8.1 — Subtask modal **[round 2 done: modal description Markdown/plain]**
- [x] R8.2 — Expandable subtask description **[round 2 done: Markdown render + click-anywhere-on-row]**
- [x] R8.3 — Subtask due-date bounds & year — bound a subtask's due date by the deliverable's start/target dates; show the year in due-date labels when it isn't the current year
- [x] R8.4 — Deliverable status re-derivation (bug) — adding/deleting a subtask must recompute the parent deliverable's derived status, not just status edits
- [x] R8.5 — Bulk project delete — `MANAGE_PROJECTS` users can multi-select projects in the list and delete them together
- [x] R8.6 — Status-update Prisma null constraint (bug) **[round 2 done: submit loading state]**

## Sequencing & file overlap
- **R8.1, R8.2, R8.3, R8.4** all touch the subtask surface (`src/components/sortable-deliverables.tsx`
  and/or `src/lib/actions/deliverables.ts`), so they are developed **sequentially on the set branch**,
  not fanned out to parallel agents.
- **R8.4 (derive helper) should land before/with R8.1**, since the modal's create path should call the
  same `deriveDeliverableStatus` helper R8.4 introduces.
- **R8.3** depends on the date inputs that R8.1 (modal) and the existing inline editor both render —
  do R8.1 first so the `max`/`min` bounds apply in both places.
- **R8.5** (projects list) and **R8.6** (status-update action) touch disjoint files and are independent;
  either can be done any time.

## Open questions / decisions before implementing
1. **Branch base.** Set 8 builds on the set-7 subtask-row code, which is **not yet in `main`**
   (set 6 and set 7 are still awaiting your final merge). Recommendation: branch
   `feat/set8-subtask-modal-bulk-fixes` off **`feat/set7-inline-edit-polish`**, and merge to `main`
   in order **set 6 → set 7 → set 8**. Confirm.
2. **Modal primitive (R8.1).** Recommendation: add the shadcn **Dialog** (`pnpm dlx shadcn@latest add
   dialog`), which — like the R7.3 Tooltip — generates a Base UI-backed component with no Lucide. Confirm.
3. **`/subtasks/new` page (R8.1).** ✅ Resolved — **delete** the
   `/projects/[id]/deliverables/[did]/subtasks/new` page entirely; the modal fully replaces it.
4. **Empty deliverable after deleting its last subtask (R8.4).** When the final subtask is deleted, the
   deliverable has no subtasks to derive from. Recommendation: set `completed=false` and **leave the
   current status**, so the standalone (manually-editable) status pill returns. Confirm (alternative:
   reset to `NOT_STARTED`).
5. **Due-date bound: hard vs soft (R8.3).** Recommendation: **hard** bound — `max` attr on the date
   inputs **and** server-side rejection of `dueDate > deliverable.targetDate` (and `< startDate` if
   set). Confirm.
6. **Bulk-delete UX (R8.5).** Recommendation: a **"Select" toggle** (PM-only) that reveals per-card
   checkboxes plus a sticky "N selected · Delete · Cancel" action bar with a confirm step; cards stay
   navigable when not selecting. Confirm (alternative: always-visible checkboxes).

## DB changes in this set
**R8.6 (applied):** the `StatusUpdate.updatedAt` column was NOT NULL with no default and absent from
the Prisma model, so every insert violated the constraint. Patched via `scripts/apply-schema.ts`:

```sql
ALTER TABLE "StatusUpdate" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
```

(Also saved at `R8.6-status-update-null-constraint/fix.sql`.) No other DB changes — the rest of the
set's affected columns already exist (`Subtask.description/dueDate`, `Deliverable.startDate/targetDate`).

Non-DB setup: R8.1 adds the shadcn **Dialog** component (`pnpm dlx shadcn@latest add dialog`). Verify
the generated file imports no `lucide-react` (Lucide is banned — see `CONTEXT.md`).

## Log
- 2026-06-27 — Set 8 scaffolded; R8.1–R8.6 specced. No code written.
- 2026-06-27 — All R8.1–R8.6 implemented, Playwright-verified, and merged into the set branch
  (`feat/set8-subtask-modal-bulk-fixes`). Full e2e suite (16 tests) green; `pnpm build` clean.
  Awaiting the user's final review before merging to `main` (order: set 6 → set 7 → set 8).
- 2026-06-28 — User review reopened R8.1/R8.2/R8.6 with round-2 feedback (`[~]`): subtask description
  Markdown/plain (R8.1 editor + R8.2 render), click-anywhere-on-row to expand (R8.2), and a
  status-update submit loading state (R8.6). Specced only — implementation pending the user's go-ahead.
  New deliverable-editing work moved to Set 9 (scaffolded, not built; gated on the user verifying
  Set 8 is done first).
- 2026-06-28 — Round-2 changes implemented & Playwright-verified, each merged into the set branch:
  R8.2-r2 (shared `MarkdownView`, click-row-to-expand), R8.1-r2 (controllable `MarkdownEditor` in the
  modal), R8.6-r2 (`SubmitButton` loading state). All R8.* back to `[t]`. Full e2e suite (19 tests)
  green; `pnpm build` clean. **Awaiting the user's validation of Set 8 before merging to `main`**
  (order 6 → 7 → 8), and before building Set 9.
- 2026-06-28 — Set 8 merged to `main` (stack 6→7→8). All features `[x]`.
