import { test, expect } from "@playwright/test";
import { login, createProject } from "./helpers";

/**
 * R13.3 — action items are created and edited via a modal (no separate page). Editing
 * stays in place (no navigation) and the old edit route is gone.
 */
test.describe("R13.3 — action-item modal", () => {
  test("create then edit an action item via the modal", async ({ page }) => {
    await login(page);
    const ts = Date.now();
    const projectUrl = await createProject(page, `R13.3 ${ts}`);

    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // ── Create via modal ──────────────────────────────────────────────────────
    await page.locator('[data-testid="action-item-new"]').click();
    await page.locator('[data-testid="action-item-modal-description"]').fill("Draft the agenda");
    await page.locator('[data-testid="action-item-modal-submit"]').click();
    await expect(page.getByText("Draft the agenda")).toBeVisible({ timeout: 10_000 });

    // ── Edit via modal — stays on the project page (no redirect) ───────────────
    await page.locator('[data-testid="action-item-edit"]').first().click();
    const desc = page.locator('[data-testid="action-item-modal-description"]');
    await expect(desc).toHaveValue("Draft the agenda");
    await desc.fill("Draft the agenda v2");
    await page.locator('[data-testid="action-item-modal-submit"]').click();

    await expect(page.getByText("Draft the agenda v2")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(projectUrl); // edited in place, not on a separate page
  });
});
