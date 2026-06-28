# R8.6 — Status-update Prisma null constraint (bug)

**Status:** tests passing
**Files:**
- DDL patch `fix.sql` (applied via `scripts/apply-schema.ts`) — no app-code change needed

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

- [x] Diagnosis recorded (below): `updatedAt` column was NOT NULL with no default
- [x] Playwright `r8-status-update`: assign a LEAD, submit a complete status update → redirects to the
      project with **no** `PrismaClientKnownRequestError`, and the update appears in `/history`
- [x] DDL patch SQL captured in this feature's `fix.sql` and in `_set.md` "DB changes in this set"

## Diagnosis (step 1)

Introspected `information_schema.columns` for `StatusUpdate`. The live table has two columns the
Prisma model doesn't declare:
- `createdAt` — NOT NULL, **default `CURRENT_TIMESTAMP`** → fine (insert omits it, DB fills it).
- `updatedAt` — NOT NULL, **default `null`** → **the bug.** Prisma never sends it (not in the model)
  and there's no default, so every `INSERT` violates the NOT NULL constraint. Prisma's pg adapter
  couldn't map the constraint name, hence "(not available)".

`id` is also NOT NULL with no DB default, but Prisma supplies it client-side via `@default(cuid())`,
so it's never the offender.

## Fix

Surgical DDL patch (lowest risk; no Prisma client regen): give `updatedAt` a default so inserts that
omit it succeed.

```sql
ALTER TABLE "StatusUpdate" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
```

Applied with `tsx scripts/apply-schema.ts` (per `CONTEXT.md` — never `prisma db push`). Verified the
column default flipped from `null` → `CURRENT_TIMESTAMP`. `submittedAt` (already in the model) and
`createdAt` remain; the model intentionally stays unaware of the DB-managed `createdAt`/`updatedAt`
(both now have defaults, so inserts succeed). No app-code change.

## Notes / log
- 2026-06-27 — Diagnosed via introspection script; root cause = `updatedAt` NOT NULL no-default.
  Applied `fix.sql` DDL patch via `scripts/apply-schema.ts`. Playwright end-to-end submit passes
  (row created, appears in history). Branch: `feat/set8/R8.6-status-null`.
