/**
 * CLI entry point for the notification engine. Run with `pnpm notifications:run`.
 * Useful for local testing or running from an external scheduler (cron, GitHub
 * Actions) instead of Vercel Cron.
 */
import { runNotificationTriggers } from "../src/lib/notify-engine";
import { prisma } from "../src/lib/prisma";

runNotificationTriggers()
  .then((res) => {
    console.log(`Notification run complete: ${res.sent} sent`);
    res.details.forEach((d) => console.log(" •", d));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
