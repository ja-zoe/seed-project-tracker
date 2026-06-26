"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Permission, Channel, RecipientGroup, TriggerType, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/session";
import { notifyUser } from "@/lib/notify";
import { NotificationType } from "@prisma/client";

// ---------------------------------------------------------------------------
// User management (MANAGE_USERS)
// ---------------------------------------------------------------------------

/** Approve a pending user: activate them and assign a role. Notifies them. */
export async function approveUser(userId: string, roleId: string) {
  await assertPermission(Permission.MANAGE_USERS);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE", roleId },
    select: { id: true, email: true },
  });
  await notifyUser(user, "BOTH", {
    type: NotificationType.USER_APPROVAL,
    title: "You're approved 🎉",
    body: "Your SEED Tracker account has been approved. You can now access your projects.",
    link: "/dashboard",
  });
  revalidatePath("/admin/users");
}

export async function setUserRole(userId: string, roleId: string | null) {
  await assertPermission(Permission.MANAGE_USERS);
  await prisma.user.update({ where: { id: userId }, data: { roleId } });
  revalidatePath("/admin/users");
}

export async function setUserStatus(userId: string, status: UserStatus) {
  await assertPermission(Permission.MANAGE_USERS);
  await prisma.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/admin/users");
}

/** Replace the projects a user *leads* (leaves their general-member roles intact). */
export async function setUserProjects(userId: string, projectIds: string[]) {
  await assertPermission(Permission.MANAGE_USERS);
  await prisma.$transaction([
    prisma.projectAssignment.deleteMany({ where: { userId, role: "LEAD" } }),
    prisma.projectAssignment.createMany({
      data: projectIds.map((projectId) => ({ projectId, userId, role: "LEAD" as const })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath("/admin/users");
}

// ---------------------------------------------------------------------------
// Custom roles (MANAGE_ROLES) — the role builder (§2)
// ---------------------------------------------------------------------------

const roleSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  description: z.string().optional(),
  permissions: z.array(z.nativeEnum(Permission)),
});

function parseRoleForm(formData: FormData) {
  return roleSchema.parse({
    name: formData.get("name"),
    description: formData.get("description")?.toString() || undefined,
    permissions: formData.getAll("permissions").map(String) as Permission[],
  });
}

export async function createRole(formData: FormData) {
  await assertPermission(Permission.MANAGE_ROLES);
  const data = parseRoleForm(formData);
  await prisma.role.create({ data: { ...data, isBuiltIn: false } });
  revalidatePath("/admin/roles");
}

export async function updateRole(roleId: string, formData: FormData) {
  await assertPermission(Permission.MANAGE_ROLES);
  const data = parseRoleForm(formData);
  // Built-in roles can have their permissions tuned but keep their identity.
  await prisma.role.update({ where: { id: roleId }, data });
  revalidatePath("/admin/roles");
}

export async function deleteRole(roleId: string) {
  await assertPermission(Permission.MANAGE_ROLES);
  const role = await prisma.role.findUnique({ where: { id: roleId }, include: { _count: { select: { users: true } } } });
  if (!role) return;
  if (role.isBuiltIn) throw new Error("Built-in roles cannot be deleted");
  if (role._count.users > 0) throw new Error("Reassign this role's users before deleting it");
  await prisma.role.delete({ where: { id: roleId } });
  revalidatePath("/admin/roles");
}

// ---------------------------------------------------------------------------
// Red-flag thresholds + notification rules (CONFIGURE_NOTIFICATIONS) (§5.3, §5.5)
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  weeksBehindMilestone: z.coerce.number().int().min(0).max(12),
  missedGoalsInARow: z.coerce.number().int().min(1).max(12),
  requireBoth: z.boolean(),
  submissionDeadlineHours: z.coerce.number().int().min(1).max(336),
});

export async function updateSettings(formData: FormData) {
  await assertPermission(Permission.CONFIGURE_NOTIFICATIONS);
  const data = settingsSchema.parse({
    weeksBehindMilestone: formData.get("weeksBehindMilestone"),
    missedGoalsInARow: formData.get("missedGoalsInARow"),
    requireBoth: formData.get("requireBoth") === "on" || formData.get("requireBoth") === "true",
    submissionDeadlineHours: formData.get("submissionDeadlineHours"),
  });
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  revalidatePath("/admin/notifications");
}

const ruleSchema = z.object({
  name: z.string().min(2),
  triggerType: z.nativeEnum(TriggerType),
  channel: z.nativeEnum(Channel),
  recipients: z.nativeEnum(RecipientGroup),
  thresholdHours: z.coerce.number().int().min(0).max(720).optional(),
});

export async function createRule(formData: FormData) {
  await assertPermission(Permission.CONFIGURE_NOTIFICATIONS);
  const raw = ruleSchema.parse({
    name: formData.get("name"),
    triggerType: formData.get("triggerType"),
    channel: formData.get("channel"),
    recipients: formData.get("recipients"),
    thresholdHours: formData.get("thresholdHours") || undefined,
  });
  await prisma.notificationRule.create({ data: raw });
  revalidatePath("/admin/notifications");
}

export async function toggleRule(ruleId: string) {
  await assertPermission(Permission.CONFIGURE_NOTIFICATIONS);
  const rule = await prisma.notificationRule.findUnique({ where: { id: ruleId } });
  if (!rule) return;
  await prisma.notificationRule.update({ where: { id: ruleId }, data: { enabled: !rule.enabled } });
  revalidatePath("/admin/notifications");
}

export async function deleteRule(ruleId: string) {
  await assertPermission(Permission.CONFIGURE_NOTIFICATIONS);
  await prisma.notificationRule.delete({ where: { id: ruleId } });
  revalidatePath("/admin/notifications");
}
