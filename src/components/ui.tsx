import Link from "next/link";

/** Page title + optional description and right-aligned actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
      <div>
        <h1 style={{ marginBottom: description ? 6 : 0 }}>{title}</h1>
        {description && <p className="muted" style={{ maxWidth: 640 }}>{description}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

/** A small stat tile. */
export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="glass glass-card">
      <p className="muted" style={{ fontSize: 13 }}>{label}</p>
      <p className="heading-text" style={{ fontSize: 28, fontWeight: 600, margin: "4px 0 0" }}>{value}</p>
      {hint && <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{hint}</p>}
    </div>
  );
}

/** Friendly empty state. */
export function EmptyState({ icon = "🌿", title, description, action }: { icon?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="glass glass-card" style={{ textAlign: "center", padding: 40 }}>
      <div aria-hidden style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <h3 style={{ fontSize: 18 }}>{title}</h3>
      {description && <p className="muted" style={{ maxWidth: 420, margin: "6px auto 0" }}>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/** Thin progress bar (milestone completion etc.). */
export function ProgressBar({ value, color = "var(--moss)" }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div style={{ background: "var(--glass-border)", borderRadius: 9999, height: 8, overflow: "hidden" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 9999, transition: "width 300ms ease" }} />
    </div>
  );
}

/** Card wrapper with a heading. */
export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="glass glass-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LinkButton({ href, children, variant = "secondary" }: { href: string; children: React.ReactNode; variant?: "brand" | "secondary" | "ghost" }) {
  return (
    <Link href={href} className={`btn btn-${variant}`}>
      {children}
    </Link>
  );
}
