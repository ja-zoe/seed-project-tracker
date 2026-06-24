import { ProjectStatus, type Milestone, type MeetingRecord, type Settings } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type HealthResult = {
  status: ProjectStatus;
  reasons: string[];
};

/**
 * Pure red-flag auto-detection (§5.3).
 *
 * A project is flagged BEHIND when, depending on `requireBoth`, EITHER or BOTH:
 *   (A) it is more than `weeksBehindMilestone` weeks past an incomplete milestone, or
 *   (B) it has missed its weekly goal `missedGoalsInARow` times in a row.
 *
 * AT_RISK is a softer warning: a single overdue milestone or one missed goal.
 * Otherwise ON_TRACK. Pure function so it's easy to reason about and test.
 */
export function computeHealth(
  milestones: Pick<Milestone, "completed" | "targetDate">[],
  // Meeting records ordered NEWEST first.
  recentMeetings: Pick<MeetingRecord, "goalMet" | "meetingDate">[],
  settings: Pick<Settings, "weeksBehindMilestone" | "missedGoalsInARow" | "requireBoth">,
  now: Date = new Date(),
): HealthResult {
  const reasons: string[] = [];

  // Condition A — milestone slippage.
  const overdue = milestones.filter((m) => !m.completed && m.targetDate.getTime() < now.getTime());
  const weeksLate = (m: { targetDate: Date }) => (now.getTime() - m.targetDate.getTime()) / WEEK_MS;
  const badlyLate = overdue.filter((m) => weeksLate(m) >= settings.weeksBehindMilestone);
  const conditionA = badlyLate.length > 0;
  if (conditionA) {
    reasons.push(
      `${badlyLate.length} milestone${badlyLate.length === 1 ? "" : "s"} more than ${settings.weeksBehindMilestone} week(s) overdue`,
    );
  }

  // Condition B — consecutive missed weekly goals (only counts records where a
  // goal was actually recorded; null = "not recorded" breaks the streak count).
  let streak = 0;
  for (const m of recentMeetings) {
    if (m.goalMet === false) streak++;
    else break; // a met goal (or unrecorded) ends the streak
  }
  const conditionB = streak >= settings.missedGoalsInARow;
  if (conditionB) reasons.push(`Missed weekly goal ${streak} weeks in a row`);

  const isBehind = settings.requireBoth ? conditionA && conditionB : conditionA || conditionB;
  if (isBehind) return { status: ProjectStatus.BEHIND, reasons };

  // Softer "at risk" signals.
  if (overdue.length > 0) {
    return {
      status: ProjectStatus.AT_RISK,
      reasons: [`${overdue.length} milestone(s) overdue`],
    };
  }
  if (streak === 1) {
    return { status: ProjectStatus.AT_RISK, reasons: ["Missed last weekly goal"] };
  }

  return { status: ProjectStatus.ON_TRACK, reasons: [] };
}

/**
 * Recompute a project's status from its data and persist it — UNLESS the PM has
 * manually overridden the status (`statusOverride`), in which case the manual
 * value is left untouched. Returns the resulting status + reasons.
 *
 * Whether this transition should fire a notification is decided by the caller.
 */
export async function recomputeProjectStatus(projectId: string): Promise<HealthResult & { changed: boolean }> {
  const [project, settings, milestones, recentMeetings] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    getSettings(),
    prisma.milestone.findMany({ where: { projectId } }),
    prisma.meetingRecord.findMany({
      where: { projectId },
      orderBy: { meetingDate: "desc" },
      take: 12,
    }),
  ]);
  if (!project) throw new Error("Project not found");

  const result = computeHealth(milestones, recentMeetings, settings);

  // Respect a manual override — don't clobber the PM's chosen status.
  if (project.statusOverride) {
    return { ...result, status: project.status, changed: false };
  }

  const changed = project.status !== result.status;
  if (changed) {
    await prisma.project.update({ where: { id: projectId }, data: { status: result.status } });
  }
  return { ...result, changed };
}

/** Read (or lazily create) the Settings singleton. */
export async function getSettings(): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.settings.create({ data: { id: "singleton" } });
}

/**
 * Determine whether a status update is "late": submitted fewer than
 * `submissionDeadlineHours` before the meeting (§5.1). Submissions are always
 * allowed — this only sets the visible "late" flag.
 */
export function isSubmissionLate(meetingDate: Date, submittedAt: Date, deadlineHours: number): boolean {
  const deadline = meetingDate.getTime() - deadlineHours * 60 * 60 * 1000;
  return submittedAt.getTime() > deadline;
}
