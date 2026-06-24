import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config.
 *
 * This half contains NO database access and NO providers (the CAS Credentials
 * provider, which uses Prisma + node:crypto, lives in `auth.ts`). Keeping
 * providers out of here means the Edge middleware bundle stays clean — it only
 * needs the `authorized` callback and JWT session decoding.
 */
export const authConfig = {
  // JWT sessions so middleware can authorize without a database round-trip.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [], // real provider(s) are added in auth.ts (Node runtime)
  callbacks: {
    /**
     * Middleware route gate. To avoid stale-token redirect loops, this ONLY
     * checks whether the user is logged in — it deliberately does NOT decide
     * "pending vs active" here, because that status comes from the JWT (a
     * snapshot from login time) and can disagree with the live database.
     *
     * The pending/active gate is enforced server-side instead, against the
     * database (see `requireUser()` in src/lib/session.ts and the /pending and
     * root pages), so there is a single source of truth and the two layers can
     * never bounce the user back and forth.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Public routes (auth screens + the CAS sign-in flow + cron).
      const isPublic =
        pathname === "/login" ||
        pathname === "/pending" ||
        pathname === "/dev-login" ||
        pathname.startsWith("/cas") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/cas") ||
        pathname.startsWith("/api/cron");

      if (isPublic) return true;
      return !!auth?.user; // logged in? otherwise redirect to sign-in
    },
  },
} satisfies NextAuthConfig;
