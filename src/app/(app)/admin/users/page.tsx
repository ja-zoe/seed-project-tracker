import { Permission } from "@prisma/client";
import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fmtDate } from "@/lib/format";
import { PageHeader, Section, EmptyState } from "@/components/ui";
import {
  approveUser,
  setUserRole,
  setUserStatus,
  setUserProjects,
} from "../actions";

/** User & assignment management (§6, MANAGE_USERS). */
export default async function UsersPage() {
  await requirePermission(Permission.MANAGE_USERS);

  const [users, roles, projects] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      include: {
        role: { select: { id: true, name: true } },
        assignments: { select: { projectId: true } },
      },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const pending = users.filter((u) => u.status === "PENDING");
  const active = users.filter((u) => u.status !== "PENDING");

  // Inline server actions wiring form fields to the typed lib actions.
  async function approve(formData: FormData) {
    "use server";
    await approveUser(String(formData.get("userId")), String(formData.get("roleId")));
  }
  async function changeRole(formData: FormData) {
    "use server";
    const roleId = String(formData.get("roleId"));
    await setUserRole(String(formData.get("userId")), roleId || null);
  }
  async function changeProjects(formData: FormData) {
    "use server";
    await setUserProjects(String(formData.get("userId")), formData.getAll("projectIds").map(String));
  }

  return (
    <>
      <PageHeader title="Users" description="Approve new members, assign roles, and manage project assignments." />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Section title={`Pending approval · ${pending.length}`}>
          {pending.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>No one is waiting for approval.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map((u) => (
                <li key={u.id} className="glass glass-card" style={{ padding: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <p className="heading-text" style={{ fontWeight: 500 }}>{u.name ?? u.email}</p>
                    <p className="muted" style={{ fontSize: 12 }}>{u.email} · joined {fmtDate(u.createdAt)}</p>
                  </div>
                  <form action={approve} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="roleId" className="select" required defaultValue="" style={{ width: 180 }}>
                      <option value="" disabled>Assign role…</option>
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button className="btn btn-brand btn-sm">Approve</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`Members · ${active.length}`}>
          {active.length === 0 ? (
            <EmptyState title="No members yet" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {active.map((u) => {
                const assignedIds = new Set(u.assignments.map((a) => a.projectId));
                return (
                  <div key={u.id} className="glass glass-card" style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <p className="heading-text" style={{ fontWeight: 500 }}>
                          {u.name ?? u.email}{" "}
                          {u.status === "SUSPENDED" && <span className="badge badge-behind">Suspended</span>}
                        </p>
                        <p className="muted" style={{ fontSize: 12 }}>{u.email}</p>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <form action={changeRole} style={{ display: "flex", gap: 6 }}>
                          <input type="hidden" name="userId" value={u.id} />
                          <select name="roleId" className="select" defaultValue={u.role?.id ?? ""} style={{ width: 160 }}>
                            <option value="">No role</option>
                            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          <button className="btn btn-secondary btn-sm">Save</button>
                        </form>
                        <form action={setUserStatus.bind(null, u.id, u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED")}>
                          <button className={`btn btn-sm ${u.status === "SUSPENDED" ? "btn-success" : "btn-ghost"}`}>
                            {u.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                          </button>
                        </form>
                      </div>
                    </div>

                    <form action={changeProjects} style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <input type="hidden" name="userId" value={u.id} />
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label className="label" style={{ fontSize: 12 }}>Project assignments</label>
                        <select name="projectIds" className="select" multiple size={Math.min(4, Math.max(2, projects.length))} defaultValue={[...assignedIds]}>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <button className="btn btn-secondary btn-sm">Update projects</button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
