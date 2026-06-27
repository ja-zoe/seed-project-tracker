# R7.2 — Confirm microinteractions

**Status:** tests passing
**Files:**
- `src/components/sortable-deliverables.tsx`
- `src/app/globals.css`

## Spec

**Problem:** The status pill swaps **instantly** between its idle `<button>` and the confirming
`<div>` (the `✓ | ✗` controls), and the committed/reverted result appears with no transition. The
jump feels abrupt and cheap. We want intentional, subtle micro-animations on two moments:
1. **Select → confirm:** after a status is picked, the `✓ / ✗` controls animate in.
2. **Confirm → result:** after `✓` (commit) or `✗` (revert), the resulting pill state animates in.

The transitions should be quick and understated (~150–200 ms, ease-out) — "intentional," not
flashy — and respect `prefers-reduced-motion`.

**Approach:**

*Keep elements mounted; animate with CSS.* Today `StatusPill` returns a **different** element when
`confirming`, which forces a mount/unmount swap that can't tween. Restructure so the pill container
is always rendered and the confirm controls animate via transitions rather than mount swaps:

- Extract the `✓ | ✗` controls into a small reusable component **`InlineConfirm`** (props:
  `show: boolean`, `onConfirm`, `onCancel`, `disabled`). Render it inside the pill, always mounted,
  wrapped in `inline-flex overflow-hidden transition-all duration-200 ease-out` that toggles between
  collapsed (`max-w-0 opacity-0`) and expanded (`max-w-[44px] opacity-100`) on `show`. This gives a
  smooth width+fade reveal of the controls.
- **Label crossfade:** when `displayStatus` changes (pick / revert), the pill label fades. Apply a
  short `transition-opacity`/keyed fade so the new label settles rather than hard-cutting. The
  existing `transition-colors` already tweens the background color between statuses — keep it.
- **Result pop:** on commit/revert, give the pill a subtle settle — a `pill-pop` keyframe
  (scale `0.96 → 1` + opacity `0.6 → 1`, ~180 ms ease-out) applied once when the displayed status
  resolves. Define `@keyframes pill-pop` in `src/app/globals.css` (Tailwind v4 — raw `@keyframes`,
  no config file) and apply via an inline arbitrary utility, e.g.
  `animate-[pill-pop_180ms_ease-out]`, keyed so it re-fires on each resolution.
- **Reduced motion:** add a `@media (prefers-reduced-motion: reduce)` block in `globals.css` that
  disables the `pill-pop` animation and collapses the transition durations to `0ms`, so
  reduced-motion users get an instant, non-animated change.

*Reuse.* `InlineConfirm` is the single confirm primitive for the whole inline-edit surface — R7.4
consumes the identical component for deliverable title/date edits, so the microinteraction is
consistent everywhere. Keep it exported from `sortable-deliverables.tsx` (promote to its own
`src/components/inline-confirm.tsx` only if a third consumer outside this file appears).

No DB changes; no new server actions. Commit/revert still go through the existing
`confirmStatusEdit` / `cancelStatusEdit` + `updateSubtaskStatus` transition.

## Tests

- [x] `pnpm build` / typecheck passes
- [x] Playwright `r7-confirm-in`: after picking a new status, the `InlineConfirm` controls are
      present and reach `opacity-100` / non-zero width (assert the expanded classes / computed
      opacity); screenshot the revealed `✓ | ✗`
- [x] Playwright `r7-confirm-commit`: clicking `✓` settles the pill to the new status (correct
      label + `STATUS_DOT_COLOR` bg); clicking `✗` on another reverts to the original status
- [ ] App (manual — headless can't assert "smoothness"): select→confirm and confirm→result
      transitions are visibly smooth (~150–200 ms), not instant snaps
- [ ] App: with OS "reduce motion" enabled, the change is instant (no pop, no slide)

## Notes / log
- 2026-06-27 — Specced. No code written. Establishes the `InlineConfirm` primitive reused by R7.4.
