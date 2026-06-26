import { Permission } from "@prisma/client";

/**
 * RBAC helpers.
 *
 * Roles are data: a role carries a list of Permission flags. These helpers
 * check capabilities off the session's permission list rather than hardcoding
 * role names, so custom roles "just work".
 */

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  roleName: string | null;
  permissions: Permission[];
};

/** Does the user have a given permission? */
export function can(user: Pick<SessionUser, "permissions"> | null | undefined, perm: Permission): boolean {
  return !!user?.permissions?.includes(perm);
}

/** Does the user have ANY of the given permissions? */
export function canAny(user: Pick<SessionUser, "permissions"> | null | undefined, perms: Permission[]): boolean {
  return !!user && perms.some((p) => user.permissions.includes(p));
}

/** Does the user have ALL of the given permissions? */
export function canAll(user: Pick<SessionUser, "permissions"> | null | undefined, perms: Permission[]): boolean {
  return !!user && perms.every((p) => user.permissions.includes(p));
}

/** Convenience: is this user effectively a PM (has the admin-ish capabilities)? */
export function isManager(user: Pick<SessionUser, "permissions"> | null | undefined): boolean {
  return can(user, Permission.MANAGE_PROJECTS);
}

/**
 * Whether the user can edit a specific project. PMs (MANAGE_PROJECTS) can edit
 * any; leads with EDIT_OWN_PROJECT can edit projects they're assigned to.
 */
export function canEditProject(
  user: Pick<SessionUser, "permissions"> | null | undefined,
  isAssignedToProject: boolean,
): boolean {
  if (!user) return false;
  if (can(user, Permission.MANAGE_PROJECTS)) return true;
  return can(user, Permission.EDIT_OWN_PROJECT) && isAssignedToProject;
}

/**
 * Human-readable labels + grouping for the permissions, used by the custom-role
 * builder UI so the PM sees friendly names instead of enum constants.
 */
export const PERMISSION_META: Record<Permission, { label: string; group: string; description: string }> = {
  VIEW_ALL_PROJECTS: { label: "View all projects", group: "Visibility", description: "Read every project (not just assigned ones)." },
  VIEW_ASSIGNED_PROJECTS: { label: "View assigned projects", group: "Visibility", description: "Read only projects the user is assigned to." },
  VIEW_MONTHLY_REVIEW: { label: "View monthly review", group: "Visibility", description: "Access the monthly review dashboard." },
  SUBMIT_STATUS_UPDATES: { label: "Submit status updates", group: "Weekly loop", description: "Submit pre-meeting status updates." },
  EDIT_OWN_PROJECT: { label: "Edit own project", group: "Weekly loop", description: "Edit projects the user is assigned to lead." },
  POST_MEETING_TRACKING: { label: "Post-meeting tracking", group: "Weekly loop", description: "Record status, goals, and blockers after meetings." },
  MANAGE_PROJECTS: { label: "Manage projects", group: "Administration", description: "Create, edit, and delete any project." },
  MANAGE_MILESTONES: { label: "Manage timeline", group: "Administration", description: "Define and edit the semester timeline (deliverables & subtasks)." },
  ASSIGN_ACTION_ITEMS: { label: "Assign action items", group: "Accountability", description: "Create and assign action items." },
  CLOSE_ACTION_ITEMS: { label: "Close action items", group: "Accountability", description: "Mark action items as done." },
  CONFIGURE_NOTIFICATIONS: { label: "Configure notifications", group: "Administration", description: "Manage notification rules and red-flag thresholds." },
  MANAGE_USERS: { label: "Manage users", group: "Administration", description: "Approve, assign, and suspend users." },
  MANAGE_ROLES: { label: "Manage roles", group: "Administration", description: "Create and edit custom roles & permissions." },
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_META) as Permission[];
