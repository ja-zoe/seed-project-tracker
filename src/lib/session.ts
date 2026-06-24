import { cache } from "react";
import { redirect } from "next/navigation";
import type { Permission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can, type SessionUser } from "@/lib/permissions";

/**
 * Authoritative current-user lookup for server components & server actions.
 *
 * Unlike the JWT snapshot, this re-reads the role + permissions from the
 * database, so authorization always reflects the user's *current* role (even if
 * the PM changed it mid-session). `cache()` dedupes the query within one request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });
  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    image: dbUser.image,
    status: dbUser.status,
    roleName: dbUser.role?.name ?? null,
    permissions: (dbUser.role?.permissions ?? []) as Permission[],
  };
});

/** Require an ACTIVE, signed-in user or redirect. Use at the top of protected pages. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE") redirect("/pending");
  return user;
}

/** Require a specific permission or redirect to the dashboard. */
export async function requirePermission(perm: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, perm)) redirect("/dashboard");
  return user;
}

/** Throw (for server actions / route handlers) if the permission is missing. */
export async function assertPermission(perm: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") throw new Error("Not authenticated");
  if (!can(user, perm)) throw new Error("Forbidden: missing permission " + perm);
  return user;
}
