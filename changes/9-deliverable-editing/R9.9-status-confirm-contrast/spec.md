# R9.9 — Status-confirm ✓ contrast on the COMPLETE (green) pill

**Status:** tests passing
**Files:**
- `src/components/sortable-deliverables.tsx` (`InlineConfirm` + `StatusPill`)

## Spec

**Problem (bug):** When changing a **subtask** status to **COMPLETE**, the confirm checkmark is
invisible — the `InlineConfirm` ✓ uses green `CheckFat` (`#588157`) and the COMPLETE status pill has a
**green** background, so they blend. (The pill shows the *pending* status's color while confirming, so
picking COMPLETE turns the pill green under the green ✓.)

**Approach:** Make the confirm controls legible on a solid-colored pill. The subtask `StatusPill`
always renders **white text on a solid status color**, so the cleanest fix is to render the
`InlineConfirm` icons in that same white when they sit **inside the colored pill**:
- Add an optional `tone?: "default" | "onColor"` prop to `InlineConfirm`. `default` keeps today's
  green ✓ / muted ✗ (used on light backgrounds — deliverable title/dates/description/delete). `onColor`
  renders both icons in **white** (`text-white`, with the ✗ slightly translucent), for the subtask
  `StatusPill` which sits on a solid status color.
- `StatusPill` passes `tone="onColor"`. Other `InlineConfirm` usages are unchanged.
- Check the **deliverable status badge** (R9.2): its COMPLETE badge is a *light* green (`bg-[#EDF3EC]
  text-[#588157]`), where the green ✓ is low-contrast too. If it reads poorly, give that confirm a
  subtle contrasting treatment as well (e.g., `default` is fine on light, but verify COMPLETE). Decide
  during implementation from the rendered result.

No DB changes; no new server actions — purely a styling/prop change to the shared `InlineConfirm`.

## Tests
- [x] `pnpm build` / typecheck passes
- [x] Playwright: pick COMPLETE on a subtask → the pill confirm ✓ color is **white**
      (`rgb(255,255,255)`) on the green (`rgb(88,129,87)`) pill; visible
- [x] Playwright: a light-background confirm (subtask title edit) keeps the green ✓ (`rgb(88,129,87)`)
- [x] App (visual, screenshot): the ✓/✗ are clearly visible on the COMPLETE pill

Implemented an `InlineConfirm` `tone?: "default" | "onColor"` prop; the subtask `StatusPill` passes
`tone="onColor"` (white icons on the solid pill). The deliverable status confirm (R9.2) sits on the
white card, so it keeps the default green — no change needed there.

## Notes / log
- 2026-06-28 — Specced. No code written.

- 2026-06-28 — Implemented & Playwright-verified. Branch: `feat/set9/R9.9-confirm-contrast`.
