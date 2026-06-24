import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getCurrentUser } from "@/lib/session";

/**
 * Holding screen for users who have signed in but aren't approved yet.
 * Prevents random Rutgers students from creating noise until the PM assigns
 * them a role/project (§3).
 */
export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "ACTIVE") redirect("/dashboard");

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const suspended = user.status === "SUSPENDED";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass glass-card w-full max-w-md text-center" style={{ padding: 32 }}>
        <div aria-hidden style={{ fontSize: 36, marginBottom: 12 }}>
          {suspended ? "🔒" : "⏳"}
        </div>
        <h1 style={{ fontSize: 24 }}>{suspended ? "Account suspended" : "Awaiting approval"}</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          {suspended
            ? "Your access has been suspended. Contact the Project Manager if you think this is a mistake."
            : "You're signed in as " +
              (user.email ?? "your account") +
              ". The Project Manager needs to add you to a project and assign a role before you can use the tracker."}
        </p>
        <form action={doSignOut} style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn-secondary" style={{ width: "100%" }}>
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
