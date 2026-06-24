import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Permission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { isEmailAllowed } from "@/lib/env";

/**
 * Full Auth.js setup (Node.js runtime only — uses Prisma).
 *
 * - Google OAuth, restricted to the allowed email domain(s).
 * - New users land as PENDING (schema default) until a PM approves them.
 * - The JWT carries an identity snapshot (id, status, role, permissions) so the
 *   middleware can authorize cheaply. Authoritative permission checks in server
 *   actions should still re-read from the DB via `getCurrentUser()`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,

    /** Enforce the Rutgers email-domain restriction at sign-in. */
    async signIn({ user }) {
      return isEmailAllowed(user.email);
    },

    /**
     * Populate the token with a snapshot of the user's role + permissions.
     * Runs on sign-in (`user` present) and whenever a session `update()` is
     * triggered (e.g. after a PM changes someone's role). We re-read from the DB
     * in those cases so stale permissions get refreshed without a full re-login.
     */
    async jwt({ token, user, trigger }) {
      const userId = user?.id ?? (token.sub as string | undefined);
      if ((trigger === "signIn" || trigger === "update" || user) && userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { role: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.status = dbUser.status;
          token.roleName = dbUser.role?.name ?? null;
          token.permissions = (dbUser.role?.permissions ?? []) as Permission[];
        }
      }
      return token;
    },

    /** Expose the snapshot on `session.user`. */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.status = (token.status as "PENDING" | "ACTIVE" | "SUSPENDED") ?? "PENDING";
        session.user.roleName = (token.roleName as string | null) ?? null;
        session.user.permissions = (token.permissions as Permission[]) ?? [];
      }
      return session;
    },
  },
});
