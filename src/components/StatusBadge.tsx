import type { ProjectStatus } from "@prisma/client";
import { STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/format";

/** A project-health pill (On Track / At Risk / Behind) in the earthy palette. */
export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`badge ${STATUS_BADGE_CLASS[status]}`}>
      <span className="badge-dot" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
