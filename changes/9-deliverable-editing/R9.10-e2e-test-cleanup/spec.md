# R9.10 — Clean up e2e test projects automatically

**Status:** planned
**Files:**
- `e2e/helpers.ts` (mark test projects)
- `e2e/global-teardown.ts` (new)
- `playwright.config.ts` (register `globalTeardown`)
- one-time: delete the existing leftover test projects

## Spec

**Problem:** The e2e suite creates **many** projects (every spec calls `createProject`), and they pile
up in the database — the user has to delete them manually. Tests should clean up after themselves.

**Approach (safe by marker, complete by teardown):**
- **Tag** every test project with a stable, recognizable marker in its **name**. Update `createProject`
  in `e2e/helpers.ts` to prefix a marker, e.g. `"⟦e2e⟧ "` (or `E2E_…`). All specs already go through
  this helper (and a couple inline creators — update those to use the helper or add the marker), so
  every test project is tagged.
- **`globalTeardown`** (`e2e/global-teardown.ts`): after the run, connect with the pg/Prisma client
  (same pattern as `scripts/apply-schema.ts`, `import "dotenv/config"`) and
  `prisma.project.deleteMany({ where: { name: { startsWith: MARKER } } })`. Marker-scoped, so it can
  **never** touch the user's real projects. Register it via `globalTeardown: "./e2e/global-teardown.ts"`
  in `playwright.config.ts`.
- **One-time cleanup** of the projects already created during this session's development: the same
  `deleteMany` by marker won't catch the *old* untagged ones, so run a one-off deletion of the existing
  test projects (by their known name prefixes, e.g. `R9.*`, `BulkDel *`, `R8.*`, `MD *`, `Plain *`,
  etc.) via a throwaway `tsx` script — being careful to match only test names.

**Constraint:** teardown runs in a separate Node process (no browser), so it must clean via the DB
(Prisma), not the UI. Per `CONTEXT.md`, DB access uses the pooler connection string already in `.env`.

## Tests
- [ ] `pnpm build` / typecheck passes (teardown is TS, compiled by Playwright)
- [ ] Manual: run the full e2e suite, then query `Project` — **no** projects whose name starts with the
      marker remain; the user's real (unmarked) projects are untouched
- [ ] Manual: the one-time cleanup removed the pre-existing leftover test projects

## Notes / log
- 2026-06-28 — Specced. No code written.
