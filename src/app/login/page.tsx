import Link from "next/link";
import { redirect } from "next/navigation";
import { Sprout } from "lucide-react";
import { auth } from "@/auth";
import { allowedDomains } from "@/lib/env";
import { casMode } from "@/lib/cas";

/**
 * Login screen — "Sign in with NetID" via Rutgers CAS. If already signed in,
 * bounce to the app.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;
  const domains = allowedDomains();
  const mock = casMode() === "mock";

  const errorMessage =
    error === "domain"
      ? "That account isn't in an allowed Rutgers domain."
      : error
        ? "Sign-in failed or was cancelled. Please try again."
        : null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="panel-light w-full max-w-md text-center" style={{ padding: 32 }}>
        <div
          aria-hidden
          className="mx-auto mb-5 flex items-center justify-center"
          style={{ width: 56, height: 56, borderRadius: 18, background: "var(--primary)", color: "#14171b" }}
        >
          <Sprout size={28} />
        </div>
        <h1 className="display" style={{ fontSize: 30 }}>SEED Project Tracker</h1>
        <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          Weekly check-ins, milestones, and project health for the SEED club. Sign in with your
          Rutgers NetID to continue.
        </p>

        {errorMessage && (
          <div className="panel-light" style={{ borderColor: "var(--status-behind)", marginTop: 16, padding: 12 }}>
            <span style={{ color: "var(--status-behind)", fontSize: 14 }}>{errorMessage}</span>
          </div>
        )}

        {/* A plain link → GET /api/cas/login → 302 to CAS (or the mock screen). */}
        <Link href="/api/cas/login" prefetch={false} className="btn btn-brand btn-lg" style={{ width: "100%", marginTop: 24 }}>
          Sign in with NetID
        </Link>

        {mock && (
          <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
            ⚠️ Running in <strong>mock CAS</strong> mode — real Rutgers CAS sign-in is pending registration.
          </p>
        )}
        {domains.length > 0 && (
          <p className="muted" style={{ fontSize: 12, marginTop: mock ? 6 : 16 }}>
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
