# R9.3 — Inline group combobox

**Status:** tests passing
**Files:**
- `src/components/sortable-deliverables.tsx`
- `src/lib/actions/deliverables.ts` (`updateDeliverableGroup`)
- `src/app/(app)/projects/[id]/page.tsx` (pass the project's existing group list to the component)

## Spec

**Problem:** A deliverable's **group** can only be set on the edit page (a `<datalist>` text input).
The user wants to edit it **inline** in the deliverable header via a **combobox**: a dropdown of the
project's already-used groups, plus the ability to **type a new group and create it**.

**Approach:**
- **Server action** `updateDeliverableGroup(deliverableId, group: string | null)` in `deliverables.ts`
  — membership/`MANAGE_MILESTONES`-gated like the other inline edits; trims; empty string → `null`
  (ungrouped); `revalidatePath`. (No re-derive needed — group doesn't affect status.)
- **Existing-groups source:** the project page already derives distinct groups for the edit page
  (`where: { projectId, group: { not: null } }, distinct: ["group"]`). Pass that `string[]` into
  `SortableDeliverables` as a prop (e.g. `groups`).
- **UI:** show the group as an inline chip/label in the deliverable header (near the title/status).
  When `canEdit`, clicking it opens a **portal combobox** built on the same `useAnchorPos` +
  outside-close pattern as `AssigneeSearch` (R6.3/R7.1): a text input at top (filters + lets you type a
  new name) and a list of existing groups, plus a "Ungrouped" option to clear. Selecting an existing
  group or pressing Enter on a typed value commits via `updateDeliverableGroup`. Keyboard nav
  (Arrow/Enter/Esc) like the R7.1 assignee picker. A typed value not in the list shows a "Create
  '<x>'" affordance.
- Ungrouped deliverables show a muted "+ Group" affordance (when `canEdit`) that opens the same combobox.

No DB changes (`group` column already exists).

## Tests
- [x] `pnpm build` / typecheck passes
- [x] Playwright: typing a new group "Frontend" + Enter creates & assigns it; it then appears in the
      combobox for another deliverable, which reuses it via ArrowDown+Enter (keyboard)
- [x] Playwright: an ungrouped deliverable shows "+ Group"; clearing via "Ungrouped" restores it
- [x] App: combobox autofocuses; arrow/Enter/Esc keyboard nav works

Implemented `GroupCombobox` (portal, like `AssigneeSearch`). Options: empty query → Ungrouped + all
groups; typing → matches first then a Create "<q>" option (so Enter matches/creates, never clears).
`updateDeliverableGroup` server action; groups derived in-component from the loaded deliverables.

## Notes / log
- 2026-06-28 — Specced. No code written.

- 2026-06-28 — Implemented & Playwright-verified. Branch: `feat/set9/R9.3-group-combobox`.
