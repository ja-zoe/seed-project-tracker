# R8.5 — Bulk project select & delete (MANAGE_PROJECTS)

**Status:** planned
**Files:**
- `src/lib/actions/projects.ts` (new `deleteProjects` action)
- `src/app/(app)/projects/page.tsx` (server component — fetch + pass to client list)
- `src/components/projects-list.tsx` (new client component holding selection state)

## Spec

**Problem:** A PM (`MANAGE_PROJECTS`) can only delete projects **one at a time** (via the single
`deleteProject` action from a project's own page). The Projects list view (`/projects`) offers no way
to remove several at once.

**Approach:**

*Server action* — add `deleteProjects(ids: string[])` to `projects.ts`, mirroring the existing
`deleteProject` (~line 62) gate: `await requirePermission(Permission.MANAGE_PROJECTS)`, then
`await prisma.project.deleteMany({ where: { id: { in: ids } } })`, then
`revalidatePath("/projects")`. Ignore an empty `ids` array (no-op).

*Client list component* — `/projects/page.tsx` is a server component that fetches `projects` and
computes `canManage`. Extract the projects **grid** into a new client component `ProjectsList`
(`"use client"`) that receives `projects` + `canManage` as props and owns the selection state. The
page passes the already-fetched data down (no change to the query).

*Selection UX (open Q6)* — a PM-only "**Select**" toggle button enters selection mode:
- Each project card shows a checkbox; clicking a card toggles its checkbox instead of navigating while
  in selection mode (cards stay normal links otherwise).
- A sticky action bar shows "**N selected**" with **Delete** and **Cancel** buttons. **Delete** asks
  for a confirm (inline second-press or a small confirm dialog), then calls `deleteProjects(selected)`
  in a `useTransition`; on success it clears selection and exits selection mode (the list revalidates).
- Non-PM users (`!canManage`) never see the Select toggle or checkboxes — the list is unchanged for them.

No DB changes.

## Tests

- [ ] `pnpm build` / typecheck passes
- [ ] Playwright (PM): the "Select" toggle reveals checkboxes; selecting 2 projects shows "2 selected";
      Delete (after confirm) removes both — they're gone from the list after revalidation
- [ ] Playwright: Cancel exits selection mode and restores normal (navigable) cards
- [ ] Playwright (non-PM / VIEW_ALL only): no Select toggle, no checkboxes
- [ ] App: `deleteProjects` is permission-gated — a non-PM calling it is rejected (MANAGE_PROJECTS)

## Notes / log
- 2026-06-27 — Specced. No code written.
