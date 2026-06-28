-- APPLIED 2026-06-28 (run statement-by-statement)
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'MANAGE_STATUS_UPDATES';
ALTER TABLE "StatusUpdate" ADD COLUMN IF NOT EXISTS "calendarEventId" TEXT;
ALTER TABLE "StatusUpdate"
  ADD CONSTRAINT "StatusUpdate_calendarEventId_fkey"
  FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"(id) ON DELETE SET NULL;
-- + pnpm db:seed grants MANAGE_STATUS_UPDATES to PM + Eboard.
