# R7.2 — Confirm microinteractions

**Status:** in progress (round 2 — review feedback)
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

## Review feedback — round 2 (2026-06-27)

**Problem:** `InlineConfirm` renders the confirm/cancel affordances as the **text glyphs** `✓` and
`✗` (with a `|` divider), but the rest of the app's confirm controls — notably the subtask edit
Panel B (`sortable-deliverables.tsx` ~lines 1060–1077) — use Phosphor icons: `CheckFat`
(`weight="fill"`, green `#588157`) for confirm and `XCircle` (`weight="bold"`) for cancel. The pill's
text glyphs look inconsistent next to them.

**Approach:** Replace the `✓` / `✗` text in `InlineConfirm` with the **same icons** used everywhere
else — `<CheckFat size={13} weight="fill" />` in `#588157` for confirm, `<XCircle size={13}
weight="bold" />` for cancel — and drop the `|` divider (keep a small `gap`). Keep them **inline in
the pill** with the existing slide-in (`max-w` + `opacity` transition); widen the expanded `max-w` a
touch if the icons need more room than the glyphs. Because `InlineConfirm` is the shared primitive,
this also updates R7.4's deliverable title/date confirms — consistent across the whole inline-edit
surface.

**Round-2 tests:**
- [x] `pnpm build` / typecheck passes
- [x] Playwright: after picking a status, the pill's confirm/cancel buttons render `svg` icons (not
      a `✓`/`✗` text node); confirm icon color is `rgb(88,129,87)` (`#588157`, matching `CheckFat` panel)
- [x] Playwright: clicking the icon-confirm still commits the status (label + bg update); cancel reverts
- [x] App: the pill confirm icons (CheckFat fill green + XCircle bold) match the row's edit-panel icons

## Notes / log
- 2026-06-27 — Specced. No code written. Establishes the `InlineConfirm` primitive reused by R7.4.
