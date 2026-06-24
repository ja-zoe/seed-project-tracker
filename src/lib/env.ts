/**
 * Small helpers for reading environment configuration.
 */

/** Allowed sign-in email domains, parsed from ALLOWED_EMAIL_DOMAINS. */
export function allowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/** Is the given email within an allowed domain? Empty allow-list = allow all. */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const domains = allowedDomains();
  if (domains.length === 0) return true; // no restriction configured
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && domains.includes(domain);
}

export function pmAdminEmail(): string | null {
  return process.env.PM_ADMIN_EMAIL?.toLowerCase().trim() || null;
}
