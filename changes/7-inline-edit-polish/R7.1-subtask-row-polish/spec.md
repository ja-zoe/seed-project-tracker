# R7.1 — Subtask row polish (status bullet + pill padding + click-name-to-reassign)

**Status:** tests passing
**Files:**
- `src/components/sortable-deliverables.tsx`

## Spec

**Problem:**
1. The subtask status pill is vertically cramped — `base` uses `py-0.5`, so the text sits
   tight against the pill edges.
2. Reassigning a subtask requires hovering the row to reveal a separate `UserCircle` button
   in Panel A. This is inconsistent with the status pill, which is directly clickable. The
   assignee name is already displayed but is inert.
3. R6.3 removed the far-left colored status bullet entirely (replaced by the pill). We want
   the bullet back as a **purely visual** status indicator at the far left of each subtask
   row, and want a hover/active **glow** so it's obvious which subtask you're pointing at or
   editing.

**Approach:**

*Status bullet (visual only)* — Reintroduce a small colored dot at the **far left** of each
subtask row, before the title flex container:
- Color mirrors the subtask status: `backgroundColor: STATUS_DOT_COLOR[subtask.status]`. A
  `~6px` dot (`w-1.5 h-1.5 rounded-full flex-shrink-0`).
- **Non-interactive** — render as a `<span>` (not a button), `aria-hidden`, no click handler.
  The status **pill** remains the only interactive status control.
- **Hover/active glow:** set the color on a CSS var (`style={{ "--dot": STATUS_DOT_COLOR[subtask.status] }}`)
  and apply a transitioned box-shadow that lights up in the status color when the row is
  hovered or active:
  `transition-shadow group-hover/subtask:shadow-[0_0_6px_1px_var(--dot)]`.
  Compute an `isActive` flag — true when this subtask is the one being edited
  (`pendingStatusEdit?.subtaskId === subtask.id`, or `editField`/`editingId` targets it) — and
  apply the same glow classes persistently while active, so the dot stays lit during an edit.
- The dot tracks the **committed** `subtask.status` (not the pending one); the pill already
  shows the pending status during confirm.



*Pill padding* — In `StatusPill` the shared `base` string (currently
`"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white leading-none flex-shrink-0 transition-colors"`),
change `py-0.5` → `py-1` (keep `px-2`). This applies to all three variants (static `<span>`,
confirming `<div>`, idle `<button>`) since they share `base`. Verify the row's
`items-center` keeps the taller pill vertically centered against the title and assignee.

*Click name to reassign* —
- **Remove** the `UserCircle` assignee button from Panel A (the `<button title="Change assignee">`
  block, ~lines 818–828). Panel A keeps only `CalendarBlank` (due date) and `XCircle` (delete).
- Make the **assignee name** the trigger. The existing display span (the `displayAssignee` branch,
  ~lines 752–758) becomes a `<button>` when `canEdit`, calling
  `startEdit(subtask.id, "assignee", subtask.assignee?.id ?? "")` and opening the picker
  (`setAssigneePickerOpen(true)`) — exactly what the old `UserCircle` button did. Style it to read
  as text (mono, `text-muted-foreground`, subtle `hover:text-foreground hover:underline`), not a
  button chrome.
- **Move the `personRefs` ref** (the `AssigneeSearch` anchor) from the removed `UserCircle` button
  onto this name trigger, so the picker anchors under the name.
- **Unassigned subtasks** currently render `null` (~line 759). When `canEdit`, render a clickable,
  muted **"Unassigned"** affordance (same mono styling, `text-muted-foreground/60`) that opens the
  picker, so there is always something to click. When `!canEdit` and unassigned, keep rendering
  nothing.
- The `editField === "assignee"` branch (~lines 731–751) that renders the name + `AssigneeSearch`
  stays; just ensure `AssigneeSearch`'s `anchorEl` resolves to the new name-trigger ref.
- **`!canEdit`** users: assignee name is a static `<span>` (unchanged), no pointer affordance.

No DB changes; no new server actions (reuses `updateSubtaskAssignee` from R6.3 via the existing
`commitEdit` path).

## Tests

- [x] `pnpm build` / typecheck passes
- [x] Playwright `r7-status-bullet`: a colored dot is present at the far left of each subtask
      row, its background matching `STATUS_DOT_COLOR[status]`; it is a `<span>` (no click
      handler); hovering the row adds a box-shadow glow (assert non-empty computed `box-shadow`
      on hover vs none at rest)
- [x] Playwright `r7-pill-padding`: status pill computed `padding-top`/`padding-bottom` is larger
      than the R6.3 baseline (`py-0.5`); subtask row stays vertically centered (pill, title,
      assignee aligned)
- [x] Playwright `r7-assignee-name-click`: Panel A has **no** `[title="Change assignee"]`
      UserCircle button; clicking the assignee **name** opens the picker
      (`[data-testid="assignee-picker"]` visible)
- [x] Playwright `r7-unassigned-click`: an unassigned subtask shows a clickable "Unassigned"
      that opens the picker
- [ ] App: pick a member → confirm → assignee persists on reload
- [ ] App: viewer (`canEdit=false`) sees a static assignee name with no click affordance

## Notes / log
- 2026-06-27 — Specced. No code written.
