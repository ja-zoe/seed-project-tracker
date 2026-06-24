import Link from "next/link";
import { Leaf } from "lucide-react";

/** Page title (display serif) + optional eyebrow, description, and actions. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
      <div>
        {eyebrow && <p className="eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</p>}
        <h1 className="display" style={{ marginBottom: description ? 8 : 0 }}>{title}</h1>
        {description && <p className="muted" style={{ maxWidth: 640 }}>{description}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

/**
 * Metric tile. `dark` renders a focal bento panel (big display number, mono
 * label) — use these for the headline stats; light ones for secondary metrics.
 */
export function StatCard({
  label,
  value,
  hint,
  dark = false,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  dark?: boolean;
  accent?: string;
}) {
  return (
    <div className={dark ? "panel" : "panel-light"} style={{ padding: 22 }}>
      <p className="eyebrow">{label}</p>
      <p className="metric" style={{ fontSize: 44, margin: "10px 0 0", color: accent ?? (dark ? "var(--text-on-dark)" : "var(--text)") }}>
        {value}
      </p>
      {hint && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>{hint}</p>}
    </div>
  );
}

/** Friendly empty state. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-light" style={{ textAlign: "center", padding: 44 }}>
      <span style={{ display: "inline-flex", width: 48, height: 48, borderRadius: 16, background: "var(--on-track-tint)", color: "var(--on-track)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        {icon ?? <Leaf size={24} />}
      </span>
      <h3 style={{ fontSize: 18 }}>{title}</h3>
      {description && <p className="muted" style={{ maxWidth: 420, margin: "6px auto 0" }}>{description}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

/** Thin progress bar. */
export function ProgressBar({ value, color = "var(--on-track)" }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div style={{ background: "var(--border-soft)", borderRadius: 9999, height: 7, overflow: "hidden" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 9999, transition: "width 400ms cubic-bezier(0.22,1,0.36,1)" }} />
    </div>
  );
}

/** Light content card with a mono eyebrow heading. */
export function Section({
  title,
  children,
  action,
  dark = false,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <section className={dark ? "panel" : "panel-light"}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <h2 className="eyebrow" style={{ fontSize: 12 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LinkButton({
  href,
  children,
  variant = "secondary",
  prefetch,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "accent" | "secondary" | "ghost";
  prefetch?: boolean;
}) {
  return (
    <Link href={href} prefetch={prefetch} className={`btn btn-${variant}`}>
      {children}
    </Link>
  );
}
