import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fmtDeadline } from "@/lib/format";
import { PageHeader, Section, EmptyState } from "@/components/ui";
import { TimelineStatusBadge } from "@/components/StatusBadge";
import { StatusSelect } from "@/components/TimelineControls";
import { subtaskStatusAction } from "../projects/actions";

/**
 * General-member home: the action items / subtasks assigned to me. The rest of
 * the app (dashboard, project pages) is the read-only context; this page is the
 * single place a member sees what's theirs to do and can update their progress.
 */
export default async function MyTasksPage() {
  const user = await requireUser();

  const [subtasks, actionItems] = await Promise.all([
    prisma.subtask.findMany({
      where: { assigneeId: user.id },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      include: {
        deliverable: { select: { title: true, project: { select: { id: true, name: true } } } },
      },
    }),
    prisma.actionItem.findMany({
      where: { ownerId: user.id },
      orderBy: [{ status: "asc" }, { deadline: "asc" }],
      include: { project: { select: { id: true, name: true } } },
    }),
  ]);

  const openSubtasks = subtasks.filter((s) => s.status !== "COMPLETE");
  const doneSubtasks = subtasks.filter((s) => s.status === "COMPLETE");
  const openActionItems = actionItems.filter((a) => a.status === "OPEN");

  return (
    <>
      <PageHeader
        eyebrow="My work"
        title="My tasks"
        description="Everything assigned to you across projects. Update your status here; the project dashboards stay read-only context."
      />

      {subtasks.length === 0 && actionItems.length === 0 ? (
        <EmptyState
          title="Nothing assigned yet"
          description="When a lead assigns you a timeline subtask or an action item, it'll show up here."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Section title={`Timeline subtasks · ${openSubtasks.length} open`}>
            {openSubtasks.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>No open subtasks. Nice.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {openSubtasks.map((s) => (
                  <li key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p className="heading-text" style={{ fontWeight: 500 }}>{s.title}</p>
                      {s.description && <p className="muted" style={{ fontSize: 12, marginTop: 2, whiteSpace: "pre-wrap" }}>{s.description}</p>}
                      <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        <Link href={`/projects/${s.deliverable.project.id}`} style={{ textDecoration: "underline" }}>{s.deliverable.project.name}</Link>
                        {" · "}{s.deliverable.title}{" · "}{fmtDeadline(s.dueDate)}
                      </p>
                    </div>
                    <StatusSelect action={subtaskStatusAction.bind(null, s.id)} value={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {openActionItems.length > 0 && (
            <Section title={`Action items · ${openActionItems.length} open`}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {openActionItems.map((a) => (
                  <li key={a.id} style={{ fontSize: 14 }}>
                    <p className="heading-text" style={{ fontWeight: 500 }}>{a.description}</p>
                    <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      <Link href={`/projects/${a.project.id}`} style={{ textDecoration: "underline" }}>{a.project.name}</Link>
                      {" · "}{fmtDeadline(a.deadline)}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {doneSubtasks.length > 0 && (
            <Section title={`Completed subtasks · ${doneSubtasks.length}`}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {doneSubtasks.slice(0, 20).map((s) => (
                  <li key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, opacity: 0.65 }}>
                    <span style={{ textDecoration: "line-through" }}>{s.title}</span>
                    <TimelineStatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </>
  );
}
