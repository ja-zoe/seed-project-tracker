import { test, expect, type Page, type Locator } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/9-deliverable-editing/R9.3-inline-group-combobox/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R9.3 — inline deliverable group combobox", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("create a new group, reuse it on another deliverable, and clear it", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R9.3 ${Date.now()}`);
    await createDeliverable(page, projectUrl, "Deliv One");
    await createDeliverable(page, projectUrl, "Deliv Two");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const card = (title: string): Locator =>
      page.locator(".border.border-border.rounded-xl", { hasText: title });
    const combo = page.locator('[data-testid="group-combobox"]');

    // ── D1: type a brand-new group "Frontend" + Enter → creates & assigns ─────
    await card("Deliv One").locator('[data-testid="deliverable-group"]').click();
    await expect(combo).toBeVisible();
    await expect(combo.locator("input")).toBeFocused();
    await combo.locator("input").fill("Frontend");
    await expect(combo.getByText('Create "Frontend"')).toBeVisible();
    await shot(page, "r9-group-create");
    await combo.locator("input").press("Enter");

    await expect(card("Deliv One").locator('[data-testid="deliverable-group"]')).toHaveText("Frontend", { timeout: 8_000 });
    console.log("  created group 'Frontend' on D1.");

    // ── D2: the combobox now lists "Frontend"; pick it (keyboard) ─────────────
    await card("Deliv Two").locator('[data-testid="deliverable-group"]').click();
    await expect(combo).toBeVisible();
    await expect(combo.getByRole("button", { name: "Frontend" })).toBeVisible();
    await combo.locator("input").press("ArrowDown"); // 0=Ungrouped → 1=Frontend
    await combo.locator("input").press("Enter");
    await expect(card("Deliv Two").locator('[data-testid="deliverable-group"]')).toHaveText("Frontend", { timeout: 8_000 });
    await shot(page, "r9-group-reuse");
    console.log("  reused 'Frontend' on D2 via keyboard.");

    // ── Clear D1's group via "Ungrouped" → chip back to "+ Group" ─────────────
    await card("Deliv One").locator('[data-testid="deliverable-group"]').click();
    await expect(combo).toBeVisible();
    await combo.getByRole("button", { name: "Ungrouped" }).click();
    await expect(card("Deliv One").locator('[data-testid="deliverable-group"]')).toHaveText("+ Group", { timeout: 8_000 });
    console.log("  cleared D1 group.");
  });
});
