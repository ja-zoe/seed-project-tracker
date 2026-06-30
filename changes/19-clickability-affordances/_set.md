# Revision Set 19 — Site-wide clickability affordances

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 19. Per-feature specs live in the sibling
`R19.*` files; load only the feature(s) you are working on.

> **Planned 2026-06-30 (specs only — no code yet).** A single large, cross-cutting concern, scoped as its
> own set per the request: interactive elements aren't consistently signalled. Some have tooltips, some
> change the cursor, many give no signal — so users can't tell whether a thing opens a deliverable, edits
> an inline field, or does nothing. This set establishes one affordance convention (R19.1) and rolls it
> out everywhere with a full audit + Playwright verification (R19.2).

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [t] R19.1 — Affordance convention — shared utility classes + the documented rule (hover color cue for any
      clickable element; pointer cursor + color shift for clickable icons), built on the Forest Floor tokens
- [t] R19.2 — Site-wide rollout + audit — apply the convention to every interactive surface (deliverables,
      inline-editable items, subtasks, icon buttons, lists, calendar, modals…), verified with Playwright

## Sequencing & file overlap
- **R19.1 first** (it defines the utilities R19.2 applies). R19.1 is small and isolated to `globals.css`
  (+ a one-line CONTEXT.md standing-decision once implemented).
- **R19.2** edits many components — it is the bulk of the set. It depends on R19.1's classes existing.
- No DB changes anywhere in this set.

## Open questions / decisions before implementing
1. **R19.1 — the exact hover cue.** **RESOLVED 2026-06-30 (user):** color-shift on Forest Floor tokens
   (normal → forest `#2E4034`, destructive → clay `#A4503C`), no background fill on controls. **Plus a
   row-vs-control distinction:** clickable *container rows* (deliverable/subtask) get a subtle hover tint
   with **default cursor** (so you can tell which row you're on), while the *controls inside* (inline-edit
   icons, buttons) get the **pointer cursor** + color shift. See R19.1 for the class set
   (`.clickable-row` / `.clickable-icon` / `.clickable` / `.clickable-danger`).
2. **R19.2 — scope of "clickable".** **Recommendation:** apply to genuinely interactive elements only —
   buttons, links, icon-buttons, inline-edit triggers, sortable rows, calendar cells, modal controls.
   **Do not** add affordances to static/display elements (status badges that aren't buttons, plain text),
   to avoid implying false interactivity. Confirm the include/exclude line.

## DB changes in this set
- None.

## Log
- 2026-06-30 — Set 19 scaffolded (specs only). Two features: convention (R19.1) then audited rollout +
  Playwright (R19.2). Branch (when work starts): `feat/set19-clickability-affordances`.
- 2026-06-30 — Implemented both features on `feat/set19-clickability-affordances`.
  - R19.1 [t]: `.clickable-row` / `.clickable-icon` / `.clickable` / `.clickable-danger` added to
    `globals.css`; convention documented in `CONTEXT.md` standing decisions. Hover color = forest
    `--primary` (#2E4034) per user decision; rows tint with default cursor.
  - R19.2 [t]: convention rolled out across `sortable-deliverables`, action items, modals (via shadcn
    `Button` base), projects list, calendar, account, pm pages, sidebar, markdown editor, etc. Static
    display elements untouched. `pnpm build` clean; `e2e/r19-affordances.spec.ts` green (1 passed).
  - Branch was rebased onto current `main` (`12852b1`) at start — the worktree had been cut from a stale
    main missing the set 18/19 spec commits.
  - **Not merged / not pushed** — awaiting user review. NB: the parallel Set 18 work added a `DELETE_USERS`
    Permission enum to the shared dev DB; a temporary (reverted) schema shim was needed only to run e2e.
