# R6.3 — Inline subtask editing + deliverable status lock

**Status:** in progress
**Files:**
- `src/lib/actions/deliverables.ts` — cascade, new inline actions
- `src/components/sortable-deliverables.tsx` — major rewrite (pill, pencil, portal)
- `src/app/(app)/projects/[id]/page.tsx` — pass `members` prop
- `src/app/(app)/projects/[id]/deliverables/[did]/edit/page.tsx` — lock status field
- `e2e/subtask-ui.spec.ts` — Playwright visual verification
- `playwright.config.ts` — Playwright config

## Spec

### 1 · Deliverable status derivation

`updateSubtaskStatus` derives parent deliverable status after every subtask update:
```
if ALL COMPLETE          → COMPLETE
else if ANY BLOCKED      → BLOCKED
else if ANY IN_PROGRESS or COMPLETE → IN_PROGRESS
else                     → NOT_STARTED
```
Updates `deliverable.status`, `completed`, `completedDate`. Deliverables with no subtasks are
manual-only. `updateDeliverable` skips status when `formData.get("status")` is null (locked
deliverables omit the select entirely).

### 2 · Deliverable status lock in UI

`SortableDeliverables` deliverable badge:
- **Has subtasks:** read-only `<span>` with `LockSimple` + `group/badge` hover tooltip listing
  non-NOT_STARTED subtasks (`group-hover/badge:opacity-100`).
- **No subtasks + canEdit:** `<button>` opening `DeliverableStatusPopover` (portal-based).
- **No subtasks + !canEdit:** plain `<span>`.

Deliverable edit page: when `_count.subtasks > 0`, renders locked `<p>` instead of `<select>`.

### 3 · Status pill (replaces subtask status dot)

The colored bullet-dot is removed. In its place is a **status pill** between the title and assignee:

- Pill shape: `rounded-full px-2 py-0.5 text-[10px] font-medium text-white`
- Background color matches the old dot: `STATUS_DOT_COLOR[status]`
  (NOT_STARTED `#787774`, IN_PROGRESS `#1F6C9F`, BLOCKED `#A4503C`, COMPLETE `#588157`)
- **canEdit user:** pill is a `<button>`; click → `StatusDropdown` (portal-based list)
- **!canEdit user:** pill is a static `<span>`

**Confirm flow (on the pill itself):**
1. Click pill → `StatusDropdown` portal opens
2. Select a status from dropdown → dropdown closes, `pendingStatusEdit` (hoisted) is set
3. Pill morphs: shows pending-status text + `✓` + `✗` inline
4. `✓` → `confirmStatusEdit()` → `updateSubtaskStatus()` transition → back to idle
5. `✗` → `cancelStatusEdit()` → `pendingStatusEdit = null` → reverts to original

**State (hoisted to `SortableDeliverables`):**
```ts
const [pendingStatusEdit, setPendingStatusEdit] = useState<{
  subtaskId: string; status: TimelineStatus;
} | null>(null);
const [isStatusPending, startStatusTransition] = useTransition();
```
`startEdit()` clears `pendingStatusEdit`. Confirming status does not affect Panel B
(right-side ✓/✗ — those remain for title/assignee/dueDate edits only).

### 4 · Pencil icon coupled to title

`PencilSimple` is removed from Panel A and placed immediately after the title `<span>`,
inside the title's flex container. It uses `opacity-0 group-hover/subtask:opacity-100`.
Clicking it triggers `startEdit(id, "title", subtask.title)`.

Panel A now holds only: `CalendarBlank`, `UserCircle`, `XCircle`.

### 5 · Inline editing (title / assignee / dueDate) — slide-in confirm

Unchanged semantics. Pencil placement changed (§4). `pendingEdit` + `assigneePickerOpen` control
these. Panel B (✓/✗) is the confirm surface on the right side.

### 6 · Assignee picker — portal fix for overflow-hidden clipping

**Root cause:** deliverable card at `sortable-deliverables.tsx:441` has `overflow-hidden`,
clipping absolutely-positioned children (StatusPopover, AssigneeSearch both affected).

**Fix:** `AssigneeSearch` renders via `createPortal(…, document.body)`. Position computed from
UserCircle button's `getBoundingClientRect()` on mount → `position: absolute` with
`top: rect.bottom + scrollY + 4, left: rect.left + scrollX`. The portal div has
`onMouseDown={e.stopPropagation()}` to prevent outside-click firing inside picker.

Outside-click handler excludes `anchorEl` so clicking UserCircle does not immediately re-close.

**`personRefs`:** `useRef<Map<string, HTMLButtonElement | null>>(new Map())` captures each
subtask's UserCircle button. Passed as `anchorEl={personRefs.current.get(subtask.id) ?? null}`.

### 7 · StatusDropdown (portal, replaces StatusPopover)

`StatusDropdown` renders via portal below the pill button (`anchorEl` from `useRef` in
`StatusPill`). Outside-click (excluding `anchorEl`) calls `onClose`.

`StatusPill` is a component managing `dropdownOpen: boolean` internally; receives hoisted
`pendingStatus`, `onPick`, `onConfirm`, `onCancel`, `isTransitioning` from parent.

`StatusPopover` (old subtask dot popover), `dotRefs`, and `statusMenuFor` state are all removed.

### 8 · New server actions (already implemented)

```ts
updateDeliverableStatus(deliverableId, status)
updateSubtaskAssignee(subtaskId, assigneeId | null)
updateSubtaskDueDate(subtaskId, dueDate | null)
```
No new DB changes needed.

### 9 · Playwright verification

Install: `pnpm add -D @playwright/test && pnpm exec playwright install chromium`

Config at `playwright.config.ts`: base URL `http://localhost:3000`, `chromium` only,
screenshots on failure, output dir `e2e/screenshots/`.

`e2e/subtask-ui.spec.ts`:
1. Logs in as `jav273` via `/dev-login`
2. Navigates to first project on dashboard
3. Takes screenshots: default row, hover (pencil visible), pill dropdown open,
   pill confirm state, assignee picker open (verifying no clipping)
4. Verifies pill background-color matches `STATUS_DOT_COLOR`

Screenshots stored in `changes/6-projects-calendar/R6.3-inline-subtask-status/screenshots/`.

## Tests

- [x] `pnpm build` / typecheck passes
- [x] Playwright: `subtask-row-default` — pill between title and assignee, no bullet dot
- [x] Playwright: `subtask-hover` — pencil appears next to title text on hover
- [x] Playwright: `pill-dropdown-open` — status dropdown unclipped, full list visible
- [x] Playwright: `pill-confirming` — pill shows pending status + ✓ ✗ inline
- [x] Playwright: `assignee-picker-open` — picker unclipped, not cut off by card border
- [ ] App: ✓ on pill confirms status change, persists on reload
- [ ] App: ✗ on pill reverts to original status
- [ ] App: pencil positioned immediately after title text
- [ ] App: assignee picker shows all project members, filter works
- [ ] App: viewer (canEdit=false) sees static pill, no interactive icons

## Notes / log
- 2026-06-27 — Original scope: inline subtask status-dot popover. Build clean.
- 2026-06-27 — Expanded: deliverable lock + cascade + full inline editing + slide-in confirm. Build clean.
- 2026-06-27 — Bug fix: `assigneePickerOpen` state separated from `pendingEdit` to fix ✓ conflict.
- 2026-06-27 — Third iteration: dot → pill with inline confirm; pencil to title; portal fix for
  overflow-hidden clipping; Playwright added. Promoted to directory.
