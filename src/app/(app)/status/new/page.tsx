import { Permission } from "@prisma/client";
import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { PageHeader, EmptyState } from "@/components/ui";
import { StatusUpdateForm } from "@/components/forms";
import { submitStatusUpdate } from "../../projects/actions";

/** Standalone "submit a status update" page with a project picker. */
export default async function NewStatusPage() {
  const user = await requirePermission(Permission.SUBMIT_STATUS_UPDATES);

  // PMs can submit for any project; leads only for projects they're assigned to.
  const projects = await prisma.project.findMany({
    where: can(user, Permission.MANAGE_PROJECTS) ? {} : { assignments: { some: { userId: user.id } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader eyebrow="Weekly check-in" title="Submit status update" description="Your weekly pre-meeting check-in." />
      {projects.length === 0 ? (
        <EmptyState title="No projects to submit for" description="You aren't assigned to a project yet. Ask the PM to add you." />
      ) : (
        <div className="panel-light" style={{ maxWidth: 680 }}>
          <StatusUpdateForm action={submitStatusUpdate} projects={projects} />
        </div>
      )}
    </>
  );
}
