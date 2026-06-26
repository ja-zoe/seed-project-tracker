import type { Deliverable, Subtask } from "@prisma/client";
import { Plus, Pencil, Trash2, CalendarDays, User as UserIcon } from "lucide-react";
import { fmtDate, fmtDeadline } from "@/lib/format";
import { TimelineStatusBadge } from "@/components/StatusBadge";
import { StatusSelect } from "@/components/TimelineControls";
import { IconSubmit, SpinnerButton, LoadingLink } from "@/components/loading";
import {
  addDeliverable,
  updateDeliverable,
  deleteDeliverable,
  deliverableStatusAction,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  subtaskStatusAction,
} from "@/app/(app)/projects/actions";

type Member = { id: string; name: string | null; email: string };
type SubtaskWithAssignee = Subtask & { assignee: Member | null };
type DeliverableWithSubtasks = Deliverable & { subtasks: SubtaskWithAssignee[] };

const dateInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/**
 * The per-project semester timeline: two levels — major deliverables and the
 * subtasks needed to complete each. Editable by leads/PMs; a subtask's assignee
 * can update their own status. Exportable to a spreadsheet.
 */
export function Timeline({
  projectId,
  deliverables,
  members,
  canEdit,
  currentUserId,
}: {
  projectId: string;
  deliverables: DeliverableWithSubtasks[];
  members: Member[];
  canEdit: boolean;
  currentUserId: string;
}) {
  const done = deliverables.filter((d) => d.completed).length;

  return (
    <section className="panel-light">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h2 className="eyebrow" style={{ fontSize: 12 }}>Semester timeline</h2>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {deliverables.length} deliverable{deliverables.length === 1 ? "" : "s"} · {done} complete
          </p>
        </div>
        <LoadingLink href={`/projects/${projectId}/timeline/export`} variant="secondary" className="btn-sm">
          Export to spreadsheet
        </LoadingLink>
      </div>

      {deliverables.length === 0 ? (
        <p className="muted" style={{ fontSize: 14 }}>
          No deliverables yet. {canEdit ? "Add the first major milestone below." : "The timeline hasn't been set up yet."}
        </p>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {deliverables.map((d) => (
            <li key={d.id} className="panel-light" style={{ padding: 16 }}>
              {/* Deliverable header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="heading-text" style={{ fontWeight: 600, fontSize: 15, textDecoration: d.completed ? "line-through" : "none" }}>{d.title}</span>
                    <TimelineStatusBadge status={d.status} />
                  </div>
                  {d.description && <p className="muted" style={{ fontSize: 13, marginTop: 6, whiteSpace: "pre-wrap" }}>{d.description}</p>}
                  <p className="muted" style={{ fontSize: 12, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <CalendarDays size={13} />
                    {d.startDate ? `${fmtDate(d.startDate)} → ` : "Target "}{fmtDate(d.targetDate)}
                  </p>
                </div>
                {canEdit && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StatusSelect action={deliverableStatusAction.bind(null, d.id)} value={d.status} />
                    <form action={deleteDeliverable.bind(null, d.id)}>
                      <IconSubmit label="Delete deliverable" className="btn btn-ghost btn-icon btn-sm faint"><Trash2 size={15} /></IconSubmit>
                    </form>
                  </div>
                )}
              </div>

              {/* Edit deliverable */}
              {canEdit && (
                <details style={{ marginTop: 8 }}>
                  <summary className="muted" style={{ fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Pencil size={12} /> Edit deliverable
                  </summary>
                  <form action={updateDeliverable.bind(null, d.id)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    <input name="title" className="input" defaultValue={d.title} required placeholder="Title" />
                    <textarea name="description" className="textarea" defaultValue={d.description ?? ""} placeholder="Detailed goal / acceptance criteria" />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <label className="label" style={{ flex: 1, minWidth: 130 }}>Start
                        <input name="startDate" type="date" className="input" defaultValue={dateInput(d.startDate)} />
                      </label>
                      <label className="label" style={{ flex: 1, minWidth: 130 }}>Target
                        <input name="targetDate" type="date" className="input" defaultValue={dateInput(d.targetDate)} required />
                      </label>
                    </div>
                    <div><SpinnerButton variant="secondary">Save deliverable</SpinnerButton></div>
                  </form>
                </details>
              )}

              {/* Subtasks */}
              <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8, borderLeft: "2px solid var(--border-soft)", paddingLeft: 14 }}>
                {d.subtasks.length === 0 ? (
                  <li className="muted" style={{ fontSize: 13 }}>No subtasks yet.</li>
                ) : (
                  d.subtasks.map((s) => {
                    const canSetStatus = canEdit || s.assigneeId === currentUserId;
                    return (
                      <li key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span className="heading-text" style={{ fontSize: 14, textDecoration: s.status === "COMPLETE" ? "line-through" : "none" }}>{s.title}</span>
                            {!canSetStatus && <TimelineStatusBadge status={s.status} />}
                          </div>
                          {s.description && <p className="muted" style={{ fontSize: 12, marginTop: 3, whiteSpace: "pre-wrap" }}>{s.description}</p>}
                          <p className="muted" style={{ fontSize: 12, marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <UserIcon size={12} /> {s.assignee ? (s.assignee.name ?? s.assignee.email) : "Unassigned"}
                            </span>
                            <span>{fmtDeadline(s.dueDate)}</span>
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {canSetStatus && (
                            <StatusSelect action={subtaskStatusAction.bind(null, s.id)} value={s.status} />
                          )}
                          {canEdit && (
                            <>
                              <details>
                                <summary className="btn btn-ghost btn-icon btn-sm faint" style={{ listStyle: "none" }} aria-label="Edit subtask"><Pencil size={14} /></summary>
                                <form action={updateSubtask.bind(null, s.id)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, minWidth: 240 }}>
                                  <input name="title" className="input" defaultValue={s.title} required placeholder="Subtask title" />
                                  <textarea name="description" className="textarea" defaultValue={s.description ?? ""} placeholder="What does done look like?" />
                                  <AssigneeSelect members={members} value={s.assigneeId} />
                                  <label className="label">Due
                                    <input name="dueDate" type="date" className="input" defaultValue={dateInput(s.dueDate)} />
                                  </label>
                                  <div><SpinnerButton variant="secondary">Save subtask</SpinnerButton></div>
                                </form>
                              </details>
                              <form action={deleteSubtask.bind(null, s.id)}>
                                <IconSubmit label="Delete subtask" className="btn btn-ghost btn-icon btn-sm faint"><Trash2 size={14} /></IconSubmit>
                              </form>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })
                )}

                {/* Add subtask */}
                {canEdit && (
                  <li>
                    <details>
                      <summary className="muted" style={{ fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Plus size={12} /> Add subtask
                      </summary>
                      <form action={addSubtask.bind(null, d.id)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                        <input name="title" className="input" required placeholder="Subtask title" />
                        <textarea name="description" className="textarea" placeholder="What does done look like?" />
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 160 }}><AssigneeSelect members={members} value={null} /></div>
                          <input name="dueDate" type="date" className="input" style={{ flex: 1, minWidth: 140 }} aria-label="Due date" />
                        </div>
                        <div><SpinnerButton variant="secondary"><Plus size={14} /> Add subtask</SpinnerButton></div>
                      </form>
                    </details>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {/* Add deliverable */}
      {canEdit && (
        <details style={{ marginTop: 16 }}>
          <summary className="btn btn-secondary btn-sm" style={{ display: "inline-flex", listStyle: "none" }}>
            <Plus size={15} /> Add deliverable
          </summary>
          <form action={addDeliverable.bind(null, projectId)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, maxWidth: 560 }}>
            <input name="title" className="input" required placeholder="Deliverable title (e.g. Prototype validated)" />
            <textarea name="description" className="textarea" placeholder="Detailed engineering goal & acceptance criteria" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label className="label" style={{ flex: 1, minWidth: 130 }}>Start
                <input name="startDate" type="date" className="input" />
              </label>
              <label className="label" style={{ flex: 1, minWidth: 130 }}>Target
                <input name="targetDate" type="date" className="input" required />
              </label>
            </div>
            <div><SpinnerButton variant="brand"><Plus size={15} /> Add deliverable</SpinnerButton></div>
          </form>
        </details>
      )}
    </section>
  );
}

function AssigneeSelect({ members, value }: { members: Member[]; value: string | null }) {
  return (
    <select name="assigneeId" className="select" defaultValue={value ?? ""} aria-label="Assignee">
      <option value="">Unassigned</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
      ))}
    </select>
  );
}
