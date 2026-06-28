# R8.6 — Status-update Prisma null constraint (bug)

**Status:** planned
**Files:**
- `src/lib/actions/status-updates.ts`
- possibly `prisma/schema.prisma` + a DDL patch applied via `scripts/apply-schema.ts` (TBD after step 1)

## Spec

**Problem (observed):** Submitting a project status update crashes:

```
PrismaClientKnownRequestError
Invalid `prisma.statusUpdate.create()` invocation:
Null constraint violation on the (not available)
    at submitStatusUpdate (src/lib/actions/status-updates.ts:30)
```

**Diagnosis so far:** The action (`status-updates.ts:30`) supplies every field the Prisma
`StatusUpdate` model marks required — `projectId`, `submittedById`, `meetingDate`, `plannedWork`,
`actualProgress`, `blockers`, `nextWeekGoals` — and the model's optional/defaulted fields
(`needsHelp`, `helpNeeded?`, `submittedAt @default(now())`, `isLate`, `id @default(cuid())`) are
handled. So the Prisma model itself doesn't explain a NULL violation. The most likely cause is
**live-table drift**: this project applies raw DDL via `scripts/apply-schema.ts` (never `prisma db
push` — see `CONTEXT.md`), and the live `StatusUpdate` table likely has a **NOT NULL column without a
default** that the model doesn't declare (so Prisma never sends it). The "(not available)" column name
is Prisma/pg-adapter failing to map the violated constraint.

**Approach — diagnose, then fix at the right layer:**

1. **Introspect the live table.** Write a short `tsx` script (pg `Client`, same pattern as
   `scripts/apply-schema.ts`) that queries `information_schema.columns` for `StatusUpdate` and prints
   each column's `is_nullable` + `column_default`. Identify the NOT-NULL column with no default that
   the `create()` doesn't populate. (Candidates to look for: a legacy `weekOf`, a `status`/enum
   column, a non-defaulted `createdAt`/`updatedAt`, etc.)
2. **Fix at the correct layer:**
   - If the column is **legitimately needed** → supply it in `submitStatusUpdate`'s `create({ data })`.
   - If it's **vestigial / should match the Prisma model** → patch the DDL to add a sensible
     `DEFAULT` or drop/relax the column, applied via `scripts/apply-schema.ts`, and reconcile
     `schema.prisma`. Roll the exact SQL into `_set.md` → "DB changes in this set".
3. **Re-test end-to-end:** submit a status update from `/projects/[id]/status/new` and confirm a row
   is created and the redirect back to the project succeeds.

**Constraint:** per `CONTEXT.md`, apply any DDL with `tsx scripts/apply-schema.ts` — **never**
`prisma db push` or a direct 5432 connection.

## Tests

- [ ] Diagnosis script output recorded in this feature's log (the offending column + its constraint)
- [ ] `pnpm build` / typecheck passes
- [ ] App: submitting a complete status update creates a `StatusUpdate` row and redirects to the
      project (no `PrismaClientKnownRequestError`)
- [ ] App: the late-marking path still works (`isLate` set correctly relative to `meetingDate` −
      `submissionDeadlineHours`)
- [ ] If a DDL patch was applied: the exact SQL is captured in `_set.md` "DB changes in this set"

## Notes / log
- 2026-06-27 — Specced. No code written. Root cause to be confirmed by the step-1 introspection script.
