# R7.3 — Deliverable lock tooltip (shadcn Tooltip)

**Status:** in progress (round 2 — review feedback)
**Files:**
- `src/components/ui/tooltip.tsx` (new — shadcn, uses `@base-ui/react/tooltip`)
- `src/components/sortable-deliverables.tsx`
- `src/app/(app)/layout.tsx` (add `TooltipProvider`)
- `package.json` (adds `@base-ui/react`)

## Spec

**Problem:** When a deliverable has subtasks, its status is locked (subtask-driven) and shows a
`LockSimple` badge. Hovering it is meant to explain why it can't be changed, but the current
implementation — a custom absolutely-positioned `div` revealed via `group/badge` +
`group-hover/badge:opacity-100` (~lines 549–578 of `sortable-deliverables.tsx`) — **isn't
working** (doesn't reliably appear). Replace it with the shadcn **Tooltip** component and show a
small explanatory text on hover.

**Approach:**

- **Add the shadcn Tooltip:** `pnpm dlx shadcn@latest add tooltip` → generates
  `src/components/ui/tooltip.tsx` and adds `@radix-ui/react-tooltip`. **Lucide check:** the Tooltip
  primitive ships no icons — verify the generated file imports nothing from `lucide-react`
  (`components.json` has `iconLibrary: "lucide"`, but that only matters for components that include
  icons). If anything Lucide sneaks in, remove it.
- **Restyle to Forest Floor:** edit the generated `TooltipContent` to the existing dark-on-light
  convention — `bg-foreground text-background`, small text (`text-[11px]`, optionally
  `var(--font-mono)`), `rounded-md px-2.5 py-1.5`, **no heavy shadow** (per CONTEXT style rules).
- **Provider:** add a single `<TooltipProvider delayDuration={200}>` high in the authenticated tree
  — in `src/app/(app)/layout.tsx`, wrapping the app shell — so all tooltips share one provider.
- **Wire the badge:** in the `hasSubtasks` branch, wrap the locked badge `<span>` as
  `<Tooltip><TooltipTrigger asChild>…locked badge…</TooltipTrigger><TooltipContent>…text…</TooltipContent></Tooltip>`.
  Radix renders the content in a portal, so it is **not** clipped by the card's `overflow-hidden`
  (the same problem R6.3 solved for dropdowns — here Radix handles it).
- **Content (dynamic):** a single small line that **names the subtask status driving the lock**,
  derived from the deliverable's current (subtask-derived) status. Phrasing map keyed on
  `deliverable.status`:
  - `BLOCKED`     → **"Status is locked because a subtask is blocked."**
  - `IN_PROGRESS` → **"Status is locked because a subtask is in progress."**
  - `COMPLETE`    → **"Status is locked because all subtasks are complete."**
  - `NOT_STARTED` → fallback **"Status is locked — it follows subtask progress."** (the lock
    tooltip generally only shows once a subtask has progressed, so this is rarely hit)

  Implement as a small `LOCK_REASON: Record<TimelineStatus, string>` lookup next to
  `STATUS_LABELS`. With this single dynamic line, **remove** the old custom tooltip `div` and the
  now-unused `nonStartedSubtasks` breakdown plumbing.
- Only the **locked** (has-subtasks) badge gets the tooltip; the editable/no-subtask badge variants
  are unchanged.

No DB changes; no new server actions.

## Tests

- [x] `pnpm build` / typecheck passes
- [x] Playwright `r7-tooltip`: hovering the locked deliverable badge shows `[data-slot="tooltip-content"]`
      whose text matches the deliverable's derived status; old custom `.group/badge` hover div is gone
- [x] Playwright: tooltip renders in a portal with valid bounding box (320×45px)
- [x] App: tooltip dismisses on mouse-out
- [x] App: generated `tooltip.tsx` uses `@base-ui/react/tooltip` — no `lucide-react`; `bg-foreground text-background` styling matches Forest Floor

Note: Base UI does not attach `role="tooltip"` — test uses `[data-slot="tooltip-content"]` selector.
`asChild` not supported by Base UI — badge wrapped via `render` prop on `TooltipTrigger`.

## Review feedback — round 2 (2026-06-27)

**Problem:** The locked deliverable badge sets `cursor-help` on its `<span>`
(`sortable-deliverables.tsx` ~line 606). The user wants **no cursor change** on hover — just the
tooltip.

**Approach:** Remove `cursor-help` from the locked badge's className (leave the default cursor). The
Tooltip still triggers on hover; only the cursor styling changes.

**Round-2 tests:**
- [ ] `pnpm build` / typecheck passes
- [ ] Playwright: the locked badge's computed `cursor` is not `help` (default/`auto`); the tooltip
      still appears on hover with the correct `LOCK_REASON` text

## Notes / log
- 2026-06-27 — Implemented. `pnpm dlx shadcn@latest add tooltip` generated a Base UI-backed component (not Radix). Removed the old broken `group/badge` absolute-div tooltip. Added `LOCK_REASON` map, `TooltipProvider` in app layout. Playwright passes. Branch: `feat/set7/R7.3-deliverable-lock-tooltip`.
