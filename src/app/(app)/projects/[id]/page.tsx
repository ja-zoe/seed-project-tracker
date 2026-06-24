import { notFound } from "next/navigation";
import { Permission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can, canEditProject } from "@/lib/permissions";
import { canViewProject, isAssignedTo } from "@/lib/queries";
import { milestoneProgress } from "@/lib/stats";
import { fmtDate, fmtDateTime, fmtDeadline, STATUS_LABEL } from "@/lib/format";
import { Flag, CheckCircle2, Circle, Trash2, CheckCheck } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Section, ProgressBar, EmptyState } from "@/components/ui";
import { StatusUpdateForm, TrackingForm, SubmitButton } from "@/components/forms";
import {
  addMilestone,
  toggleMilestone,
  deleteMilestone,
  submitStatusUpdate,
  recordMeeting,
  createActionItem,
  toggleActionItem,
  deleteActionItem,
  overrideProjectStatus,
  saveCorrectivePlan,
} from "../actions";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string; tracked?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();

  if (!(await canViewProject(user, id))) notFound();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      milestones: { orderBy: { targetDate: "asc" } },
      statusUpdates: { orderBy: { meetingDate: "desc" }, include: { submittedBy: { select: { name: true, email: true } } }, take: 10 },
      meetingRecords: { orderBy: { meetingDate: "desc" }, include: { recordedBy: { select: { name: true, email: true } } }, take: 10 },
      actionItems: { orderBy: [{ status: "asc" }, { deadline: "asc" }], include: { owner: { select: { name: true, email: true } } } },
    },
  });
  if (!project) notFound();

  const assigned = await isAssignedTo(user.id, id);
  const canEdit = canEditProject(user, assigned);
  const isManager = can(user, Permission.MANAGE_PROJECTS);
  const canTrack = can(user, Permission.POST_MEETING_TRACKING);
  const canSubmit = can(user, Permission.SUBMIT_STATUS_UPDATES) && (assigned || isManager);
  const canAssign = can(user, Permission.ASSIGN_ACTION_ITEMS);

  const mp = milestoneProgress(project.milestones);
  const leads = project.assignments.map((a) => a.user);
  const openItems = project.actionItems.filter((a) => a.status === "OPEN");
  const doneItems = project.actionItems.filter((a) => a.status === "DONE");

  // Inline server action so the corrective-plan textarea can post its content.
  async function savePlan(formData: FormData) {
    "use server";
    await saveCorrectivePlan(id, String(formData.get("plan") ?? ""));
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>{project.semester}</p>
          <h1 className="display" style={{ marginBottom: 6 }}>{project.name}</h1>
          <p className="muted">{leads.length ? `Led by ${leads.map((l) => l.name ?? l.email).join(", ")}` : "No leads assigned"}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <StatusBadge status={project.status} />
          {project.statusOverride && <span className="badge badge-neutral">Manual override</span>}
        </div>
      </div>
      {project.description && <p style={{ maxWidth: 720, marginBottom: 16 }}>{project.description}</p>}

      {/* Toast-ish confirmations */}
      {sp.submitted && <Banner>Status update submitted.</Banner>}
      {sp.tracked && <Banner>Meeting tracking saved.</Banner>}

      {/* Red-flag corrective action plan (§5.3) */}
      {project.status === "BEHIND" && (
        <div className="panel-light" style={{ borderColor: "var(--behind)", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, color: "var(--behind)", display: "flex", alignItems: "center", gap: 8 }}><Flag size={18} /> Corrective action plan required</h2>
          <p className="muted" style={{ marginTop: 4 }}>This project is flagged Behind. Document how it will get back on track.</p>
          {canEdit ? (
            <form action={savePlan} style={{ marginTop: 12 }}>
              <textarea name="plan" className="textarea" defaultValue={project.correctiveActionPlan ?? ""} placeholder="What's the recovery plan? Who owns it, and by when?" />
              <div style={{ marginTop: 10 }}>
                <SubmitButton variant="danger" pendingLabel="Saving…">Save plan</SubmitButton>
              </div>
            </form>
          ) : (
            <p style={{ marginTop: 10 }}>{project.correctiveActionPlan || <span className="muted">No plan documented yet.</span>}</p>
          )}
        </div>
      )}

      {/* Status override controls */}
      {canEdit && (
        <div className="panel-light" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>Status</h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                Override the auto-detected status, or hand control back to auto-detection.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["ON_TRACK", "AT_RISK", "BEHIND"] as const).map((s) => (
                <form key={s} action={overrideProjectStatus.bind(null, id, s)}>
                  <button className={`btn btn-sm ${project.status === s && project.statusOverride ? "btn-brand" : "btn-secondary"}`}>
                    {STATUS_LABEL[s]}
                  </button>
                </form>
              ))}
              {project.statusOverride && (
                <form action={overrideProjectStatus.bind(null, id, null)}>
                  <button className="btn btn-sm btn-ghost">Auto-detect</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }} className="detail-grid">
        {/* LEFT: milestones + action items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Section title={`Milestones · ${mp.completed}/${mp.total}`}>
            <div style={{ marginBottom: 14 }}><ProgressBar value={mp.pct} /></div>
            {project.milestones.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>No milestones defined. This is the semester plan progress is measured against.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {project.milestones.map((m) => {
                  const overdue = !m.completed && m.targetDate.getTime() < Date.now();
                  return (
                    <li key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {canEdit ? (
                        <form action={toggleMilestone.bind(null, m.id)}>
                          <button className="btn btn-ghost btn-icon btn-sm" aria-label="Toggle milestone" style={{ color: m.completed ? "var(--on-track)" : "var(--text-faint)" }}>
                            {m.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                        </form>
                      ) : (
                        <span aria-hidden style={{ color: m.completed ? "var(--on-track)" : "var(--text-faint)", display: "inline-flex", padding: 8 }}>
                          {m.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </span>
                      )}
                      <div style={{ flex: 1 }}>
                        <span className="heading-text" style={{ textDecoration: m.completed ? "line-through" : "none" }}>{m.title}</span>
                        <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                          {m.completed ? `Done ${fmtDate(m.completedDate)}` : `Target ${fmtDate(m.targetDate)}`}
                        </span>
                        {overdue && <span className="badge badge-behind" style={{ marginLeft: 8 }}>Overdue</span>}
                      </div>
                      {canEdit && (
                        <form action={deleteMilestone.bind(null, m.id)}>
                          <button className="btn btn-ghost btn-icon btn-sm faint" aria-label="Delete milestone"><Trash2 size={15} /></button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {canEdit && (
              <form action={addMilestone.bind(null, id)} style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <input name="title" className="input" placeholder="New milestone" required style={{ flex: 2, minWidth: 160 }} />
                <input name="targetDate" type="date" className="input" required style={{ flex: 1, minWidth: 140 }} />
                <SubmitButton variant="secondary" pendingLabel="Adding…">Add</SubmitButton>
              </form>
            )}
          </Section>

          <Section title={`Action items · ${openItems.length} open`}>
            {project.actionItems.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>No action items yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {[...openItems, ...doneItems].map((a) => {
                  const canToggle = a.ownerId === user.id || can(user, Permission.CLOSE_ACTION_ITEMS);
                  return (
                    <li key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, opacity: a.status === "DONE" ? 0.6 : 1 }}>
                      {canToggle ? (
                        <form action={toggleActionItem.bind(null, a.id)}>
                          <button className="btn btn-ghost btn-icon btn-sm" aria-label="Toggle action item" style={{ color: a.status === "DONE" ? "var(--on-track)" : "var(--text-faint)" }}>{a.status === "DONE" ? <CheckCircle2 size={18} /> : <Circle size={18} />}</button>
                        </form>
                      ) : (
                        <span aria-hidden style={{ color: a.status === "DONE" ? "var(--on-track)" : "var(--text-faint)", display: "inline-flex", padding: 8 }}>{a.status === "DONE" ? <CheckCircle2 size={18} /> : <Circle size={18} />}</span>
                      )}
                      <div style={{ flex: 1 }}>
                        <p className="heading-text" style={{ textDecoration: a.status === "DONE" ? "line-through" : "none" }}>{a.description}</p>
                        <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {a.owner ? (a.owner.name ?? a.owner.email) : "Unassigned"} · {fmtDeadline(a.deadline)}
                          {a.carriedOver && a.status === "OPEN" && <span className="badge badge-late" style={{ marginLeft: 8 }}>Carried over</span>}
                        </p>
                      </div>
                      {canAssign && (
                        <form action={deleteActionItem.bind(null, a.id)}>
                          <button className="btn btn-ghost btn-icon btn-sm faint" aria-label="Delete action item"><Trash2 size={15} /></button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {canAssign && (
              <form action={createActionItem} style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="hidden" name="projectId" value={id} />
                <input name="description" className="input" placeholder="New action item" required />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select name="ownerId" className="select" defaultValue="" style={{ flex: 1, minWidth: 140 }}>
                    <option value="">Unassigned</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>{l.name ?? l.email}</option>
                    ))}
                  </select>
                  <input name="deadline" type="date" className="input" style={{ flex: 1, minWidth: 140 }} />
                  <SubmitButton variant="secondary" pendingLabel="Adding…">Add</SubmitButton>
                </div>
              </form>
            )}
          </Section>
        </div>

        {/* RIGHT: weekly loop + history */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {canSubmit && (
            <Section title="Submit status update">
              <StatusUpdateForm action={submitStatusUpdate} projects={[{ id: project.id, name: project.name }]} fixedProjectId={project.id} />
            </Section>
          )}

          {canTrack && (
            <Section title="Post-meeting tracking">
              <TrackingForm action={recordMeeting} projectId={project.id} defaultStatus={project.status} />
            </Section>
          )}

          {/* Audit trail (§5.8) */}
          <Section title="Status update history">
            {project.statusUpdates.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>No submissions yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {project.statusUpdates.map((s) => (
                  <li key={s.id} style={{ borderLeft: "2px solid var(--glass-border)", paddingLeft: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <span className="heading-text" style={{ fontWeight: 500, fontSize: 14 }}>Week of {fmtDate(s.meetingDate)}</span>
                      {s.isLate && <span className="badge badge-late">Late</span>}
                    </div>
                    <p className="muted" style={{ fontSize: 12 }}>{s.submittedBy.name ?? s.submittedBy.email} · {fmtDateTime(s.submittedAt)}</p>
                    <dl style={{ margin: "6px 0 0", fontSize: 13 }}>
                      <HistoryRow label="Progress" value={s.actualProgress} />
                      <HistoryRow label="Blockers" value={s.blockers} />
                      <HistoryRow label="Next week" value={s.nextWeekGoals} />
                      {s.needsHelp && <HistoryRow label="Help needed" value={s.helpNeeded ?? "Yes"} />}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Tracking history">
            {project.meetingRecords.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>No meetings recorded yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {project.meetingRecords.map((m) => (
                  <li key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14 }}>
                    <div>
                      <span className="heading-text">{fmtDate(m.meetingDate)}</span>
                      <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                        Goal {m.goalMet === null ? "—" : m.goalMet ? "met" : "missed"}
                      </span>
                      {m.keyBlockers && <p className="muted" style={{ fontSize: 12 }}>{m.keyBlockers}</p>}
                    </div>
                    <StatusBadge status={m.status} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

function HistoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
      <dt className="muted" style={{ minWidth: 86 }}>{label}</dt>
      <dd style={{ margin: 0, whiteSpace: "pre-wrap" }}>{value}</dd>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel-light" style={{ borderColor: "var(--on-track)", marginBottom: 16, padding: 12 }}>
      <span style={{ color: "var(--on-track)", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
        <CheckCheck size={16} /> {children}
      </span>
    </div>
  );
}
