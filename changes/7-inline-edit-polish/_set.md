# Revision Set 7 — Inline-edit polish & confirm microinteractions

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 7. Per-feature specs live in the sibling
`R7.*` directories; load only the feature(s) you are working on.

This set continues the inline-editing work from R6.3 (set 6): polishing the subtask row,
adding a shared confirm microinteraction, fixing the deliverable lock tooltip with shadcn,
and extending inline editing to deliverable fields. All features touch
`src/components/sortable-deliverables.tsx`.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [t] R7.1 — Subtask row polish — bullet/padding/click-name-to-reassign **[round 2 done: picker scoped+autofocus+keyboard, title confirm next to title]**
- [t] R7.2 — Confirm microinteractions — animated transitions + shared `InlineConfirm` **[round 2 done: CheckFat/XCircle icons]**
- [t] R7.3 — Deliverable lock tooltip — shadcn Tooltip **[round 2 done: dropped cursor-help]**
- [t] R7.4 — Inline deliverable editing — edit deliverable title, start date, and end date (`targetDate`) inline using the R7.2 microinteraction

## Sequencing & file overlap
All four features edit `src/components/sortable-deliverables.tsx`, so they are developed
**sequentially on the set branch — not fanned out to parallel agents** (separate branches
would still collide on that file). **R7.2 must land before R7.4**, because R7.4 reuses the
`InlineConfirm` primitive that R7.2 introduces. R7.1 and R7.3 are independent and can go in
any order relative to the others.

## Open questions / decisions before implementing
1. **Branch base.** This set builds directly on R6.3 code that is **not yet in `main`**
   (set 6 is `[t]`/awaiting the user's final verification). Recommendation: branch
   `feat/set7-inline-edit-polish` off **`feat/set6-projects-calendar`** (not `main`), and
   merge set 6 → `main` **before** set 7 → `main`. Confirm.
2. **"End date" mapping.** The `Deliverable` model has `startDate` (nullable) and
   `targetDate` (required) — there is no separate `endDate` column. Recommendation: treat
   **`targetDate` as the deliverable's "end date"** (no schema change). Confirm.
3. **Tooltip content (R7.3).** ✅ Resolved — a single small line that names the subtask status
   driving the lock, e.g. "Status is locked because a subtask is blocked." Per-subtask
   breakdown list dropped.

## DB changes in this set
**None.** All affected columns already exist (`Deliverable.title/startDate/targetDate`,
`Subtask.assigneeId`). Work is new server actions + UI only.

Non-DB setup: R7.3 adds the shadcn **Tooltip** component (`pnpm dlx shadcn@latest add tooltip`),
which pulls in `@radix-ui/react-tooltip`. The generated component ships no icons, so it does
not violate the Lucide ban — verify the generated file imports none.

## Log
- 2026-06-27 — Set 7 scaffolded; R7.1–R7.4 specced. No code written. Skill updated to state
  the user is the final merge-to-`main` gate only after the agent self-verifies (incl.
  Playwright for UI).
- 2026-06-27 — R7.1–R7.4 implemented, Playwright-verified, and merged into the set branch.
- 2026-06-27 — User review (the set→main gate) reopened R7.1/R7.2/R7.3 with round-2 feedback
  (`[~]`); each feature file has a "Review feedback — round 2" section. R7.4 unchanged. Set
  stays open; new/unrelated work moved to Set 8.
