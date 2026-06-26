import { Permission, ProjectMemberRole, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can, type SessionUser } from "@/lib/permissions";

/**
 * Build a Prisma `where` clause that restricts projects to what a user may see.
 * VIEW_ALL_PROJECTS → everything; otherwise only projects they're a member of
 * (lead OR general member).
 */
export function projectVisibilityWhere(user: SessionUser): Prisma.ProjectWhereInput {
  if (can(user, Permission.VIEW_ALL_PROJECTS)) return {};
  return { assignments: { some: { userId: user.id } } };
}

/** Can this user see a particular project at all? */
export async function canViewProject(user: SessionUser, projectId: string): Promise<boolean> {
  if (can(user, Permission.VIEW_ALL_PROJECTS)) return true;
  const assignment = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  return !!assignment;
}

/**
 * Is this user a LEAD on the given project? Leads (not general members) are the
 * ones allowed to edit the project and submit status updates, so edit/submit
 * checks key off this.
 */
export async function isLeadOf(userId: string, projectId: string): Promise<boolean> {
  const a = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return a?.role === ProjectMemberRole.LEAD;
}

/** Is this user a member of the project in any capacity (lead or general member)? */
export async function isMemberOf(userId: string, projectId: string): Promise<boolean> {
  const a = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!a;
}

/**
 * Projects visible to the user, with lightweight aggregates for cards. Each
 * project is annotated with `viewerIsLead` so the UI can clearly separate
 * projects the user leads from ones they're only viewing (or a member of).
 */
export async function getVisibleProjects(user: SessionUser) {
  const projects = await prisma.project.findMany({
    where: projectVisibilityWhere(user),
    orderBy: { name: "asc" },
    include: {
      assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      deliverables: { select: { completed: true, targetDate: true } },
      _count: { select: { actionItems: { where: { status: "OPEN" } } } },
    },
  });

  return projects.map((p) => ({
    ...p,
    viewerIsLead: p.assignments.some(
      (a) => a.userId === user.id && a.role === ProjectMemberRole.LEAD,
    ),
    viewerIsMember: p.assignments.some((a) => a.userId === user.id),
  }));
}
