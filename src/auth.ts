import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Permission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { isEmailAllowed } from "@/lib/env";
import { netidToEmail, verifyHandoff } from "@/lib/cas";

/**
 * Full Auth.js setup (Node.js runtime only — uses Prisma).
 *
 * Sign-in goes through Rutgers CAS (see src/lib/cas.ts). The CAS callback
 * validates the ticket server-side and hands this Credentials provider a
 * short-lived, signed "handoff" token; the provider verifies it and upserts the
 * user. This keeps the rest of the app provider-agnostic.
 *
 * - New users land as PENDING (schema default) until a PM approves them.
 * - The JWT carries an identity snapshot (id, status, role, permissions) so the
 *   middleware can authorize cheaply. Authoritative permission checks in server
 *   actions should still re-read from the DB via `getCurrentUser()`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      id: "cas",
      name: "Rutgers CAS",
      // The only input is a signed handoff token minted by the CAS callback
      // after it validated the CAS ticket — never a raw NetID from the client.
      credentials: { token: { label: "Handoff token", type: "text" } },
      async authorize(credentials) {
        const token = typeof credentials?.token === "string" ? credentials.token : null;
        if (!token) return null;

        const netid = verifyHandoff(token);
        if (!netid) return null; // invalid / expired / forged

        const email = netidToEmail(netid);
        if (!isEmailAllowed(email)) return null;

        // Upsert the user. New users default to PENDING (schema); the PM admin
        // is pre-activated by the seed. We don't overwrite existing status/role.
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: netid },
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    /** Defense-in-depth: re-check the Rutgers domain restriction at sign-in. */
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
