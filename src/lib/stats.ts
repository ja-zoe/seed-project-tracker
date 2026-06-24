/**
 * Pure aggregation helpers for the dashboards and monthly review (§5.7, §5.9).
 * Kept free of Prisma so they're trivial to reason about and reuse.
 */

export function weekLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Milestone completion summary. */
export function milestoneProgress(milestones: { completed: boolean }[]) {
  const total = milestones.length;
  const completed = milestones.filter((m) => m.completed).length;
  return { completed, total, pct: total === 0 ? 0 : (completed / total) * 100 };
}

/**
 * Weekly goal-completion rate series from meeting records. Groups by meeting
 * date and computes the % of goals met per week (records with goalMet=null are
 * ignored). Returns chronological [{week, pct}].
 */
export function goalCompletionSeries(
  meetings: { meetingDate: Date; goalMet: boolean | null }[],
): { week: string; pct: number }[] {
  const byDay = new Map<string, { met: number; total: number; date: Date }>();
  for (const m of meetings) {
    if (m.goalMet === null) continue;
    const key = m.meetingDate.toISOString().slice(0, 10);
    const bucket = byDay.get(key) ?? { met: 0, total: 0, date: m.meetingDate };
    bucket.total += 1;
    if (m.goalMet) bucket.met += 1;
    byDay.set(key, bucket);
  }
  return [...byDay.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => ({ week: weekLabel(b.date), pct: Math.round((b.met / b.total) * 100) }));
}

/**
 * Count recurring blockers across free-text fields. Splits on newlines / commas
 * / semicolons, normalizes, and tallies. Naive but useful for surfacing the
 * "most common blockers" monthly question without an NLP dependency.
 */
export function blockerFrequency(texts: (string | null | undefined)[], limit = 8): { blocker: string; count: number }[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const raw of texts) {
    if (!raw) continue;
    const parts = raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && !/^(none|n\/a|na|-)$/i.test(s));
    for (const p of parts) {
      const key = p.toLowerCase();
      const entry = counts.get(key) ?? { label: truncate(p), count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()]
    .filter((c) => c.count >= 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((c) => ({ blocker: c.label, count: c.count }));
}

function truncate(s: string, n = 32): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
