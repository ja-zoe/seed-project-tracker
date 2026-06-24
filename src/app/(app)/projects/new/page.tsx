import { requirePermission } from "@/lib/session";
import { Permission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { createProject } from "../actions";

/** PM-only: create a new project and (optionally) assign leads up front. */
export default async function NewProjectPage() {
  await requirePermission(Permission.MANAGE_PROJECTS);

  // Active users that could be leads.
  const candidates = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader eyebrow="Create" title="New project" description="Define a project and assign its lead(s)." />
      <form action={createProject} className="panel-light" style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="label" htmlFor="name">Project name</label>
          <input id="name" name="name" className="input" required placeholder="e.g. Campus Solar Garden" />
        </div>
        <div>
          <label className="label" htmlFor="semester">Semester</label>
          <input id="semester" name="semester" className="input" required placeholder="e.g. Fall 2026" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" className="textarea" placeholder="What is this project about?" />
        </div>
        <div>
          <label className="label" htmlFor="leadIds">Leads</label>
          <select id="leadIds" name="leadIds" className="select" multiple size={Math.min(6, Math.max(3, candidates.length))}>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </select>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Hold ⌘/Ctrl to select multiple leads.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-brand">Create project</button>
        </div>
      </form>
    </>
  );
}
