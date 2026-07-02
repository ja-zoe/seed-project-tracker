# Revision Set 21 — Lead usability & cross-surface parity (autonomous gnhf run)

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 21. Per-feature specs live in the sibling `R21.*` files;
load only the feature(s) you are working on.

> **Retroactive record (written 2026-07-01, after the merge).** This set was NOT produced by the normal
> scaffold→spec→implement workflow. It documents an autonomous "gnhf" run whose prompt was: *"Pretend you
> are a project lead using the app. Find the first usability problem that will impede your project
> management duties, stop and fix it, rinse and repeat."* The run made 16 sequential fixes as individual
> commits directly on branch `gnhf/pretend-you-are-a-pr-02cf79` (no set/feature branches), which the user
> reviewed and fast-forward merged to `main` at `4c45d84`. Run artifacts (prompt, per-iteration notes,
> transcripts) live in `.gnhf/runs/pretend-you-are-a-pr-02cf79/` — untracked/local only; the per-feature
> files here preserve the durable content.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [x] R21.1 — Behind-banner dead link — "Add one" corrective-action-plan link 404'd; now opens ProjectModal
- [x] R21.2 — Lead deliverable create/delete — create/delete were PM-only despite leads editing deliverables
- [x] R21.3 — EDIT_OWN_PROJECT wired — the permission existed but was enforced nowhere; leads can now edit their project
- [x] R21.4 — Action-items hub lead edit — global /action-items gated edit on PM-only ASSIGN_ACTION_ITEMS
- [x] R21.5 — Action-item close/reopen — close/reopen required global CLOSE_ACTION_ITEMS, unlike create/update/delete
- [x] R21.6 — MCP action-item owner — create/update_action_item tools couldn't assign/reassign owners
- [x] R21.7 — MCP status-update meeting link — create_status_update made orphan updates that never cleared the web pending affordance
- [x] R21.8 — My Tasks subtask quick-complete — subtasks lacked the one-click complete that action items had
- [x] R21.9 — History-page standing controls — edit/delete existed on project page recent-5 but not the history page
- [x] R21.10 — MCP delete_deliverable lead gate — the one deliverable tool still PM-only, out of sync with its siblings
- [x] R21.11 — Standing edit needs-help toggle — edit modal lacked the "I need help from the PM" field the submit form has
- [x] R21.12 — Subtask startDate — dead column drove Gantt/Excel but no write surface set it; added to all four
- [x] R21.13 — Subtask overdue flagging — subtask due dates never rendered red/overdue on any surface
- [x] R21.14 — Deliverable priority at create — primary sort key editable everywhere but never settable at creation
- [x] R21.15 — Standing Next Week display — project page recent-standings omitted nextWeekGoals shown on history
- [x] R21.16 — Deliverable date validation — create paths (web + MCP) skipped the start<=target check the edit paths enforce

## Open questions / decisions before implementing
None — retroactive; all decisions were made autonomously during the run and accepted in user review.

## DB changes in this set
None. Every fix is app-layer; R21.12 populates the pre-existing `Subtask.startDate` column.

## Log
- 2026-07-01 — Autonomous gnhf run executed 17 iterations, committing 16 fixes (`3d70946`..`4c45d84`) on
  `gnhf/pretend-you-are-a-pr-02cf79`. Verification per iteration: `tsc --noEmit` (one pre-existing unrelated
  error in `e2e/r14-design-shots.spec.ts`) + the run's own behavioral checks. No per-feature Playwright specs
  were written (deviation from house workflow).
- 2026-07-01 — **Set 21 complete. User reviewed the run and fast-forward merged
  `gnhf/pretend-you-are-a-pr-02cf79` to `main` (`df33647`..`4c45d84`) and pushed.** All 16 features `[x]`.
- 2026-07-01 — Retroactive set entry written; cross-surface-parity invariant promoted to `CONTEXT.md`.
