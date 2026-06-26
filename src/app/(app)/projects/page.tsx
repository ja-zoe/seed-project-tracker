import Link from "next/link";
import { Crown } from "lucide-react";
import { Permission } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getVisibleProjects } from "@/lib/queries";
import { deliverableProgress } from "@/lib/stats";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader, EmptyState, ProgressBar, LinkButton } from "@/components/ui";

/** All-projects view. Read-only for non-leads; everyone sees what they're allowed to. */
export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await getVisibleProjects(user);
  const canCreate = can(user, Permission.MANAGE_PROJECTS);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        description="Every project you can see. Leads can edit their own; the rest is read-only."
        actions={canCreate ? <LinkButton href="/projects/new" variant="primary">+ New project</LinkButton> : null}
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description={canCreate ? "Create the first project to begin tracking the semester." : "You haven't been assigned to a project yet."}
          action={canCreate ? <LinkButton href="/projects/new" variant="primary">+ New project</LinkButton> : undefined}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {projects.map((p) => {
            const mp = deliverableProgress(p.deliverables);
            const leadList = p.assignments.filter((a) => a.role === "LEAD");
            const leads = leadList.map((a) => a.user.name ?? a.user.email).join(", ");
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="panel-light lift" style={{ display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <h3 style={{ fontSize: 18, margin: 0 }}>{p.name}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 0", flexWrap: "wrap" }}>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>{p.semester}</p>
                  {p.viewerIsLead ? (
                    <span className="badge badge-on-track" title="You lead this project"><Crown size={12} /> You lead</span>
                  ) : (
                    <span className="badge badge-neutral">View only</span>
                  )}
                </div>
                {p.description && (
                  <p style={{ fontSize: 14, marginTop: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {p.description}
                  </p>
                )}
                <div style={{ marginTop: 14 }}>
                  <div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span>{mp.completed}/{mp.total} deliverables</span>
                    <span>{p._count.actionItems} open</span>
                  </div>
                  <ProgressBar value={mp.pct} />
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                  {leads ? `Leads: ${leads}` : "No leads assigned"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
