# R22.4 — Loading & confirmation feedback on every CRUD mutation

**Status:** planned
**Files:** `src/components/submit-button.tsx` (upgrade), `src/components/action-feedback.tsx` (new) — then
rollout across every component with a mutation trigger (inventory below).

## Spec

**Problem:** Mutation feedback is inconsistent app-wide. `SubmitButton` exists but only swaps its label to
"Saving…" (no spinner, no success signal) and is used in just 4 files; most modals/inline controls hand-roll
`useTransition`/`disabled` with no visible pending state, and **nothing anywhere confirms success** — the UI
just re-renders, leaving the user unsure a save/delete actually happened. The user wants a deeply satisfying
loading state and confirmation on every CRUD interaction.

**Approach — two shared primitives, then a mechanical rollout:**

1. **`SubmitButton` upgrade** (form-action surfaces, `useFormStatus`): pending renders a Phosphor
   `CircleNotch` (Bold) spinning beside the pending label; the button keeps its width (`min-w` from the idle
   label) so nothing layout-shifts. On completion-while-mounted, morph to a `Check` (Bold) + success label
   for ~900 ms, then reset. Completion detection via `useActionState`-style wrapping or an `onSettled`
   callback from the parent — forms that close their modal on success instead trigger the *row* confirmation
   (below) so the confirmation lands where the user's eyes go.
2. **`useActionFeedback` hook + `FeedbackIconButton`** (new `action-feedback.tsx`) for `useTransition`-based
   inline controls (status pills, quick-complete, dismiss ×, reorder saves, token generation): returns
   `{ run, state: "idle" | "pending" | "success" }`; consumers render spinner/check off `state`. Destructive
   triggers keep the set-7 slide-in confirm pattern (see CONTEXT.md clickability decisions) and gain the
   spinner *inside* the confirm affordance while deleting.
3. **Success micro-animation** (the "deeply satisfying" part): GSAP via the existing `GsapProvider` —
   check icon pops in with a small overshoot scale (`back.out`), and mutated/created rows get a one-time
   background tint settle (moss `#588157` at low alpha → transparent, ~1.2 s). Wrap all of it in
   `gsap.matchMedia` honoring `prefers-reduced-motion` (fall back to instant state swap, no motion).
   Constraints: Forest Floor tokens only, no gradients/shadows; Phosphor icons only.

**State/data-flow:** all feedback state is client-local (`useFormStatus` / the hook's internal state);
nothing touches the DB or server actions except optional `onSettled` plumb-throughs. No permission changes —
feedback renders only on controls the user can already see.

**Rollout inventory** (every mutation trigger; grouped by surface):
- **Modals:** `project-modal`, `deliverable-modal`, `subtask-modal`, `action-item-modal`,
  `status-update-controls` (edit modal), `meeting-record-controls`, `semester-calendar` (event form)
- **Inline controls:** `sortable-deliverables` (status pills, priority/group/date chips, reorder, delete,
  backlog control from R22.1), `action-items-section` (close/reopen/delete), `member-role-control`,
  `user-row-controls`, `projects-list`, notification bell (clear all / per-item dismiss),
  my-tasks quick-complete buttons
- **Full-page forms:** `/deliverables/new`, subtask edit page, `/status/new` (`status-submit-switcher`),
  `profile-settings-form`, `/account` token generation, PM pages (`pm/users`, `pm/review`, `pm/settings`,
  role builder)

**Non-obvious constraints:** `useFormStatus` only reads a parent `<form>` — inline `onClick` controls must
use the hook, not `SubmitButton`; don't nest interactive elements (the R21.8 lesson); keep per-surface diffs
mechanical (swap the trigger, no logic changes) so the rollout is reviewable.

## Tests

See `tests.md`.

## Notes / log
- (empty — planned 2026-07-02)
