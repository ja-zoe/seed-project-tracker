import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/9-deliverable-editing/R9.5-deliverable-priority/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R9.5 — deliverable priority", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("default MEDIUM; inline change persists", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R9.5 ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R9.5 Deliverable");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const chip = page.locator('[data-testid="deliverable-priority"]').first();
    await expect(chip).toHaveText("Med"); // DB default MEDIUM
    await shot(page, "r9-priority-default");

    // ── Open the priority menu, pick High ─────────────────────────────────────
    await chip.click();
    const menu = page.locator('[data-testid="priority-menu"]');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: "Low" })).toBeVisible();
    await menu.getByRole("button", { name: "High" }).click();
    await expect(chip).toHaveText("High", { timeout: 8_000 });
    await shot(page, "r9-priority-high");

    // ── Persists on reload ────────────────────────────────────────────────────
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-testid="deliverable-priority"]').first()).toHaveText("High");
    console.log("  priority change persisted.");
  });
});
