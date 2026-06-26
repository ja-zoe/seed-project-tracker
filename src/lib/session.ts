import { cache } from "react";
import { redirect } from "next/navigation";
import { Prisma, type Permission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can, type SessionUser } from "@/lib/permissions";

/**
 * Transient connection errors we should retry rather than surface. The app's
 * `DATABASE_URL` points at Supabase's PgBouncer pooler (port 6543); on a cold or
 * first request after sign-in that pooled connection occasionally drops or times
 * out, which is exactly the "fails once, works on refresh" symptom. Retrying a
 * couple of times with a tiny backoff absorbs the blip instead of 500-ing the
 * dashboard's server render.
 */
const TRANSIENT_PRISMA_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017"]);

function isTransient(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientRustPanicError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(err.code);
  }
  // Fall back to message sniffing for raw driver/connection errors.
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return /connection|timed out|timeout|econnreset|terminat|closed the connection|reach database/.test(msg);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === attempts - 1) throw err;
      // 50ms, 150ms backoff — enough for the pooler to hand back a live conn.
      await new Promise((r) => setTimeout(r, 50 + i * 100));
    }
  }
  throw lastErr;
}

/**
 * Authoritative current-user lookup for server components & server actions.
 *
 * Unlike the JWT snapshot, this re-reads the role + permissions from the
 * database, so authorization always reflects the user's *current* role (even if
 * the PM changed it mid-session). `cache()` dedupes the query within one request.
 *
 * Returns `null` ONLY when the request is genuinely unauthenticated (no valid
 * session, or the user no longer exists). Transient infrastructure failures are
 * retried and, if still failing, thrown — so callers never mistake an infra
 * blip for "logged out" and bounce the user to /login.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await withRetry(() => auth());
  if (!session?.user?.id) return null;

  const dbUser = await withRetry(() =>
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    }),
  );
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
