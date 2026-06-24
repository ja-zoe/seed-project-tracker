import { NextResponse } from "next/server";
import { runNotificationTriggers } from "@/lib/notify-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled notification runner (§5.5). Protected by CRON_SECRET.
 *
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` (see vercel.json).
 * Locally you can hit it with:
 *   curl -X POST localhost:3000/api/cron/notifications -H "Authorization: Bearer $CRON_SECRET"
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runNotificationTriggers();
  return NextResponse.json({ ok: true, ...result });
}

export const POST = handle;
// Vercel Cron issues GET requests, so support both verbs.
export const GET = handle;
