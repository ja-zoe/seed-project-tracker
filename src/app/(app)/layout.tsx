import { Permission } from "@prisma/client";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppShell, type NavItem } from "@/components/AppShell";

/**
 * Authenticated shell. Gates the whole (app) route group to ACTIVE users and
 * builds the nav from the user's permissions so people only see what they can use.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  // Primary nav — available to every active user.
  const primary: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "▱" },
    { href: "/projects", label: "Projects", icon: "▤" },
    { href: "/action-items", label: "Action Items", icon: "✓" },
  ];
  if (can(user, Permission.VIEW_MONTHLY_REVIEW)) {
    primary.push({ href: "/review", label: "Monthly Review", icon: "◷" });
  }

  // Admin nav — only the relevant capabilities.
  const admin: NavItem[] = [];
  if (can(user, Permission.MANAGE_USERS)) admin.push({ href: "/admin/users", label: "Users", icon: "☻" });
  if (can(user, Permission.MANAGE_ROLES)) admin.push({ href: "/admin/roles", label: "Roles", icon: "⚿" });
  if (can(user, Permission.CONFIGURE_NOTIFICATIONS)) admin.push({ href: "/admin/notifications", label: "Notifications", icon: "⚙" });

  const groups = [{ items: primary }, ...(admin.length ? [{ heading: "Admin", items: admin }] : [])];

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AppShell
      groups={groups}
      unreadCount={unreadCount}
      user={{ name: user.name, email: user.email, roleName: user.roleName }}
      signOutAction={doSignOut}
    >
      {children}
    </AppShell>
  );
}
