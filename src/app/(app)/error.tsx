"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Error boundary for the authenticated app. A transient session/DB blip during
 * server render (e.g. the Supabase pooler dropping a cold connection) used to
 * surface as a raw 500 that a manual refresh "fixed". This catches it and offers
 * a one-tap retry instead — `reset()` re-renders the segment, and we also push a
 * router refresh so a fresh request re-reads the session cleanly.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    // Surface for observability without leaking details to the user.
    console.error("[app] render error:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="panel-light text-center" style={{ maxWidth: 420, padding: 32 }}>
        <span
          aria-hidden
          style={{ display: "inline-flex", width: 48, height: 48, borderRadius: 16, background: "var(--at-risk-tint)", color: "var(--at-risk)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}
        >
          <AlertTriangle size={24} />
        </span>
        <h1 style={{ fontSize: 20 }}>Something hiccupped</h1>
        <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          We couldn&apos;t load this page just now — usually a momentary connection blip. Try again.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
          <button
            type="button"
            className="btn btn-brand"
            onClick={() => {
              reset();
              router.refresh();
            }}
          >
            <RotateCw /> Retry
          </button>
        </div>
      </div>
    </main>
  );
}
