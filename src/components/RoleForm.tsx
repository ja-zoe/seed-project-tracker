"use client";

import { useState } from "react";
import { Permission } from "@prisma/client";
import { PERMISSION_META, ALL_PERMISSIONS } from "@/lib/permissions";
import { SubmitButton } from "@/components/forms";

/**
 * Custom-role builder form (§2). Renders the granular permissions grouped by
 * category with checkboxes, so the PM assembles a role by ticking capabilities.
 * Used both to create a new role and to edit an existing one.
 */
export function RoleForm({
  action,
  initial,
  isBuiltIn = false,
  submitLabel = "Save role",
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial?: { name: string; description?: string | null; permissions: Permission[] };
  isBuiltIn?: boolean;
  submitLabel?: string;
}) {
  const [selected, setSelected] = useState<Set<Permission>>(new Set(initial?.permissions ?? []));

  const toggle = (p: Permission) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });

  // Group permissions for display.
  const groups = new Map<string, Permission[]>();
  for (const p of ALL_PERMISSIONS) {
    const g = PERMISSION_META[p].group;
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="label" htmlFor={`name-${initial?.name ?? "new"}`}>Role name</label>
          <input
            id={`name-${initial?.name ?? "new"}`}
            name="name"
            className="input"
            required
            defaultValue={initial?.name ?? ""}
            readOnly={isBuiltIn}
            placeholder="e.g. Treasurer"
          />
          {isBuiltIn && <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Built-in role — name is fixed, but permissions can be tuned.</p>}
        </div>
        <div style={{ flex: 2, minWidth: 220 }}>
          <label className="label" htmlFor={`desc-${initial?.name ?? "new"}`}>Description</label>
          <input id={`desc-${initial?.name ?? "new"}`} name="description" className="input" defaultValue={initial?.description ?? ""} placeholder="What is this role for?" />
        </div>
      </div>

      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend className="label">Permissions</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 4 }}>
          {[...groups.entries()].map(([group, perms]) => (
            <div key={group} className="panel-light" style={{ padding: 14 }}>
              <p className="heading-text" style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>{group}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {perms.map((p) => (
                  <label key={p} style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      name="permissions"
                      value={p}
                      checked={selected.has(p)}
                      onChange={() => toggle(p)}
                      style={{ marginTop: 2 }}
                    />
                    <span>
                      <span className="heading-text">{PERMISSION_META[p].label}</span>
                      <span className="muted" style={{ display: "block", fontSize: 11 }}>{PERMISSION_META[p].description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
