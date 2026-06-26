import type { ProjectStatus, TimelineStatus } from "@prisma/client";
import { CircleCheck, TriangleAlert, Flag } from "lucide-react";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  TIMELINE_STATUS_BADGE_CLASS,
  TIMELINE_STATUS_LABEL,
} from "@/lib/format";

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

/** Timeline status pill for deliverables & subtasks. */
export function TimelineStatusBadge({ status }: { status: TimelineStatus }) {
  return (
    <span className={`badge ${TIMELINE_STATUS_BADGE_CLASS[status]}`}>
      {TIMELINE_STATUS_LABEL[status]}
    </span>
  );
}
