import { Permission } from "@prisma/client";
import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, Section } from "@/components/ui";
import { RoleForm } from "@/components/RoleForm";
import { createRole, updateRole, deleteRole } from "../actions";

/** Role & permission management — the custom-role builder (§2, MANAGE_ROLES). */
export default async function RolesPage() {
  await requirePermission(Permission.MANAGE_ROLES);

  const roles = await prisma.role.findMany({
    orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true } } },
  });

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Roles are data: tick the capabilities each role grants. The three built-ins are just pre-seeded roles you can tune."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {roles.map((role) => (
          <Section
            key={role.id}
            title={`${role.name}${role.isBuiltIn ? " · built-in" : ""}`}
            action={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="muted" style={{ fontSize: 12 }}>{role._count.users} user(s)</span>
                {!role.isBuiltIn && (
                  <form action={deleteRole.bind(null, role.id)}>
                    <button className="btn btn-ghost btn-sm muted" aria-label="Delete role">Delete</button>
                  </form>
                )}
              </div>
            }
          >
            <RoleForm
              action={updateRole.bind(null, role.id)}
              initial={{ name: role.name, description: role.description, permissions: role.permissions }}
              isBuiltIn={role.isBuiltIn}
            />
          </Section>
        ))}

        <Section title="Create a custom role">
          <RoleForm action={createRole} submitLabel="Create role" />
        </Section>
      </div>
    </>
  );
}
