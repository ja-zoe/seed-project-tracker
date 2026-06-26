import { Loader2 } from "lucide-react";

/**
 * Full-area loading placeholder shown by route-level `loading.tsx` files while a
 * server component streams in — e.g. the hand-off into the dashboard right after
 * sign-in, so the transition isn't a blank pause.
 */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "80px 0", minHeight: "50vh" }}>
      <Loader2 size={30} className="spin" style={{ color: "var(--on-track)" }} aria-hidden />
      <p className="muted" style={{ fontSize: 14 }} role="status">{label}</p>
    </div>
  );
}
