import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/8-subtask-modal-bulk-fixes/R8.2-expandable-subtask-description/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function addSubtask(page: Page, title: string, desc?: string) {
  await page.locator('[data-testid="add-subtask"]').first().click();
  await page.locator('[data-testid="subtask-modal-title"]').fill(title);
  if (desc) await page.locator('[data-testid="subtask-modal-description"]').fill(desc);
  await page.locator('[data-testid="subtask-modal-submit"]').click();
  await expect(page.locator('[data-testid="subtask-row"]', { hasText: title })).toBeVisible({ timeout: 10_000 });
}

test.describe("R8.2 — expandable subtask description", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("clicking a subtask title expands its description and pushes siblings down", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R8.2 ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R8.2 Deliverable");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    await addSubtask(page, "First with desc", "A detailed description here");
    await addSubtask(page, "Second subtask");

    const row1 = page.locator('[data-testid="subtask-row"]', { hasText: "First with desc" });
    const row2 = page.locator('[data-testid="subtask-row"]', { hasText: "Second subtask" });

    // Description hidden initially
    await expect(page.locator('[data-testid="subtask-description"]')).toHaveCount(0);
    const row2YBefore = (await row2.boundingBox())!.y;
    await shot(page, "r8-expand-collapsed");

    // ── Expand the first subtask ──────────────────────────────────────────────
    await row1.locator('[data-testid="subtask-title-toggle"]').click();
    const desc = page.locator('[data-testid="subtask-description"]');
    await expect(desc).toBeVisible();
    await expect(desc).toContainText("A detailed description here");
    await shot(page, "r8-expand-open");

    // Sibling pushed DOWN
    const row2YAfter = (await row2.boundingBox())!.y;
    console.log("  row2 y:", Math.round(row2YBefore), "→", Math.round(row2YAfter));
    expect(row2YAfter).toBeGreaterThan(row2YBefore + 10);

    // Toggle aria-expanded
    await expect(row1.locator('[data-testid="subtask-title-toggle"]')).toHaveAttribute("aria-expanded", "true");

    // ── Collapse again ────────────────────────────────────────────────────────
    await row1.locator('[data-testid="subtask-title-toggle"]').click();
    await expect(page.locator('[data-testid="subtask-description"]')).toHaveCount(0);

    // ── A subtask with no description shows "No description" when expanded ─────
    await row2.locator('[data-testid="subtask-title-toggle"]').click();
    await expect(page.locator('[data-testid="subtask-description"]')).toContainText("No description");

    // ── Clicking the status pill does NOT toggle expansion ────────────────────
    await row2.locator('[data-testid="subtask-title-toggle"]').click(); // collapse
    await expect(page.locator('[data-testid="subtask-description"]')).toHaveCount(0);
    await row1.locator('[data-testid="status-pill"]').first().click();
    await expect(page.locator('[data-testid="subtask-description"]')).toHaveCount(0);
    await page.keyboard.press("Escape");
    console.log("  expansion works; controls don't trigger it.");
  });
});
