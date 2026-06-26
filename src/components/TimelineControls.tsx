"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import type { TimelineStatus } from "@prisma/client";
import { TIMELINE_STATUS_LABEL } from "@/lib/format";

const ORDER: TimelineStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETE"];

function Select({ value, disabled }: { value: TimelineStatus; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <select
      name="status"
      defaultValue={value}
      disabled={disabled || pending}
      aria-busy={pending}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="select"
      style={{ fontSize: 12, padding: "4px 8px", height: "auto", width: "auto", opacity: pending ? 0.6 : 1 }}
      aria-label="Status"
    >
      {ORDER.map((s) => (
        <option key={s} value={s}>
          {TIMELINE_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

/**
 * Inline status dropdown that submits its bound server action on change. Used on
 * deliverables and subtasks so a quick status change is one click — and the
 * assignee of a subtask can update their own progress.
 */
export function StatusSelect({
  action,
  value,
  disabled = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  value: TimelineStatus;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={action} ref={ref}>
      <Select value={value} disabled={disabled} />
    </form>
  );
}
