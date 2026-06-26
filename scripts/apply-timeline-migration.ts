/**
 * One-off, idempotent migration for the semester-timeline feature.
 *
 * Normally the schema is applied with `prisma db push`. That command uses the
 * DIRECT_URL (Supabase direct, port 5432), which is IPv6-only and unreachable
 * from some environments, and it can't run its advisory-lock DDL path over the
 * PgBouncer pooler. This script applies the same changes as plain, idempotent
 * SQL over whichever connection Prisma already uses (the pooler works fine for
 * single-statement DDL), so it's safe to run anywhere and re-run.
 *
 * It is equivalent to the `Milestone → Deliverable` rename + `Subtask` table +
 * `ProjectAssignment.role` column. Prefer `pnpm db:push` when you have direct
 * (5432) connectivity; reach for this only when you don't.
 *
 * Run with: `pnpm tsx scripts/apply-timeline-migration.ts`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements: string[] = [
  // Enums
  `DO $$ BEGIN CREATE TYPE "TimelineStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','BLOCKED','COMPLETE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "ProjectMemberRole" AS ENUM ('LEAD','MEMBER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  // Rename Milestone -> Deliverable (only if not already done)
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Milestone')
        AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Deliverable') THEN
       ALTER TABLE "Milestone" RENAME TO "Deliverable";
     END IF;
   END $$;`,
  `ALTER INDEX IF EXISTS "Milestone_projectId_idx" RENAME TO "Deliverable_projectId_idx";`,

  // New Deliverable columns
  `ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "description" TEXT;`,
  `ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "status" "TimelineStatus" NOT NULL DEFAULT 'NOT_STARTED';`,
  `ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);`,
  `ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER NOT NULL DEFAULT 0;`,

  // ProjectAssignment.role
  `ALTER TABLE "ProjectAssignment" ADD COLUMN IF NOT EXISTS "role" "ProjectMemberRole" NOT NULL DEFAULT 'LEAD';`,

  // Subtask table
  `CREATE TABLE IF NOT EXISTS "Subtask" (
     "id" TEXT NOT NULL,
     "deliverableId" TEXT NOT NULL,
     "title" TEXT NOT NULL,
     "description" TEXT,
     "status" "TimelineStatus" NOT NULL DEFAULT 'NOT_STARTED',
     "startDate" TIMESTAMP(3),
     "dueDate" TIMESTAMP(3),
     "orderIndex" INTEGER NOT NULL DEFAULT 0,
     "assigneeId" TEXT,
     "completedAt" TIMESTAMP(3),
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "Subtask_pkey" PRIMARY KEY ("id")
   );`,
  `CREATE INDEX IF NOT EXISTS "Subtask_deliverableId_idx" ON "Subtask"("deliverableId");`,
  `CREATE INDEX IF NOT EXISTS "Subtask_assigneeId_status_idx" ON "Subtask"("assigneeId","status");`,
  `DO $$ BEGIN
     ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_deliverableId_fkey"
       FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN
     ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_assigneeId_fkey"
       FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,
];

async function main() {
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
    console.log("✓", sql.split("\n")[0].slice(0, 70));
  }
  console.log("Timeline migration applied.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
