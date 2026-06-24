"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/** Submit button that disables + relabels itself while the action is pending. */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "brand",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "brand" | "secondary" | "danger" | "success" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant} ${className}`} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Default to next Friday — a sensible meeting date for the weekly cadence. */
function nextFriday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

/**
 * Pre-meeting status update form (§5.1) — mirrors the club's five required
 * fields, plus the "do you need help?" toggle. Works for a fixed project
 * (detail page) or with a project picker (the standalone /status/new page).
 */
export function StatusUpdateForm({
  action,
  projects,
  fixedProjectId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  projects: { id: string; name: string }[];
  fixedProjectId?: string;
}) {
  const [needsHelp, setNeedsHelp] = useState(false);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {fixedProjectId ? (
        <input type="hidden" name="projectId" value={fixedProjectId} />
      ) : (
        <div>
          <label className="label" htmlFor="projectId">Project</label>
          <select id="projectId" name="projectId" className="select" required defaultValue="">
            <option value="" disabled>Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="meetingDate">Meeting / week</label>
        <input id="meetingDate" name="meetingDate" type="date" className="input" required defaultValue={nextFriday()} />
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Submit at least 24h before the meeting — later submissions are still accepted but marked late.
        </p>
      </div>

      <Field id="plannedWork" label="Planned work for this week" placeholder="What did you plan to do?" />
      <Field id="actualProgress" label="Actual progress" placeholder="What got done / what didn't?" />
      <Field id="blockers" label="Blockers" placeholder="What's getting in the way? (one per line helps the blocker chart)" />
      <Field id="nextWeekGoals" label="Next week's goals" placeholder="What will you commit to next week?" />

      <div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" name="needsHelp" checked={needsHelp} onChange={(e) => setNeedsHelp(e.target.checked)} />
          <span className="label" style={{ margin: 0 }}>I need help</span>
        </label>
        {needsHelp && (
          <textarea name="helpNeeded" className="textarea" style={{ marginTop: 10 }} placeholder="What do you need help with?" />
        )}
      </div>

      <div>
        <SubmitButton pendingLabel="Submitting…">Submit status update</SubmitButton>
      </div>
    </form>
  );
}

function Field({ id, label, placeholder }: { id: string; label: string; placeholder: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <textarea id={id} name={id} className="textarea" required placeholder={placeholder} />
    </div>
  );
}

/**
 * Post-meeting tracking form (§5.2) — PM records status, whether the weekly
 * goal was met, blockers, and notes after the meeting.
 */
export function TrackingForm({
  action,
  projectId,
  defaultStatus,
}: {
  action: (formData: FormData) => void | Promise<void>;
  projectId: string;
  defaultStatus: "ON_TRACK" | "AT_RISK" | "BEHIND";
}) {
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="projectId" value={projectId} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label className="label" htmlFor="meetingDate">Meeting date</label>
          <input id="meetingDate" name="meetingDate" type="date" className="input" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="label" htmlFor="status">Project status</label>
          <select id="status" name="status" className="select" defaultValue={defaultStatus}>
            <option value="ON_TRACK">On Track</option>
            <option value="AT_RISK">At Risk</option>
            <option value="BEHIND">Behind</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="goalMet">Weekly goal met?</label>
        <select id="goalMet" name="goalMet" className="select" defaultValue="yes">
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="na">Not recorded</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="keyBlockers">Key blockers</label>
        <textarea id="keyBlockers" name="keyBlockers" className="textarea" placeholder="Top blockers raised at the meeting" />
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" className="textarea" placeholder="Anything else worth recording" />
      </div>
      <div>
        <SubmitButton pendingLabel="Recording…">Save tracking</SubmitButton>
      </div>
    </form>
  );
}
