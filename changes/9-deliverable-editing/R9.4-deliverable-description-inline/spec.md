# R9.4 — Deliverable description: expand + inline edit (Markdown/plain)

**Status:** planned
**Files:**
- `src/components/sortable-deliverables.tsx`
- `src/lib/actions/deliverables.ts` (`updateDeliverableDescription`)

**Mirrors:** R8.2 (subtask expand) + R8.1/R8.2 round-2 (Markdown). Reuses `react-markdown` + the
`InlineConfirm` primitive.

## Spec

**Problem:** A deliverable's **description** (already a `String?` column) isn't visible in the list and
can only be edited on the edit page. The user wants: clicking the deliverable body (anywhere not taken
by a control) **shows its description**; and you can enter **inline edit mode** for it — **Markdown or
plain** — **while it's open, without a modal**.

**Approach:**
- **Expand on body click (like R8.2 for subtasks):** add `expandedDeliverableId: string | null`.
  Clicking the deliverable header area toggles it, with the same interactive-element guard as R8.2
  round-2 (`closest('button, a, input, select, textarea, [role="button"], [data-no-expand]')`) so the
  status badge, group combobox, priority control, Edit/Delete, and the title/date inline pencils don't
  toggle it. The header gets `role="button"` + `aria-expanded`.
- **Render (read mode):** below the header (pushing later deliverables down), render the description via
  `ReactMarkdown` + `remark-gfm`; muted italic "No description" when empty.
- **Inline edit (no modal):** when `canEdit`, the expanded region has an "Edit" affordance that swaps
  the rendered description for an inline editor — a textarea with an **MD/Plain toggle** and a live
  `ReactMarkdown` preview (reuse the same small markdown field built for the R8.1 modal), plus the
  shared **`InlineConfirm`** ✓/✗. ✓ → `updateDeliverableDescription(id, value)` in a `useTransition`;
  ✗ → revert. `Esc` cancels.
- **Server action** `updateDeliverableDescription(deliverableId, description: string | null)` —
  membership/`MANAGE_MILESTONES`-gated; empty → `null`; `revalidatePath`.

No DB changes (`description` already exists; Markdown vs plain is a render/edit concern — plain text
renders fine through the Markdown renderer, so no format flag).

## Tests
- [ ] `pnpm build` / typecheck passes
- [ ] Playwright: clicking the deliverable body (not a control) expands the description; clicking the
      status badge / group / priority / Edit / Delete does **not** toggle it
- [ ] Playwright: a Markdown description renders as HTML (`**bold**` → `<strong>`)
- [ ] Playwright: inline-edit the description (MD/Plain toggle), ✓ persists the new text, ✗ reverts
- [ ] App: empty description shows "No description"; `aria-expanded` reflects state

## Notes / log
- 2026-06-28 — Specced. No code written.
