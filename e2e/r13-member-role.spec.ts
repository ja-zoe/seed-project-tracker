import { test, expect } from "@playwright/test";
import { login, createProject, addSelfAsLead } from "./helpers";

/**
 * R13.5 — a privileged user can edit a member's project role inline (with the
 * InlineConfirm ✓/✗). Also exercises R13.2: setting "Sub-lead" must persist (the DB enum
 * now has SUBLEAD).
 */
test.describe("R13.5 — edit member role", () => {
  test("change a member from lead to sub-lead inline", async ({ page }) => {
    await login(page);
    const ts = Date.now();
    const projectUrl = await createProject(page, `R13.5 ${ts}`);
    await addSelfAsLead(page, projectUrl); // adds the current user as LEAD

    await page.goto(`${projectUrl}/members`);
    await page.waitForLoadState("networkidle");

    const roleBtn = page.locator('[data-testid="member-role"]').first();
    await expect(roleBtn).toHaveText("lead");
    await roleBtn.click();

    const select = page.locator('[data-testid="member-role-select"]').first();
    await expect(select).toBeVisible();
    await select.selectOption("SUBLEAD");
    await page.locator('[title="Confirm"]').first().click();

    await expect(page.locator('[data-testid="member-role"]').first()).toHaveText("sublead", { timeout: 10_000 });

    // Persists across reload.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-testid="member-role"]').first()).toHaveText("sublead");
  });
});
