import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/9-deliverable-editing/R9.2-status-delete-microinteractions/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R9.2 — deliverable status + delete ✓/✗ microinteractions", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("status edit confirms with ✓/✗; delete arms a ✓/✗ confirm", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R9.2 ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R9.2 Deliverable");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const card = page.locator(".border.border-border.rounded-xl").first();
    const badge = card.locator('[data-testid="deliverable-status-badge"]');
    await expect(badge).toHaveText(/Not Started/i);

    // ── Pick a new status → ✓/✗ confirm appears, badge shows the pending status ──
    await badge.click();
    const dropdown = page.locator('[style*="z-index: 9999"]:has(button)').first();
    await expect(dropdown).toBeVisible();
    await dropdown.getByRole("button", { name: "In Progress" }).click();
    await page.waitForTimeout(150);
    await shot(page, "r9-deliv-status-pending");

    await expect(badge).toHaveText(/In Progress/i);
    const statusConfirm = card.locator('[data-testid="deliv-status-confirm"] button[title="Confirm"]');
    const statusCancel = card.locator('[data-testid="deliv-status-confirm"] button[title="Cancel"]');
    // same icons as the subtask pill (CheckFat is green #588157)
    expect(await statusConfirm.locator("svg").count()).toBeGreaterThan(0);
    expect(await statusConfirm.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(88, 129, 87)");

    // ── ✗ cancels → reverts to the original status ────────────────────────────
    await statusCancel.click();
    await expect(badge).toHaveText(/Not Started/i);

    // ── Re-pick + ✓ commits ───────────────────────────────────────────────────
    await badge.click();
    await dropdown.getByRole("button", { name: "Complete" }).click();
    await statusConfirm.click();
    await expect(badge).toHaveText(/Complete/i, { timeout: 8_000 });
    await shot(page, "r9-deliv-status-committed");
    console.log("  status confirm/cancel/commit works.");

    // ── Delete: arm → ✗ cancels (deliverable stays) ───────────────────────────
    const delBtn = card.locator('[data-testid="deliverable-delete"]');
    await delBtn.click();
    const deleteConfirm = card.locator('[data-testid="deliv-delete-confirm"]');
    await expect(deleteConfirm).toBeVisible();
    await shot(page, "r9-deliv-delete-armed");
    await deleteConfirm.locator('button[title="Cancel"]').click();
    await expect(card.locator('[data-testid="deliverable-delete"]')).toBeVisible();
    await expect(page.getByText("R9.2 Deliverable")).toBeVisible();

    // ── Delete: arm → ✓ removes the deliverable ───────────────────────────────
    await delBtn.click();
    await card.locator('[data-testid="deliv-delete-confirm"] button[title="Confirm"]').click();
    await expect(page.getByText("R9.2 Deliverable")).toHaveCount(0, { timeout: 8_000 });
    console.log("  delete confirm/cancel works.");
  });
});
