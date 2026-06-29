import { test, expect } from "@playwright/test";
import { login, E2E_MARKER } from "./helpers";

/**
 * R15.1 — the Role Builder must expose a checkbox for every permission, so editing a role
 * doesn't silently strip the ones added in Sets 10–11. Operates only on a throwaway custom
 * role (deleted at the end) — never a built-in role.
 */
test.describe("R15.1 — Role Builder permission completeness", () => {
  test("a role keeps all permissions across a Save (no silent strip)", async ({ page }) => {
    await login(page);
    const roleName = `${E2E_MARKER}AllPerms ${Date.now()}`;

    await page.goto("/pm/users");
    await page.waitForLoadState("networkidle");

    // ── Create a custom role with EVERY permission checked ────────────────────
    await page.getByText("+ Create custom role").click();
    const createForm = page.locator('details:has(button:has-text("Create role"))');
    await createForm.locator('input[name="name"]').fill(roleName);
    const boxes = createForm.locator('input[name^="perm_"]');
    const total = await boxes.count();
    expect(total).toBe(17); // all 17 Permission enum values have a checkbox
    for (let i = 0; i < total; i++) await boxes.nth(i).check();
    await createForm.getByRole("button", { name: "Create role" }).click();
    await page.waitForLoadState("networkidle");

    // The new role's summary reports 17 permissions.
    const roleRow = page.locator("details", { hasText: roleName });
    await expect(roleRow).toContainText("17 permissions");

    // ── Open it and Save with no changes → must STILL be 17 (pre-fix: drops to 13) ──
    await roleRow.locator("summary").click();
    await roleRow.getByRole("button", { name: "Save role" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("details", { hasText: roleName })).toContainText("17 permissions");

    // ── Cleanup: delete the throwaway role (its details is already open) ───────
    const del = page.locator("details", { hasText: roleName }).getByText("Delete role");
    await del.scrollIntoViewIfNeeded();
    await del.click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("details", { hasText: roleName })).toHaveCount(0);
  });
});
