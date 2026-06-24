"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * Auto-submitting form. Used by the CAS callback page to invoke a server action
 * (which calls Auth.js `signIn`) immediately on load — `signIn` can only run in
 * a server action / route handler, not during render, so we bounce through a
 * tiny form that submits itself. Falls back to a manual button without JS.
 */
export function AutoSubmit({
  action,
  label = "Signing you in…",
}: {
  action: () => void | Promise<void>;
  label?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    ref.current?.requestSubmit();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="panel-light text-center" style={{ maxWidth: 360, padding: 32 }}>
        <Loader2 size={28} className="spin" style={{ color: "var(--on-track)", marginBottom: 10 }} aria-hidden />
        <p className="heading-text" style={{ fontWeight: 500 }}>{label}</p>
        <form ref={ref} action={action} style={{ marginTop: 16 }}>
          <noscript>
            <button type="submit" className="btn btn-brand">Continue</button>
          </noscript>
        </form>
      </div>
    </main>
  );
}
