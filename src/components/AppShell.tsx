"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

/**
 * App chrome: glass sidebar + top bar with a responsive (mobile) drawer.
 * Pure presentation — nav items are computed server-side from permissions and
 * passed in, so the sidebar only ever shows links the user is allowed to use.
 */
export function AppShell({
  groups,
  user,
  unreadCount,
  signOutAction,
  children,
}: {
  groups: { heading?: string; items: NavItem[] }[];
  user: { name?: string | null; email?: string | null; roleName: string | null };
  unreadCount: number;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const sidebar = (
    <nav className="glass" style={{ width: 256, height: "100%", borderRadius: 0 }} aria-label="Main">
      <div style={{ padding: "16px 12px", display: "flex", flexDirection: "column", height: "100%" }}>
        <Link href="/dashboard" className="nav-item" style={{ fontWeight: 600, marginBottom: 8 }} onClick={() => setOpen(false)}>
          <span aria-hidden style={{ fontSize: 20 }}>🌱</span>
          <span className="heading-text">SEED Tracker</span>
        </Link>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {groups.map((g, gi) => (
            <div key={gi} style={{ marginTop: gi === 0 ? 8 : 16 }}>
              {g.heading && (
                <p className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", padding: "8px 12px 4px" }}>
                  {g.heading}
                </p>
              )}
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {g.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`nav-item ${isActive(item.href) ? "nav-item-active" : ""}`}
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      <span aria-hidden style={{ width: 20, textAlign: "center" }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider" style={{ margin: "12px 0" }} />
        <div style={{ padding: "0 8px" }}>
          <p className="heading-text" style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.name ?? user.email}
          </p>
          <p className="muted" style={{ fontSize: 12 }}>{user.roleName ?? "No role"}</p>
          <form action={signOutAction} style={{ marginTop: 10 }}>
            <button type="submit" className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start" }}>
              ↩ Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:block" style={{ position: "sticky", top: 0, height: "100vh" }}>
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden" style={{ position: "fixed", inset: 0, zIndex: 40 }}>
          <div onClick={() => setOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%" }}>{sidebar}</div>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          className="glass md:hidden"
          style={{ borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", position: "sticky", top: 0, zIndex: 30 }}
        >
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <span className="heading-text" style={{ fontWeight: 600 }}>🌱 SEED Tracker</span>
          <Link href="/notifications" className="btn btn-ghost btn-sm" aria-label="Notifications">
            🔔{unreadCount > 0 ? ` ${unreadCount}` : ""}
          </Link>
        </header>

        {/* Desktop top-right bell */}
        <div className="hidden md:flex" style={{ justifyContent: "flex-end", padding: "16px 24px 0" }}>
          <Link href="/notifications" className="btn btn-secondary btn-sm" aria-label="Notifications">
            🔔 Notifications{unreadCount > 0 ? ` · ${unreadCount}` : ""}
          </Link>
        </div>

        <main style={{ flex: 1, padding: "16px 24px 48px", maxWidth: 1200, width: "100%", margin: "0 auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
