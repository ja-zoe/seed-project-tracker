import { Permission, TriggerType, Channel, RecipientGroup } from "@prisma/client";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/health";
import { prisma } from "@/lib/prisma";
import { PageHeader, Section } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { updateSettings, createRule, toggleRule, deleteRule } from "../actions";

const TRIGGER_LABEL: Record<TriggerType, string> = {
  MISSING_SUBMISSION: "Missing submission",
  PROJECT_BEHIND: "Project flagged Behind",
  ACTION_ITEM_DUE: "Action item due",
  GOAL_MISSED: "Weekly goal missed",
};
const CHANNEL_LABEL: Record<Channel, string> = { EMAIL: "Email", IN_APP: "In-app", BOTH: "Email + in-app" };
const RECIPIENT_LABEL: Record<RecipientGroup, string> = {
  PM: "Project Manager",
  PROJECT_LEADS: "Project leads",
  ACTION_OWNER: "Action item owner",
  ALL_ACTIVE: "All active members",
};

/** Notification & trigger settings (§5.3, §5.5, CONFIGURE_NOTIFICATIONS). */
export default async function NotificationSettingsPage() {
  await requirePermission(Permission.CONFIGURE_NOTIFICATIONS);
  const [settings, rules] = await Promise.all([
    getSettings(),
    prisma.notificationRule.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Notifications & triggers" description="One place to manage the red-flag thresholds and every notification rule." />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Red-flag thresholds (§5.3) */}
        <Section title="Red-flag auto-detection">
          <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>
            A project is flagged <strong>Behind</strong> when these conditions are met. The submission
            deadline controls when a status update is marked late.
          </p>
          <form action={updateSettings} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, alignItems: "end" }}>
            <div>
              <label className="label" htmlFor="weeksBehindMilestone">Weeks behind a milestone</label>
              <input id="weeksBehindMilestone" name="weeksBehindMilestone" type="number" min={0} max={12} className="input" defaultValue={settings.weeksBehindMilestone} />
            </div>
            <div>
              <label className="label" htmlFor="missedGoalsInARow">Missed goals in a row</label>
              <input id="missedGoalsInARow" name="missedGoalsInARow" type="number" min={1} max={12} className="input" defaultValue={settings.missedGoalsInARow} />
            </div>
            <div>
              <label className="label" htmlFor="submissionDeadlineHours">Submission deadline (hours before)</label>
              <input id="submissionDeadlineHours" name="submissionDeadlineHours" type="number" min={1} max={336} className="input" defaultValue={settings.submissionDeadlineHours} />
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" name="requireBoth" defaultChecked={settings.requireBoth} />
                <span className="label" style={{ margin: 0 }}>Require BOTH conditions</span>
              </label>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Off = either condition flags Behind.</p>
            </div>
            <div><SubmitButton pendingLabel="Saving…">Save thresholds</SubmitButton></div>
          </form>
        </Section>

        {/* Notification rules (§5.5) */}
        <Section title={`Notification rules · ${rules.length}`}>
          {rules.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>No rules yet. Add one below.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {rules.map((r) => (
                <li key={r.id} className="panel-light" style={{ padding: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", opacity: r.enabled ? 1 : 0.55 }}>
                  <div>
                    <p className="heading-text" style={{ fontWeight: 500 }}>{r.name}</p>
                    <p className="muted" style={{ fontSize: 12 }}>
                      {TRIGGER_LABEL[r.triggerType]} · {RECIPIENT_LABEL[r.recipients]} · {CHANNEL_LABEL[r.channel]}
                      {r.thresholdHours != null && ` · ${r.thresholdHours}h before`}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <form action={toggleRule.bind(null, r.id)}>
                      <button className={`btn btn-sm ${r.enabled ? "btn-ghost" : "btn-success"}`}>{r.enabled ? "Disable" : "Enable"}</button>
                    </form>
                    <form action={deleteRule.bind(null, r.id)}>
                      <button className="btn btn-ghost btn-sm muted">Delete</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={createRule} style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "end" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="name">Rule name</label>
              <input id="name" name="name" className="input" required placeholder="e.g. Email PM when an item is overdue" />
            </div>
            <div>
              <label className="label" htmlFor="triggerType">Trigger</label>
              <select id="triggerType" name="triggerType" className="select" defaultValue="MISSING_SUBMISSION">
                {Object.entries(TRIGGER_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="recipients">Recipients</label>
              <select id="recipients" name="recipients" className="select" defaultValue="PROJECT_LEADS">
                {Object.entries(RECIPIENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="channel">Channel</label>
              <select id="channel" name="channel" className="select" defaultValue="BOTH">
                {Object.entries(CHANNEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="thresholdHours">Hours before</label>
              <input id="thresholdHours" name="thresholdHours" type="number" min={0} max={720} className="input" placeholder="24" />
            </div>
            <div><SubmitButton variant="secondary" pendingLabel="Adding…">Add rule</SubmitButton></div>
          </form>
        </Section>
      </div>
    </>
  );
}
