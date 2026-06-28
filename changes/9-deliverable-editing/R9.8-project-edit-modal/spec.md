# R9.8 — Edit project → modal

**Status:** tests passing
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
- [x] `pnpm build` / typecheck passes
- [x] Playwright: "Edit project" opens a modal (URL stays on the project page); changing name +
      semester + description and saving persists them without a navigation
- [x] App: empty name rejected ("Name is required"); `endDate < startDate` guarded (client + server)
- [x] Playwright: project delete (modal armed ✓/✗ confirm) removes the project and redirects to
      /projects; `/projects/[id]/edit` is 404
- [x] App: the Edit trigger only renders for `MANAGE_PROJECTS` (canManage) — unchanged gating

Decision: delete is included in the modal as an armed `InlineConfirm` (consistent with R9.2).

## Notes / log
- 2026-06-28 — Specced. No code written.

- 2026-06-28 — Implemented & Playwright-verified. `ProjectModal` (Dialog) replaces the edit page; `updateProject` was already redirect-free. Deleted `/projects/[id]/edit` (incl. its delete-project-button). Branch: `feat/set9/R9.8-project-modal`.
