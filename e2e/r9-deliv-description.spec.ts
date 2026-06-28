import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/9-deliverable-editing/R9.4-deliverable-description-inline/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R9.4 — deliverable description expand + inline md/plain edit", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("click body to expand; inline-edit Markdown without a modal; controls don't toggle", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R9.4 ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R9.4 Deliverable");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const header = page.locator('[data-testid="deliverable-header"]').first();
    await expect(header).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator('[data-testid="deliverable-description"]')).toHaveCount(0);

    // ── Click the title (not a control) → expands, shows "No description" ──────
    await page.getByText("R9.4 Deliverable").click();
    const desc = page.locator('[data-testid="deliverable-description"]');
    await expect(desc).toBeVisible();
    await expect(desc).toContainText("No description");
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await shot(page, "r9-deliv-desc-empty");

    // ── Inline edit (no modal): Markdown editor + ✓ ───────────────────────────
    await page.locator('[data-testid="deliverable-desc-edit"]').click();
    const input = page.locator('[data-testid="deliverable-desc-input"]');
    await expect(input).toBeVisible();
    await input.fill("**Deliverable bold** and more");
    await shot(page, "r9-deliv-desc-editing");
    await desc.locator('button[title="Confirm"]').click();

    // ── Renders as Markdown ───────────────────────────────────────────────────
    await expect(desc.locator("strong")).toHaveText("Deliverable bold", { timeout: 8_000 });
    await expect(desc).not.toContainText("**Deliverable bold**");
    await shot(page, "r9-deliv-desc-rendered");
    console.log("  inline markdown edit rendered.");

    // ── Collapse, then a control click does NOT expand ────────────────────────
    await page.getByText("R9.4 Deliverable").click();
    await expect(page.locator('[data-testid="deliverable-description"]')).toHaveCount(0);

    await header.locator('[data-testid="deliverable-status-badge"]').click();
    await expect(page.locator('[data-testid="deliverable-description"]')).toHaveCount(0);
    await page.keyboard.press("Escape");
    console.log("  control clicks don't toggle expansion.");
  });
});
