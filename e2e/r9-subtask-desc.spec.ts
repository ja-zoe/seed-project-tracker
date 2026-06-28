import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable, addSubtaskViaModal } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/9-deliverable-editing/R9.7-subtask-description-inline/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R9.7 — subtask description inline edit", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("expand a subtask, inline-edit its description (Markdown), ✓ persists / ✗ reverts", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, "R9.7");
    await createDeliverable(page, projectUrl, "R9.7 Deliverable");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await addSubtaskViaModal(page, "Desc subtask");

    const row = page.locator('[data-testid="subtask-row"]').first();
    await row.locator('[data-testid="subtask-title-toggle"]').click();
    const desc = page.locator('[data-testid="subtask-description"]');
    await expect(desc).toBeVisible();
    await expect(desc).toContainText("No description");
    await shot(page, "r9-subdesc-empty");

    // ── Inline edit (Markdown editor, no modal) ───────────────────────────────
    await desc.locator('[data-testid="subtask-desc-edit"]').click();
    const input = page.locator('[data-testid="subtask-desc-input"]');
    await expect(input).toBeVisible();
    await input.fill("**Subtask bold** inline");
    await shot(page, "r9-subdesc-editing");
    await desc.locator('button[title="Confirm"]').click();

    await expect(desc.locator("strong")).toHaveText("Subtask bold", { timeout: 8_000 });
    await expect(desc).not.toContainText("**Subtask bold**");
    await shot(page, "r9-subdesc-rendered");
    console.log("  inline subtask markdown edit rendered.");

    // ── ✗ cancel reverts ──────────────────────────────────────────────────────
    await desc.locator('[data-testid="subtask-desc-edit"]').click();
    await page.locator('[data-testid="subtask-desc-input"]').fill("scrapped text");
    await desc.locator('button[title="Cancel"]').click();
    await expect(desc.locator("strong")).toHaveText("Subtask bold");
    await expect(desc).not.toContainText("scrapped text");
    console.log("  cancel reverted.");
  });
});
