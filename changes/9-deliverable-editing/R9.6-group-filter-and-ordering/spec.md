# R9.6 — Group filter + within-group ordering

**Status:** tests passing
**Files:**
- `src/components/sortable-deliverables.tsx`
- `src/lib/actions/deliverables.ts` (`reorderDeliverable` / `moveDeliverable`)

**Depends on:** R9.3 (groups editable) and R9.5 (priority).

## Spec

**Problem:** The user wants to (a) **filter deliverables by group**, and (b) **edit the ordering** of
deliverables within a group, with the **default order being by priority (highest at top)**.

**Approach:**

*Grouping already exists* — `SortableDeliverables` already builds `sections` by `group` (and has a
"Sort by status" toggle). Build on that.

*Group filter (a):* add a **group filter** control near the existing sort toggle — a dropdown/segmented
list of the project's groups (+ "All" and "Ungrouped"). Selecting a group shows only that group's
deliverables. Client-side state (`groupFilter: string | null`); no server round-trip needed (the page
already loads all deliverables).

*Default order = priority (b, Q5):* within each group, sort by **`priority` desc** then a stable
tiebreak. Concretely (Q5 recommendation): sort by `orderIndex`, and **seed `orderIndex` from priority**
so the default *is* priority order; new/edited deliverables slot in by priority. Provide a "Sort by
priority" action that rewrites `orderIndex` to the current priority order.

*Manual reorder (b, Q4 — no dnd lib):* per-deliverable **up/down** controls (when `canEdit`) that swap
`orderIndex` with the adjacent deliverable **in the same group**. Server action
`moveDeliverable(deliverableId, direction: "up" | "down")` — loads the deliverable's group siblings
ordered by `orderIndex`, swaps the two neighbors' `orderIndex`, `revalidatePath`. Disable "up" on the
first and "down" on the last of a group. (Alternative if Q4 = drag: add `@dnd-kit` and a
`reorderDeliverables(ids[])` action — out of scope unless chosen.)

No DB changes (`orderIndex`, `group`, `priority` all exist after R9.5).

## Tests
- [x] `pnpm build` / typecheck passes
- [x] Playwright: the group filter shows only the chosen group; "All groups" restores everything
- [x] Playwright: within a group, default order is by priority (HIGH sorts above MED/LOW)
- [x] Playwright: up/down reorders within a priority tier (move P-Med-B above P-Med-A); the HIGH row is
      unaffected; reorder controls only render when a same-priority neighbor exists
- [x] App: `moveDeliverable` swaps orderIndex only among same-group, same-priority siblings (never
      crosses group or priority boundaries)

DECISIONS (user-confirmed): default sort = priority DESC then orderIndex; reorder = up/down buttons
(no dnd lib). Reorder operates **within a priority tier** (priority is the primary sort key); moving a
row across tiers is done by changing its priority (R9.5).

## Notes / log
- 2026-06-28 — Specced. No code written.

- 2026-06-28 — Implemented & Playwright-verified. `moveDeliverable` (swap orderIndex, same group+priority); group-filter `<select>`; within-group sort priority-then-orderIndex; caret up/down controls. Branch: `feat/set9/R9.6-filter-ordering`.
