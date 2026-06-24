"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Permission, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, getCurrentUser } from "@/lib/session";
import { canEditProject } from "@/lib/permissions";
import { isAssignedTo } from "@/lib/queries";
import { getSettings, isSubmissionLate, recomputeProjectStatus } from "@/lib/health";
import { notifyUser, resolveRecipients } from "@/lib/notify";
import { NotificationType } from "@prisma/client";

/** Ensure the current user may edit this project (PM, or assigned lead). */
async function assertCanEditProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") throw new Error("Not authenticated");
  const assigned = await isAssignedTo(user.id, projectId);
  if (!canEditProject(user, assigned)) throw new Error("Forbidden");
  return user;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const projectSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  description: z.string().optional(),
  semester: z.string().min(2, "Semester is required"),
  leadIds: z.array(z.string()).optional(),
});

export async function createProject(formData: FormData) {
  await assertPermission(Permission.MANAGE_PROJECTS);
  const data = projectSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    semester: formData.get("semester"),
    leadIds: formData.getAll("leadIds").map(String).filter(Boolean),
  });

  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      semester: data.semester,
      assignments: data.leadIds?.length
        ? { create: data.leadIds.map((userId) => ({ userId })) }
        : undefined,
    },
  });
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  await assertCanEditProject(projectId);
  const data = projectSchema.partial().parse({
    name: formData.get("name") || undefined,
    description: formData.get("description") ?? undefined,
    semester: formData.get("semester") || undefined,
  });
  await prisma.project.update({ where: { id: projectId }, data });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string) {
  await assertPermission(Permission.MANAGE_PROJECTS);
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
  redirect("/projects");
}

/** PM assigns / unassigns leads on a project. */
export async function setProjectLeads(projectId: string, leadIds: string[]) {
  await assertPermission(Permission.MANAGE_PROJECTS);
  await prisma.$transaction([
    prisma.projectAssignment.deleteMany({ where: { projectId } }),
    prisma.projectAssignment.createMany({
      data: leadIds.map((userId) => ({ projectId, userId })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Manual status override (§5.3). Passing a status pins it (statusOverride=true);
 * passing null re-enables auto-detection and recomputes immediately.
 */
export async function overrideProjectStatus(projectId: string, status: ProjectStatus | null) {
  await assertCanEditProject(projectId);
  if (status === null) {
    await prisma.project.update({ where: { id: projectId }, data: { statusOverride: false } });
    await recomputeProjectStatus(projectId);
  } else {
    await prisma.project.update({
      where: { id: projectId },
      data: { status, statusOverride: true },
    });
  }
  revalidatePath(`/projects/${projectId}`);
}

/** Save the corrective action plan required when a project is flagged Behind. */
export async function saveCorrectivePlan(projectId: string, plan: string) {
  await assertCanEditProject(projectId);
  await prisma.project.update({ where: { id: projectId }, data: { correctiveActionPlan: plan } });
  revalidatePath(`/projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function addMilestone(projectId: string, formData: FormData) {
  await assertCanEditProject(projectId);
  const title = z.string().min(1).parse(formData.get("title"));
  const targetDate = z.coerce.date().parse(formData.get("targetDate"));
  await prisma.milestone.create({ data: { projectId, title, targetDate } });
  await recomputeProjectStatus(projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleMilestone(milestoneId: string) {
  const m = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!m) throw new Error("Milestone not found");
  await assertCanEditProject(m.projectId);
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { completed: !m.completed, completedDate: !m.completed ? new Date() : null },
  });
  await recomputeProjectStatus(m.projectId);
  revalidatePath(`/projects/${m.projectId}`);
}

export async function deleteMilestone(milestoneId: string) {
  const m = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!m) return;
  await assertCanEditProject(m.projectId);
  await prisma.milestone.delete({ where: { id: milestoneId } });
  await recomputeProjectStatus(m.projectId);
  revalidatePath(`/projects/${m.projectId}`);
}

// ---------------------------------------------------------------------------
// Pre-meeting status updates (§5.1)
// ---------------------------------------------------------------------------

const statusSchema = z.object({
  projectId: z.string(),
  meetingDate: z.coerce.date(),
  plannedWork: z.string().min(1, "Required"),
  actualProgress: z.string().min(1, "Required"),
  blockers: z.string().min(1, "Required"),
  nextWeekGoals: z.string().min(1, "Required"),
  needsHelp: z.boolean(),
  helpNeeded: z.string().optional(),
});

export async function submitStatusUpdate(formData: FormData) {
  const user = await assertPermission(Permission.SUBMIT_STATUS_UPDATES);
  const data = statusSchema.parse({
    projectId: formData.get("projectId"),
    meetingDate: formData.get("meetingDate"),
    plannedWork: formData.get("plannedWork"),
    actualProgress: formData.get("actualProgress"),
    blockers: formData.get("blockers"),
    nextWeekGoals: formData.get("nextWeekGoals"),
    needsHelp: formData.get("needsHelp") === "on" || formData.get("needsHelp") === "true",
    helpNeeded: formData.get("helpNeeded")?.toString() || undefined,
  });

  // A lead may only submit for their own project (PMs can submit for any).
  const assigned = await isAssignedTo(user.id, data.projectId);
  const isPM = user.permissions.includes(Permission.MANAGE_PROJECTS);
  if (!assigned && !isPM) throw new Error("You can only submit for your own project");

  const settings = await getSettings();
  const now = new Date();
  // Submissions are always allowed — just visibly flagged late (§5.1).
  const isLate = isSubmissionLate(data.meetingDate, now, settings.submissionDeadlineHours);

  await prisma.statusUpdate.create({
    data: {
      projectId: data.projectId,
      submittedById: user.id,
      meetingDate: data.meetingDate,
      plannedWork: data.plannedWork,
      actualProgress: data.actualProgress,
      blockers: data.blockers,
      nextWeekGoals: data.nextWeekGoals,
      needsHelp: data.needsHelp,
      helpNeeded: data.needsHelp ? data.helpNeeded : null,
      isLate,
    },
  });

  revalidatePath(`/projects/${data.projectId}`);
  redirect(`/projects/${data.projectId}?submitted=1`);
}

// ---------------------------------------------------------------------------
// Post-meeting tracking (§5.2) + carry-over + red-flag notifications
// ---------------------------------------------------------------------------

const meetingSchema = z.object({
  projectId: z.string(),
  meetingDate: z.coerce.date(),
  status: z.nativeEnum(ProjectStatus),
  goalMet: z.enum(["yes", "no", "na"]),
  keyBlockers: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordMeeting(formData: FormData) {
  const user = await assertPermission(Permission.POST_MEETING_TRACKING);
  const data = meetingSchema.parse({
    projectId: formData.get("projectId"),
    meetingDate: formData.get("meetingDate"),
    status: formData.get("status"),
    goalMet: formData.get("goalMet"),
    keyBlockers: formData.get("keyBlockers")?.toString() || undefined,
    notes: formData.get("notes")?.toString() || undefined,
  });

  const goalMet = data.goalMet === "na" ? null : data.goalMet === "yes";

  await prisma.meetingRecord.create({
    data: {
      projectId: data.projectId,
      meetingDate: data.meetingDate,
      status: data.status,
      goalMet,
      keyBlockers: data.keyBlockers,
      notes: data.notes,
      recordedById: user.id,
    },
  });

  // Recording a meeting pins the PM-chosen status as a manual override so it
  // sticks until auto-detection is explicitly re-enabled.
  await prisma.project.update({
    where: { id: data.projectId },
    data: { status: data.status, statusOverride: true },
  });

  // Carry-over: any action item still OPEN at this meeting rolls forward, flagged.
  await prisma.actionItem.updateMany({
    where: { projectId: data.projectId, status: "OPEN", createdAt: { lt: data.meetingDate } },
    data: { carriedOver: true },
  });

  // If the project is now Behind, notify per the PROJECT_BEHIND rules.
  if (data.status === ProjectStatus.BEHIND) {
    await fireProjectBehind(data.projectId);
  }

  revalidatePath(`/projects/${data.projectId}`);
  redirect(`/projects/${data.projectId}?tracked=1`);
}

/** Notify recipients configured for the PROJECT_BEHIND trigger. */
async function fireProjectBehind(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;
  const rules = await prisma.notificationRule.findMany({
    where: { triggerType: "PROJECT_BEHIND", enabled: true },
  });
  for (const rule of rules) {
    const recipients = await resolveRecipients(rule.recipients, { projectId });
    await Promise.all(
      recipients.map((r) =>
        notifyUser(r, rule.channel, {
          type: NotificationType.PROJECT_BEHIND,
          title: `🚩 ${project.name} is Behind`,
          body: `${project.name} has been flagged Behind. A corrective action plan is required.`,
          link: `/projects/${projectId}`,
        }),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Action items (§5.6)
// ---------------------------------------------------------------------------

const actionItemSchema = z.object({
  projectId: z.string(),
  description: z.string().min(1, "Required"),
  ownerId: z.string().optional(),
  deadline: z.coerce.date().optional(),
});

export async function createActionItem(formData: FormData) {
  const user = await assertPermission(Permission.ASSIGN_ACTION_ITEMS);
  const data = actionItemSchema.parse({
    projectId: formData.get("projectId"),
    description: formData.get("description"),
    ownerId: formData.get("ownerId")?.toString() || undefined,
    deadline: formData.get("deadline") ? formData.get("deadline") : undefined,
  });

  const item = await prisma.actionItem.create({
    data: {
      projectId: data.projectId,
      description: data.description,
      ownerId: data.ownerId,
      deadline: data.deadline,
    },
    include: { project: { select: { name: true } } },
  });

  // Notify the owner that something was assigned to them (§5.5).
  if (item.ownerId && item.ownerId !== user.id) {
    const owner = await prisma.user.findUnique({ where: { id: item.ownerId }, select: { id: true, email: true } });
    if (owner) {
      await notifyUser(owner, "BOTH", {
        type: NotificationType.ACTION_ITEM,
        title: `New action item: ${item.project.name}`,
        body: item.description,
        link: `/projects/${item.projectId}`,
      });
    }
  }

  revalidatePath(`/projects/${data.projectId}`);
  revalidatePath("/action-items");
}

export async function toggleActionItem(actionItemId: string) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") throw new Error("Not authenticated");

  const item = await prisma.actionItem.findUnique({ where: { id: actionItemId } });
  if (!item) throw new Error("Not found");

  // The owner can close their own item; otherwise CLOSE_ACTION_ITEMS is required.
  const isOwner = item.ownerId === user.id;
  const canClose = user.permissions.includes(Permission.CLOSE_ACTION_ITEMS);
  if (!isOwner && !canClose) throw new Error("Forbidden");

  const nowDone = item.status === "OPEN";
  await prisma.actionItem.update({
    where: { id: actionItemId },
    data: { status: nowDone ? "DONE" : "OPEN", completedAt: nowDone ? new Date() : null },
  });
  revalidatePath(`/projects/${item.projectId}`);
  revalidatePath("/action-items");
}

export async function deleteActionItem(actionItemId: string) {
  await assertPermission(Permission.ASSIGN_ACTION_ITEMS);
  const item = await prisma.actionItem.findUnique({ where: { id: actionItemId } });
  if (!item) return;
  await prisma.actionItem.delete({ where: { id: actionItemId } });
  revalidatePath(`/projects/${item.projectId}`);
  revalidatePath("/action-items");
}
