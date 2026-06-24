import { redirect } from "next/navigation";
import { casMode, casServiceUrl, mockTicketFor } from "@/lib/cas";

/**
 * Mock CAS screen (the workaround while the real CAS integration is pending
 * registration with Rutgers IdM). It stands in for cas.rutgers.edu/login:
 * enter a NetID, it issues a mock "ticket" and redirects back to the callback —
 * exercising the exact same callback → session code path as real CAS.
 *
 * Only reachable in mock mode; in real mode this redirects to /login.
 */
export default async function DevLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  if (casMode() !== "mock") redirect("/login");
  const { service } = await searchParams;

  async function issueTicket(formData: FormData) {
    "use server";
    const netid = String(formData.get("netid") ?? "").trim().toLowerCase();
    if (!netid) redirect("/dev-login");
    const target = service || casServiceUrl();
    redirect(`${target}?ticket=${encodeURIComponent(mockTicketFor(netid))}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="panel-light w-full max-w-md" style={{ padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <span className="badge badge-at-risk">Mock CAS · development only</span>
        </div>
        <h1 className="display" style={{ fontSize: 26, textAlign: "center" }}>Rutgers CAS (stand-in)</h1>
        <p className="muted" style={{ marginTop: 8, textAlign: "center", lineHeight: 1.6 }}>
          The real CAS login is pending registration with Rutgers IdM. For now, enter any NetID to
          simulate a successful CAS sign-in. No password is checked.
        </p>
        <form action={issueTicket} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label" htmlFor="netid">NetID</label>
            <input id="netid" name="netid" className="input" required placeholder="e.g. abc123" autoFocus />
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Becomes <code>netid@scarletmail.rutgers.edu</code>. Use your PM_ADMIN NetID to land as the Project Manager.
            </p>
          </div>
          <button type="submit" className="btn btn-brand btn-lg" style={{ width: "100%" }}>Sign in</button>
        </form>
      </div>
    </main>
  );
}
