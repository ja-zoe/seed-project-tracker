"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Permission, ProjectStatus, ProjectMemberRole, TimelineStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, getCurrentUser } from "@/lib/session";
import { canEditProject } from "@/lib/permissions";
import { isLeadOf } from "@/lib/queries";
import { getSettings, isSubmissionLate, recomputeProjectStatus } from "@/lib/health";
import { notifyUser, resolveRecipients } from "@/lib/notify";
import { NotificationType } from "@prisma/client";

/** Ensure the current user may edit this project (PM, or assigned lead). */
async function assertCanEditProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") throw new Error("Not authenticated");
  const assigned = await isLeadOf(user.id, projectId);
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

/** PM assigns / unassigns leads on a project (leaves general members intact). */
export async function setProjectLeads(projectId: string, leadIds: string[]) {
  await assertPermission(Permission.MANAGE_PROJECTS);
  await prisma.$transaction([
    prisma.projectAssignment.deleteMany({ where: { projectId, role: ProjectMemberRole.LEAD } }),
    prisma.projectAssignment.createMany({
      data: leadIds.map((userId) => ({ projectId, userId, role: ProjectMemberRole.LEAD })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath(`/projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Project membership (general members) — used by the semester timeline so
// subtasks can be assigned to people, and so members get their own view.
// ---------------------------------------------------------------------------

/** Add a general member to a project (idempotent; never demotes an existing lead). */
export async function addProjectMember(projectId: string, formData: FormData) {
  await assertCanEditProject(projectId);
  const userId = z.string().min(1).parse(formData.get("userId"));
  const existing = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!existing) {
    await prisma.projectAssignment.create({
      data: { projectId, userId, role: ProjectMemberRole.MEMBER },
    });
  }
  revalidatePath(`/projects/${projectId}`);
}

/** Remove a general member from a project. Leads are managed via setProjectLeads. */
export async function removeProjectMember(projectId: string, userId: string) {
  await assertCanEditProject(projectId);
  await prisma.projectAssignment.deleteMany({
    where: { projectId, userId, role: ProjectMemberRole.MEMBER },
  });
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
// Semester timeline — deliverables (major milestones) + nested subtasks
// ---------------------------------------------------------------------------

/** Keep the `completed` flag (used by health detection) in sync with status. */
function completionFor(status: TimelineStatus, prevCompletedDate: Date | null) {
  const completed = status === TimelineStatus.COMPLETE;
  return {
    completed,
    completedDate: completed ? prevCompletedDate ?? new Date() : null,
  };
}

const deliverableSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.coerce.date(),
  startDate: z.coerce.date().optional(),
  status: z.nativeEnum(TimelineStatus).optional(),
});

export async function addDeliverable(projectId: string, formData: FormData) {
  await assertCanEditProject(projectId);
  const data = deliverableSchema.parse({
    title: formData.get("title"),
    description: formData.get("description")?.toString() || undefined,
    targetDate: formData.get("targetDate"),
    startDate: formData.get("startDate") || undefined,
    status: formData.get("status") || undefined,
  });
  const status = data.status ?? TimelineStatus.NOT_STARTED;
  const last = await prisma.deliverable.findFirst({
    where: { projectId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });
  await prisma.deliverable.create({
    data: {
      projectId,
      title: data.title,
      description: data.description,
      targetDate: data.targetDate,
      startDate: data.startDate,
      status,
      orderIndex: (last?.orderIndex ?? -1) + 1,
      ...completionFor(status, null),
    },
  });
  await recomputeProjectStatus(projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateDeliverable(deliverableId: string, formData: FormData) {
  const d = await prisma.deliverable.findUnique({ where: { id: deliverableId } });
  if (!d) throw new Error("Deliverable not found");
  await assertCanEditProject(d.projectId);
  const data = deliverableSchema.parse({
    title: formData.get("title"),
    description: formData.get("description")?.toString() || undefined,
    targetDate: formData.get("targetDate"),
    startDate: formData.get("startDate") || undefined,
    status: formData.get("status") || undefined,
  });
  const status = data.status ?? d.status;
  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      title: data.title,
      description: data.description ?? null,
      targetDate: data.targetDate,
      startDate: data.startDate ?? null,
      status,
      ...completionFor(status, d.completedDate),
    },
  });
  await recomputeProjectStatus(d.projectId);
  revalidatePath(`/projects/${d.projectId}`);
}

/** Quick status cycle from the timeline (NOT_STARTED → IN_PROGRESS → COMPLETE). */
export async function setDeliverableStatus(deliverableId: string, status: TimelineStatus) {
  const d = await prisma.deliverable.findUnique({ where: { id: deliverableId } });
  if (!d) throw new Error("Deliverable not found");
  await assertCanEditProject(d.projectId);
  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: { status, ...completionFor(status, d.completedDate) },
  });
  await recomputeProjectStatus(d.projectId);
  revalidatePath(`/projects/${d.projectId}`);
}

export async function deleteDeliverable(deliverableId: string) {
  const d = await prisma.deliverable.findUnique({ where: { id: deliverableId } });
  if (!d) return;
  await assertCanEditProject(d.projectId);
  await prisma.deliverable.delete({ where: { id: deliverableId } });
  await recomputeProjectStatus(d.projectId);
  revalidatePath(`/projects/${d.projectId}`);
}

const subtaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  status: z.nativeEnum(TimelineStatus).optional(),
});

/** Confirm an assignee (if any) is actually a member of the project. */
async function assertAssigneeIsMember(projectId: string, assigneeId: string | undefined) {
  if (!assigneeId) return;
  const member = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
  });
  if (!member) throw new Error("Subtasks can only be assigned to a project member");
}

export async function addSubtask(deliverableId: string, formData: FormData) {
  const d = await prisma.deliverable.findUnique({ where: { id: deliverableId } });
  if (!d) throw new Error("Deliverable not found");
  await assertCanEditProject(d.projectId);
  const data = subtaskSchema.parse({
    title: formData.get("title"),
    description: formData.get("description")?.toString() || undefined,
    assigneeId: formData.get("assigneeId")?.toString() || undefined,
    dueDate: formData.get("dueDate") || undefined,
    startDate: formData.get("startDate") || undefined,
    status: formData.get("status") || undefined,
  });
  await assertAssigneeIsMember(d.projectId, data.assigneeId);
  const status = data.status ?? TimelineStatus.NOT_STARTED;
  const last = await prisma.subtask.findFirst({
    where: { deliverableId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });
  const subtask = await prisma.subtask.create({
    data: {
      deliverableId,
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      dueDate: data.dueDate,
      startDate: data.startDate,
      status,
      orderIndex: (last?.orderIndex ?? -1) + 1,
      completedAt: status === TimelineStatus.COMPLETE ? new Date() : null,
    },
    include: { deliverable: { select: { projectId: true, project: { select: { name: true } } } } },
  });
  await notifyAssignee(subtask.assigneeId, subtask.deliverable.projectId, subtask.deliverable.project.name, subtask.title);
  revalidatePath(`/projects/${d.projectId}`);
}

export async function updateSubtask(subtaskId: string, formData: FormData) {
  const s = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { deliverable: { select: { projectId: true, project: { select: { name: true } } } } },
  });
  if (!s) throw new Error("Subtask not found");
  await assertCanEditProject(s.deliverable.projectId);
  const data = subtaskSchema.parse({
    title: formData.get("title"),
    description: formData.get("description")?.toString() || undefined,
    assigneeId: formData.get("assigneeId")?.toString() || undefined,
    dueDate: formData.get("dueDate") || undefined,
    startDate: formData.get("startDate") || undefined,
    status: formData.get("status") || undefined,
  });
  await assertAssigneeIsMember(s.deliverable.projectId, data.assigneeId);
  const status = data.status ?? s.status;
  await prisma.subtask.update({
    where: { id: subtaskId },
    data: {
      title: data.title,
      description: data.description ?? null,
      assigneeId: data.assigneeId ?? null,
      dueDate: data.dueDate ?? null,
      startDate: data.startDate ?? null,
      status,
      completedAt: status === TimelineStatus.COMPLETE ? s.completedAt ?? new Date() : null,
    },
  });
  // Notify on a newly-assigned owner.
  if (data.assigneeId && data.assigneeId !== s.assigneeId) {
    await notifyAssignee(data.assigneeId, s.deliverable.projectId, s.deliverable.project.name, data.title);
  }
  revalidatePath(`/projects/${s.deliverable.projectId}`);
}

/**
 * Update a subtask's status. Usable by the assignee themselves (so a general
 * member can mark their own work progressing) or by anyone who can edit the project.
 */
export async function setSubtaskStatus(subtaskId: string, status: TimelineStatus) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") throw new Error("Not authenticated");
  const s = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { deliverable: { select: { projectId: true } } },
  });
  if (!s) throw new Error("Subtask not found");

  const isAssignee = s.assigneeId === user.id;
  const canEdit = canEditProject(user, await isLeadOf(user.id, s.deliverable.projectId));
  if (!isAssignee && !canEdit) throw new Error("Forbidden");

  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { status, completedAt: status === TimelineStatus.COMPLETE ? s.completedAt ?? new Date() : null },
  });
  revalidatePath(`/projects/${s.deliverable.projectId}`);
  revalidatePath("/my-tasks");
}

/** formData wrappers so a <select> can post a status change on change. */
export async function deliverableStatusAction(deliverableId: string, formData: FormData) {
  const status = z.nativeEnum(TimelineStatus).parse(formData.get("status"));
  await setDeliverableStatus(deliverableId, status);
}

export async function subtaskStatusAction(subtaskId: string, formData: FormData) {
  const status = z.nativeEnum(TimelineStatus).parse(formData.get("status"));
  await setSubtaskStatus(subtaskId, status);
}

export async function deleteSubtask(subtaskId: string) {
  const s = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { deliverable: { select: { projectId: true } } },
  });
  if (!s) return;
  await assertCanEditProject(s.deliverable.projectId);
  await prisma.subtask.delete({ where: { id: subtaskId } });
  revalidatePath(`/projects/${s.deliverable.projectId}`);
}

/** Notify a member that a subtask was assigned to them. */
async function notifyAssignee(assigneeId: string | null, projectId: string, projectName: string, title: string) {
  const current = await getCurrentUser();
  if (!assigneeId || assigneeId === current?.id) return;
  const owner = await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true, email: true } });
  if (!owner) return;
  await notifyUser(owner, "BOTH", {
    type: NotificationType.ACTION_ITEM,
    title: `New task: ${projectName}`,
    body: title,
    link: "/my-tasks",
  });
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
  const assigned = await isLeadOf(user.id, data.projectId);
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
