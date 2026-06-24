import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser, resolveRecipients } from "@/lib/notify";

/**
 * Time-based notification engine (§5.5). Evaluates the enabled, time-sensitive
 * notification rules and sends reminders. Meant to run on a schedule (Vercel
 * Cron hits /api/cron/notifications; or `pnpm notifications:run` locally).
 *
 * Event-driven triggers (PROJECT_BEHIND, action-item assignment) fire inline
 * from the relevant server actions; this engine handles the "X hours before"
 * style reminders that need a clock.
 *
 * Best-effort & idempotent-ish: it dedupes against recent in-app notifications
 * so re-running within the day won't spam.
 */
export async function runNotificationTriggers(now: Date = new Date()): Promise<{ sent: number; details: string[] }> {
  const rules = await prisma.notificationRule.findMany({ where: { enabled: true } });
  const details: string[] = [];
  let sent = 0;

  for (const rule of rules) {
    if (rule.triggerType === "ACTION_ITEM_DUE") {
      sent += await runActionItemDue(rule.thresholdHours ?? 48, now, details);
    } else if (rule.triggerType === "MISSING_SUBMISSION") {
      sent += await runMissingSubmission(rule, now, details);
    }
    // PROJECT_BEHIND / GOAL_MISSED are event-driven (fired from server actions).
  }

  return { sent, details };
}

/** Has an equivalent notification gone out to this user recently? (dedupe) */
async function recentlyNotified(userId: string, title: string, sinceHours: number, now: Date): Promise<boolean> {
  const since = new Date(now.getTime() - sinceHours * 3600_000);
  const existing = await prisma.notification.findFirst({
    where: { userId, title, createdAt: { gte: since } },
    select: { id: true },
  });
  return !!existing;
}

/** Notify action-item owners whose deadline is within the window (and not done). */
async function runActionItemDue(hoursBefore: number, now: Date, details: string[]): Promise<number> {
  const windowEnd = new Date(now.getTime() + hoursBefore * 3600_000);
  const items = await prisma.actionItem.findMany({
    where: { status: "OPEN", ownerId: { not: null }, deadline: { not: null, lte: windowEnd } },
    include: { owner: { select: { id: true, email: true } }, project: { select: { name: true } } },
  });

  let sent = 0;
  for (const item of items) {
    if (!item.owner) continue;
    const overdue = item.deadline! < now;
    const title = `${overdue ? "Overdue" : "Due soon"}: action item`;
    if (await recentlyNotified(item.owner.id, title, 20, now)) continue;
    await notifyUser(item.owner, "BOTH", {
      type: NotificationType.ACTION_ITEM,
      title,
      body: `"${item.description}" on ${item.project.name} is ${overdue ? "overdue" : "due soon"}.`,
      link: `/projects/${item.projectId}`,
    });
    sent++;
  }
  if (sent) details.push(`ACTION_ITEM_DUE: ${sent} reminder(s)`);
  return sent;
}

/**
 * Remind assigned leads who haven't submitted a status update for an upcoming
 * meeting within the threshold window. "Upcoming meetings" are inferred from
 * future-dated status updates that already exist for a project (the week is
 * active), so co-leads who haven't filed yet get nudged.
 */
async function runMissingSubmission(
  rule: { recipients: import("@prisma/client").RecipientGroup; channel: import("@prisma/client").Channel; thresholdHours: number | null },
  now: Date,
  details: string[],
): Promise<number> {
  const hoursBefore = rule.thresholdHours ?? 24;
  const windowEnd = new Date(now.getTime() + hoursBefore * 3600_000);

  // Distinct (project, meetingDate) pairs coming up within the window.
  const upcoming = await prisma.statusUpdate.findMany({
    where: { meetingDate: { gte: now, lte: windowEnd } },
    select: { projectId: true, meetingDate: true },
    distinct: ["projectId", "meetingDate"],
  });

  let sent = 0;
  for (const { projectId, meetingDate } of upcoming) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    if (!project) continue;

    // Who already submitted for this meeting?
    const submitted = await prisma.statusUpdate.findMany({
      where: { projectId, meetingDate },
      select: { submittedById: true },
    });
    const submittedIds = new Set(submitted.map((s) => s.submittedById));

    const recipients = await resolveRecipients(rule.recipients, { projectId });
    const title = "Status update reminder";
    for (const r of recipients) {
      if (submittedIds.has(r.id)) continue;
      if (await recentlyNotified(r.id, title, 20, now)) continue;
      await notifyUser(r, rule.channel, {
        type: NotificationType.REMINDER,
        title,
        body: `You haven't submitted your status update for ${project.name}'s upcoming meeting.`,
        link: "/status/new",
      });
      sent++;
    }
  }
  if (sent) details.push(`MISSING_SUBMISSION: ${sent} reminder(s)`);
  return sent;
}
