-- APPLIED 2026-06-28 (run statement-by-statement; ALTER TYPE ADD VALUE can't share a txn)
ALTER TYPE "CalendarEventType" ADD VALUE IF NOT EXISTS 'LEAD_MEETING';
ALTER TYPE "CalendarEventType" ADD VALUE IF NOT EXISTS 'EBOARD_MEETING';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'VIEW_LEAD_MEETINGS';
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "statusSubmitWindowDays" INTEGER NOT NULL DEFAULT 3;
-- + pnpm db:seed grants VIEW_LEAD_MEETINGS to PM/Lead and adds a built-in "Eboard" role.
