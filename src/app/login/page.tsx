import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { allowedDomains } from "@/lib/env";

/**
 * Login screen — "Sign in with Google", domain-restricted.
 * If already signed in, bounce to the app.
 */
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const domains = allowedDomains();

  async function googleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass glass-card w-full max-w-md text-center" style={{ padding: 32 }}>
        <div
          aria-hidden
          className="mx-auto mb-5 flex items-center justify-center"
          style={{ width: 56, height: 56, borderRadius: 18, background: "var(--brand-soft)", fontSize: 28 }}
        >
          🌱
        </div>
        <h1 style={{ fontSize: 28 }}>SEED Project Tracker</h1>
        <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          Weekly check-ins, milestones, and project health for the SEED club. Sign in with your
          Rutgers Google account to continue.
        </p>

        <form action={googleSignIn} style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn-brand btn-lg" style={{ width: "100%" }}>
            <GoogleGlyph />
            Sign in with Google
          </button>
        </form>

        {domains.length > 0 && (
          <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
            Restricted to: {domains.join(", ")}
          </p>
        )}
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          New here? After signing in you&apos;ll be in a pending state until the Project Manager
          adds you to a project.
        </p>
      </div>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 16 3 9.1 7.6 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.1 40.3 16 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C40.9 36 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
