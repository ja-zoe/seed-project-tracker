import { Permission, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can, type SessionUser } from "@/lib/permissions";

/**
 * Build a Prisma `where` clause that restricts projects to what a user may see.
 * VIEW_ALL_PROJECTS → everything; otherwise only projects they're assigned to.
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

/** Is this user assigned to (a lead on) the given project? */
export async function isAssignedTo(userId: string, projectId: string): Promise<boolean> {
  const a = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!a;
}

/** Projects visible to the user, with lightweight aggregates for cards. */
export async function getVisibleProjects(user: SessionUser) {
  return prisma.project.findMany({
    where: projectVisibilityWhere(user),
    orderBy: { name: "asc" },
    include: {
      assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      milestones: { select: { completed: true, targetDate: true } },
      _count: { select: { actionItems: { where: { status: "OPEN" } } } },
    },
  });
}
