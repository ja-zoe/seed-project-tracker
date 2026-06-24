import crypto from "node:crypto";

/**
 * Rutgers CAS (Central Authentication Service) integration.
 *
 * CAS is a ticket-based SSO protocol (not OAuth):
 *   1. App redirects the browser to  <CAS>/login?service=<callback>
 *   2. User authenticates at CAS; CAS redirects back to <callback>?ticket=ST-...
 *   3. App validates the ticket against <CAS>/serviceValidate and gets the NetID.
 *
 * Two modes (CAS_MODE):
 *   - "real"  — talks to the actual Rutgers CAS server. Requires the app's
 *               service URL to be REGISTERED with Rutgers IdM (the Enterprise
 *               CAS request form), otherwise CAS rejects it.
 *   - "mock"  — (default) a local stand-in CAS screen (/dev-login) so the app is
 *               fully usable before registration. Same callback → session path.
 *
 * The mode only changes how a NetID is obtained; everything after (user upsert,
 * roles, pending approval) is identical.
 */

const DEFAULT_EMAIL_DOMAIN = "scarletmail.rutgers.edu";

export function casMode(): "mock" | "real" {
  return process.env.CAS_MODE === "real" ? "real" : "mock";
}

/** Base URL of the app, used to build absolute service/callback URLs. */
function appBaseUrl(): string {
  return process.env.AUTH_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

/** Base URL of the Rutgers CAS server. Verify the exact value in the CAS docs. */
function casBaseUrl(): string {
  return (process.env.CAS_BASE_URL || "https://cas.rutgers.edu").replace(/\/$/, "");
}

/** The CAS "service" (callback) URL CAS redirects back to with a ticket. */
export function casServiceUrl(): string {
  return `${appBaseUrl()}/cas/callback`;
}

/** Map a NetID to its email address (used for the domain allow-list + records). */
export function netidToEmail(netid: string): string {
  const domain = process.env.CAS_EMAIL_DOMAIN || DEFAULT_EMAIL_DOMAIN;
  return `${netid.toLowerCase()}@${domain}`;
}

/** Where to send the user to start authentication (real CAS, or the mock screen). */
export function casLoginUrl(): string {
  const service = encodeURIComponent(casServiceUrl());
  if (casMode() === "real") {
    return `${casBaseUrl()}/login?service=${service}`;
  }
  return `${appBaseUrl()}/dev-login?service=${service}`;
}

// ---------------------------------------------------------------------------
// Signed tokens (HMAC over AUTH_SECRET).
//
// Two uses:
//  - mock "service tickets" (mimic CAS ST-... tickets in mock mode)
//  - the short-lived "handoff" token passed to the Auth.js Credentials provider,
//    proving the NetID was validated server-side (so the credentials endpoint
//    can't be spoofed by a forged POST).
// ---------------------------------------------------------------------------

function hmac(payload: string): string {
  const secret = process.env.AUTH_SECRET || "insecure-dev-secret";
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function makeToken(netid: string, ttlSeconds: number): string {
  const body = `${netid.toLowerCase()}.${Date.now() + ttlSeconds * 1000}`;
  return `${Buffer.from(body).toString("base64url")}.${hmac(body)}`;
}

function readToken(token: string): string | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const body = Buffer.from(b64, "base64url").toString();
  if (!crypto.timingSafeEqual(Buffer.from(hmac(body)), Buffer.from(sig))) return null;
  const [netid, expStr] = body.split(".");
  if (!netid || !expStr || Date.now() > Number(expStr)) return null;
  return netid;
}

/** Mint a mock CAS service ticket for a NetID (mock mode only). */
export function mockTicketFor(netid: string): string {
  return makeToken(netid, 120);
}

/** Mint the short-lived handoff token consumed by the Credentials provider. */
export function mintHandoff(netid: string): string {
  return makeToken(netid, 60);
}

/** Verify a handoff token → NetID (or null). */
export function verifyHandoff(token: string): string | null {
  return readToken(token);
}

/**
 * Validate a CAS service ticket and return the authenticated NetID.
 * Real mode: calls CAS /serviceValidate and parses <cas:user>. Mock mode: the
 * "ticket" is our signed token, verified locally.
 */
export async function validateTicket(ticket: string): Promise<string | null> {
  if (casMode() === "real") {
    const url = `${casBaseUrl()}/serviceValidate?service=${encodeURIComponent(casServiceUrl())}&ticket=${encodeURIComponent(ticket)}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const xml = await res.text();
      // CAS 2.0 success response contains <cas:user>NetID</cas:user>.
      const match = xml.match(/<cas:user>\s*([^<\s]+)\s*<\/cas:user>/i);
      return match ? match[1].trim().toLowerCase() : null;
    } catch (err) {
      console.error("[cas] serviceValidate failed:", err);
      return null;
    }
  }
  return readToken(ticket);
}
