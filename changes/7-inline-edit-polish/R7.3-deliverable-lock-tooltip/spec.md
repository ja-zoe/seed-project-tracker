# R7.3 — Deliverable lock tooltip (shadcn Tooltip)

**Status:** planned
**Files:**
- `src/components/ui/tooltip.tsx` (new — shadcn)
- `src/components/sortable-deliverables.tsx`
- `src/app/(app)/layout.tsx` (add `TooltipProvider`)
- `package.json` (adds `@radix-ui/react-tooltip`)

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

- [ ] `pnpm build` / typecheck passes
- [ ] Playwright `r7-tooltip`: hovering the locked deliverable badge shows a `role="tooltip"`
      whose text matches the deliverable's derived status (e.g. a BLOCKED-derived deliverable
      reads "…because a subtask is blocked."); the old custom `.group/badge` hover div is gone
- [ ] Playwright: tooltip renders in a portal and is not clipped by the deliverable card
- [ ] Playwright: a non-locked (editable) deliverable badge shows **no** tooltip
- [ ] App: tooltip appears ~200 ms after hover and dismisses on mouse-out
- [ ] App: generated `tooltip.tsx` imports no `lucide-react`; styling matches Forest Floor
      (dark bg, light text, no heavy shadow)

## Notes / log
- 2026-06-27 — Specced. No code written.
