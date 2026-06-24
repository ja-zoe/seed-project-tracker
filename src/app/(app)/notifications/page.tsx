import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import { markAllRead, markRead } from "./actions";

/** In-app notification inbox (§5.5). */
export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          hasUnread ? (
            <form action={markAllRead}>
              <button className="btn btn-secondary btn-sm">Mark all read</button>
            </form>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" description="Reminders and alerts will appear here." />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {notifications.map((n) => {
            const inner = (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <span className="heading-text" style={{ fontWeight: 500 }}>{n.title}</span>
                  {!n.read && <span className="badge badge-on-track" style={{ fontSize: 11 }}>New</span>}
                </div>
                {n.body && <p style={{ fontSize: 14, marginTop: 4 }}>{n.body}</p>}
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{fmtDateTime(n.createdAt)}</p>
              </>
            );
            return (
              <li key={n.id} className="glass glass-card" style={{ padding: 16, opacity: n.read ? 0.7 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    {n.link ? <Link href={n.link} style={{ display: "block" }}>{inner}</Link> : inner}
                  </div>
                  {!n.read && (
                    <form action={markRead.bind(null, n.id)}>
                      <button className="btn btn-ghost btn-sm" aria-label="Mark read">✓</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
