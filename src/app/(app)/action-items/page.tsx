import Link from "next/link";
import { Permission } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { projectVisibilityWhere } from "@/lib/queries";
import { fmtDeadline } from "@/lib/format";
import { PageHeader, Section, EmptyState } from "@/components/ui";
import { toggleActionItem } from "../projects/actions";

/**
 * Action item board (§5.6). Each lead sees their own open items plus (read-only)
 * those on other visible projects; PMs see and manage all. Carried-over items
 * are flagged.
 */
export default async function ActionItemsPage() {
  const user = await requireUser();

  const items = await prisma.actionItem.findMany({
    where: { project: projectVisibilityWhere(user) },
    orderBy: [{ status: "asc" }, { deadline: "asc" }],
    include: {
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  const mine = items.filter((a) => a.ownerId === user.id && a.status === "OPEN");
  const open = items.filter((a) => a.status === "OPEN");
  const done = items.filter((a) => a.status === "DONE");
  const canClose = can(user, Permission.CLOSE_ACTION_ITEMS);

  function Row({ a }: { a: (typeof items)[number] }) {
    const canToggle = a.ownerId === user.id || canClose;
    return (
      <li style={{ display: "flex", alignItems: "flex-start", gap: 10, opacity: a.status === "DONE" ? 0.6 : 1 }}>
        {canToggle ? (
          <form action={toggleActionItem.bind(null, a.id)}>
            <button className="btn btn-ghost btn-sm" style={{ padding: 4 }} aria-label="Toggle">{a.status === "DONE" ? "☑" : "☐"}</button>
          </form>
        ) : (
          <span aria-hidden style={{ padding: 4 }}>{a.status === "DONE" ? "☑" : "☐"}</span>
        )}
        <div style={{ flex: 1 }}>
          <p className="heading-text" style={{ textDecoration: a.status === "DONE" ? "line-through" : "none" }}>{a.description}</p>
          <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            <Link href={`/projects/${a.project.id}`} style={{ textDecoration: "underline" }}>{a.project.name}</Link>
            {" · "}{a.owner ? (a.owner.name ?? a.owner.email) : "Unassigned"}
            {" · "}{fmtDeadline(a.deadline)}
            {a.carriedOver && a.status === "OPEN" && <span className="badge badge-late" style={{ marginLeft: 8 }}>Carried over</span>}
          </p>
        </div>
      </li>
    );
  }

  return (
    <>
      <PageHeader title="Action items" description="Open commitments across the projects you can see." />

      {items.length === 0 ? (
        <EmptyState title="No action items" description="Action items created during meetings show up here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Section title={`Assigned to me · ${mine.length}`}>
            {mine.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>Nothing assigned to you. 🌱</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {mine.map((a) => <Row key={a.id} a={a} />)}
              </ul>
            )}
          </Section>

          <Section title={`All open · ${open.length}`}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {open.map((a) => <Row key={a.id} a={a} />)}
            </ul>
          </Section>

          {done.length > 0 && (
            <Section title={`Completed · ${done.length}`}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {done.slice(0, 20).map((a) => <Row key={a.id} a={a} />)}
              </ul>
            </Section>
          )}
        </div>
      )}
    </>
  );
}
