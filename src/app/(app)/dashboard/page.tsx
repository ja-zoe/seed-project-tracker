import Link from "next/link";
import { Flag } from "lucide-react";
import { Permission } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getVisibleProjects } from "@/lib/queries";
import { milestoneProgress, goalCompletionSeries } from "@/lib/stats";
import { StatusBadge } from "@/components/StatusBadge";
import { GoalCompletionChart } from "@/components/charts";
import { PageHeader, StatCard, Section, EmptyState, ProgressBar, LinkButton } from "@/components/ui";
import { fmtDeadline } from "@/lib/format";

/**
 * Home dashboard. Adapts to the viewer:
 *  - A PM sees the all-projects health grid + flags.
 *  - A lead sees their projects, open action items, and a submit-status CTA.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const manager = can(user, Permission.MANAGE_PROJECTS);

  const [projects, myActionItems] = await Promise.all([
    getVisibleProjects(user),
    prisma.actionItem.findMany({
      where: { ownerId: user.id, status: "OPEN" },
      orderBy: [{ deadline: "asc" }],
      include: { project: { select: { id: true, name: true } } },
      take: 8,
    }),
  ]);

  // Goal-completion trend across the projects this user can see.
  const meetings = await prisma.meetingRecord.findMany({
    where: { projectId: { in: projects.map((p) => p.id) } },
    select: { meetingDate: true, goalMet: true },
    orderBy: { meetingDate: "asc" },
  });

  const flagged = projects.filter((p) => p.status === "BEHIND");
  const atRisk = projects.filter((p) => p.status === "AT_RISK");
  const series = goalCompletionSeries(meetings);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`Welcome, ${user.name?.split(" ")[0] ?? "there"}`}
        description={
          manager
            ? "Project health across the club at a glance. Flagged projects need attention first."
            : "Your projects and what needs your attention this week."
        }
        actions={
          can(user, Permission.SUBMIT_STATUS_UPDATES) ? (
            <LinkButton href="/status/new" variant="primary">
              + Submit status update
            </LinkButton>
          ) : null
        }
      />

      {/* Stat row — dark focal card leads, colored metrics for risk/behind */}
      <div className="reveal reveal-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard label="Projects" value={projects.length} dark />
        <StatCard label="On track" value={projects.filter((p) => p.status === "ON_TRACK").length} accent="var(--on-track)" />
        <StatCard label="At risk" value={atRisk.length} accent="var(--at-risk)" />
        <StatCard label="Behind" value={flagged.length} accent="var(--behind)" hint={flagged.length ? "Needs a corrective plan" : undefined} />
      </div>

      {/* Red-flag banner */}
      {flagged.length > 0 && (
        <div className="panel-light" style={{ borderColor: "var(--behind)", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, color: "var(--behind)", display: "flex", alignItems: "center", gap: 8 }}><Flag size={17} /> {flagged.length} project(s) flagged Behind</h2>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {flagged.map((p) => (
              <li key={p.id} style={{ marginBottom: 4 }}>
                <Link href={`/projects/${p.id}`} className="brand-text" style={{ textDecoration: "underline" }}>
                  {p.name}
                </Link>
                {!p.correctiveActionPlan && <span className="muted"> — corrective action plan needed</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }} className="dashboard-grid">
        {/* Projects health */}
        <Section
          title={manager ? "All projects" : "My projects"}
          action={<Link href="/projects" className="brand-text" style={{ fontSize: 14, textDecoration: "underline" }}>View all</Link>}
        >
          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description={manager ? "Create your first project to start tracking the semester." : "You haven't been assigned to a project yet."}
              action={manager ? <LinkButton href="/projects/new" variant="primary">+ New project</LinkButton> : undefined}
            />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.map((p) => {
                const mp = milestoneProgress(p.milestones);
                return (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="panel-light lift" style={{ display: "block", padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <span className="heading-text" style={{ fontWeight: 500 }}>{p.name}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }} className="muted">
                          <span>{mp.completed}/{mp.total} milestones</span>
                          <span>{p._count.actionItems} open action items</span>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <ProgressBar value={mp.pct} />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* My action items */}
          <Section title="My open action items">
            {myActionItems.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>Nothing assigned to you right now.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {myActionItems.map((a) => (
                  <li key={a.id} style={{ fontSize: 14 }}>
                    <Link href={`/projects/${a.project.id}`} className="heading-text" style={{ fontWeight: 500 }}>
                      {a.description}
                    </Link>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {a.project.name} · {fmtDeadline(a.deadline)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Goal completion trend">
            <GoalCompletionChart data={series} />
          </Section>
        </div>
      </div>
    </>
  );
}
