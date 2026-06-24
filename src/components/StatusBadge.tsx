import type { ProjectStatus } from "@prisma/client";
import { CircleCheck, TriangleAlert, Flag } from "lucide-react";
import { STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/format";

const ICON = {
  ON_TRACK: CircleCheck,
  AT_RISK: TriangleAlert,
  BEHIND: Flag,
} as const;

/** Project-health pill (On Track / At Risk / Behind) with a matching icon. */
export function StatusBadge({ status }: { status: ProjectStatus }) {
  const Icon = ICON[status];
  return (
    <span className={`badge ${STATUS_BADGE_CLASS[status]}`}>
      <Icon />
      {STATUS_LABEL[status]}
    </span>
  );
}
