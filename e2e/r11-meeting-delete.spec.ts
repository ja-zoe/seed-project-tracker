import { test, expect } from "@playwright/test";
import { login, createProject } from "./helpers";

/**
 * R11.1 — a PM (has MANAGE_MEETING_RECORDS) can delete a meeting record via the
 * inline confirm microinteraction on the project page; it disappears and is gone
 * from the standing-history page too.
 */
test.describe("R11.1 — delete meeting records", () => {
  test("PM records then deletes a meeting record", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R11.1 delete ${Date.now()}`);

    // ── Record a meeting ──────────────────────────────────────────────────────
    await page.goto(`${projectUrl}/meeting/new`);
    await page.waitForLoadState("networkidle");
    await page.locator('input[name="goalMet"][value="true"]').check({ force: true });
    await page.fill('textarea[name="notes"]', "R11.1 record to delete");
    await page.getByRole("button", { name: "Save Record" }).click();
    await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // ── The record shows a Delete control ─────────────────────────────────────
    const controls = page.locator('[data-testid="meeting-record-controls"]');
    await expect(controls).toHaveCount(1);
    await expect(page.getByText("R11.1 record to delete")).toBeVisible();

    // ── Delete → confirm → gone ───────────────────────────────────────────────
    await page.locator('[data-testid="meeting-delete"]').click();
    await expect(page.locator('[data-testid="meeting-delete-confirm"]')).toBeVisible();
    await page.locator('[data-testid="meeting-record-controls"] [title="Confirm"]').click();

    await expect(page.locator('[data-testid="meeting-record-controls"]')).toHaveCount(0);
    await expect(page.getByText("R11.1 record to delete")).toHaveCount(0);

    // ── Gone from the standing-history page as well ───────────────────────────
    await page.goto(`${projectUrl}/history`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("R11.1 record to delete")).toHaveCount(0);
  });
});
