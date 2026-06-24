import Link from "next/link";
import { Permission, ProjectStatus } from "@prisma/client";
import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { blockerFrequency, goalCompletionSeries } from "@/lib/stats";
import { STATUS_CHART_COLOR, STATUS_LABEL } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader, Section, StatCard } from "@/components/ui";
import { GoalCompletionChart, BlockerFrequencyChart, CategoryBarChart } from "@/components/charts";

/**
 * Monthly review (§5.7). Auto-answers the four monthly questions and visualizes
 * club-wide trends. Gated by VIEW_MONTHLY_REVIEW.
 */
export default async function ReviewPage() {
  await requirePermission(Permission.VIEW_MONTHLY_REVIEW);

  const [projects, meetings, statusUpdates] = await Promise.all([
    prisma.project.findMany({
      include: { meetingRecords: { orderBy: { meetingDate: "desc" }, select: { goalMet: true, meetingDate: true, keyBlockers: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.meetingRecord.findMany({ select: { meetingDate: true, goalMet: true, keyBlockers: true }, orderBy: { meetingDate: "asc" } }),
    prisma.statusUpdate.findMany({ select: { blockers: true, needsHelp: true, helpNeeded: true } }),
  ]);

  // Q1 — projects that missed goals multiple weeks in a row.
  const missedStreaks = projects
    .map((p) => {
      let streak = 0;
      for (const m of p.meetingRecords) {
        if (m.goalMet === false) streak++;
        else break;
      }
      return { id: p.id, name: p.name, status: p.status, streak };
    })
    .filter((p) => p.streak >= 2)
    .sort((a, b) => b.streak - a.streak);

  // Q2 — most common blockers across projects (status updates + meeting records).
  const blockerData = blockerFrequency([
    ...statusUpdates.map((s) => s.blockers),
    ...meetings.map((m) => m.keyBlockers),
  ]);

  // Q3 — recurring resource / skill gaps (from "help needed" text).
  const gapsData = blockerFrequency(statusUpdates.filter((s) => s.needsHelp).map((s) => s.helpNeeded));

  // Q4 — projects that might need a priority shift (Behind or At Risk).
  const priorityShift = projects.filter((p) => p.status !== ProjectStatus.ON_TRACK);

  const series = goalCompletionSeries(meetings);
  const healthDist = (["ON_TRACK", "AT_RISK", "BEHIND"] as const).map((s) => ({
    label: STATUS_LABEL[s],
    value: projects.filter((p) => p.status === s).length,
    color: STATUS_CHART_COLOR[s],
  }));

  return (
    <>
      <PageHeader title="Monthly review" description="The four monthly questions, auto-answered from this semester's data." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Missing goals 2+ wks" value={missedStreaks.length} />
        <StatCard label="Need priority shift" value={priorityShift.length} />
        <StatCard label="Distinct blockers" value={blockerData.length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <Section title="Q1 · Missed goals multiple weeks in a row">
          {missedStreaks.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>No project has missed its goal 2+ weeks running. 🌱</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {missedStreaks.map((p) => (
                <li key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <Link href={`/projects/${p.id}`} className="heading-text" style={{ fontWeight: 500 }}>{p.name}</Link>
                  <span className="badge badge-behind">{p.streak} weeks</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Q2 · Most common blockers">
          <BlockerFrequencyChart data={blockerData} />
        </Section>

        <Section title="Q3 · Recurring resource / skill gaps">
          <BlockerFrequencyChart data={gapsData} />
        </Section>

        <Section title="Q4 · Projects that may need a priority shift">
          {priorityShift.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>Everything is on track. 🌳</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {priorityShift.map((p) => (
                <li key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <Link href={`/projects/${p.id}`} className="heading-text" style={{ fontWeight: 500 }}>{p.name}</Link>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Goal completion over the semester">
          <GoalCompletionChart data={series} />
        </Section>

        <Section title="Project health distribution">
          <CategoryBarChart data={healthDist} />
        </Section>
      </div>
    </>
  );
}
