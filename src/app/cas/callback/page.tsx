import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { isEmailAllowed } from "@/lib/env";
import { mintHandoff, netidToEmail, validateTicket } from "@/lib/cas";
import { AutoSubmit } from "@/components/AutoSubmit";

/**
 * CAS callback. CAS (or the mock screen) redirects here with a `ticket`. We
 * validate it server-side, map the NetID to an email, enforce the domain
 * restriction, then establish the Auth.js session via the CAS Credentials
 * provider (handed a short-lived signed token).
 */
export default async function CasCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket } = await searchParams;
  if (!ticket) redirect("/login?error=cas");

  const netid = await validateTicket(ticket);
  if (!netid) redirect("/login?error=cas");

  if (!isEmailAllowed(netidToEmail(netid))) redirect("/login?error=domain");

  // Proof-of-validation token consumed by the `cas` Credentials provider.
  const handoff = mintHandoff(netid);

  async function completeSignIn() {
    "use server";
    await signIn("cas", { token: handoff, redirectTo: "/" });
  }

  return <AutoSubmit action={completeSignIn} />;
}
