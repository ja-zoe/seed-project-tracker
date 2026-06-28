# R9.6 — Group filter + within-group ordering

**Status:** planned
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
- [ ] `pnpm build` / typecheck passes
- [ ] Playwright: a group filter shows only the chosen group's deliverables; "All" restores everything
- [ ] Playwright: within a group, the default order is by priority (a HIGH sorts above a LOW)
- [ ] Playwright: up/down moves a deliverable within its group and persists (order holds after reload);
      "up" disabled at top, "down" at bottom
- [ ] App: reordering never crosses group boundaries

## Notes / log
- 2026-06-28 — Specced. No code written.
