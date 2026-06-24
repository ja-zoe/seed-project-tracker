import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js config.
 *
 * This half contains NO database access (no Prisma adapter), so it can run in
 * the Edge middleware. The full config in `auth.ts` extends it with the Prisma
 * adapter and DB-backed callbacks (which run only in the Node.js runtime).
 */
export const authConfig = {
  // JWT sessions so middleware can authorize without a database round-trip.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      // All users come from one trusted Google Workspace domain, so linking an
      // OAuth login to a pre-seeded user row by email is safe here. This is what
      // lets the seeded PM admin account attach to its Google login on first sign-in.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    /**
     * Used by the middleware to gate routes. Returning false redirects to the
     * sign-in page. We only check identity + active status here (cheap, from the
     * token); fine-grained permission checks happen in server actions/pages.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const status = (auth?.user as { status?: string } | undefined)?.status;

      // Public routes
      const isPublic =
        pathname === "/login" ||
        pathname === "/pending" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/cron");

      if (isPublic) return true;
      if (!isLoggedIn) return false;

      // Logged in but not yet approved → only the /pending screen is allowed.
      if (status !== "ACTIVE" && pathname !== "/pending") {
        return Response.redirect(new URL("/pending", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
