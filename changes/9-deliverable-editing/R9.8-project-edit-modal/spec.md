# R9.8 — Edit project → modal

**Status:** planned
**Files:**
- `src/components/project-modal.tsx` (new)
- `src/app/(app)/projects/[id]/page.tsx` (the "Edit project" button → modal trigger)
- `src/lib/actions/projects.ts` (`updateProject` — confirm it's modal-friendly)
- `src/app/(app)/projects/[id]/edit/` (**deleted** — modal replaces it)

**Mirrors:** R9.1 (deliverable edit modal) and R8.1 (subtask modal).

## Spec

**Problem:** Editing a project navigates to a full page (`/projects/[id]/edit`). The user wants it to
be a **modal**, like the deliverable (R9.1) and subtask (R8.1) edit modals.

**Approach:**
- New `ProjectModal` (`"use client"`, reuses the shadcn `Dialog`), edit mode. Fields mirror
  `updateProject`: **name** (required), **semester** (required), **description** (Markdown via
  `MarkdownEditor`), **start date** + **end date** (`endDate >= startDate` guard), and
  **corrective action plan** (textarea/Markdown). Submit → `updateProject(projectId, formData)`.
- `updateProject` already ends with `revalidatePath` (no `redirect`), so it's modal-ready. If the
  current edit page's wrapper adds a redirect, that goes away with the page.
- **Trigger:** the project detail page's "Edit project" link (`page.tsx` ~line 165) becomes the modal
  trigger (`render` prop on `DialogTrigger`), gated on `MANAGE_PROJECTS` as today.
- **Delete:** the edit page also hosts `delete-project-button.tsx`. Move project deletion into the
  modal as an armed **`InlineConfirm`** delete (consistent with R9.2's deliverable delete), or rely on
  the projects-list bulk delete (R8.5). Recommendation: include a delete-with-confirm in the modal so
  single-project delete still has a home. (Open: confirm.)
- **Delete the edit page** route and repoint/remove links to it (grep `…/edit`).

No DB changes; reuses `updateProject` (+ `deleteProject` for the modal delete).

## Tests
- [ ] `pnpm build` / typecheck passes
- [ ] Playwright: "Edit project" opens a modal (URL stays on the project page); changing name +
      semester + dates + description and saving persists them without a navigation
- [ ] App: `endDate < startDate` rejected; empty name/semester rejected
- [ ] App: project delete (modal confirm) removes the project; Build: `/projects/[id]/edit` is 404
- [ ] App: non-PM users don't see the Edit trigger (MANAGE_PROJECTS-gated)

## Notes / log
- 2026-06-28 — Specced. No code written.
