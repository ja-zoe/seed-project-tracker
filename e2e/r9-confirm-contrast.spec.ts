import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable, addSubtaskViaModal } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/9-deliverable-editing/R9.9-status-confirm-contrast/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R9.9 — status-confirm ✓ contrast on the COMPLETE pill", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("the pill confirm ✓ is white (visible) when picking COMPLETE; light-bg confirms stay green", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, "R9.9");
    await createDeliverable(page, projectUrl, "R9.9 Deliverable");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await addSubtaskViaModal(page, "Confirm-contrast subtask");

    // Use .first() (not hasText) — the title becomes an <input> during edit, so a
    // hasText filter would stop matching the row.
    const row = page.locator('[data-testid="subtask-row"]').first();

    // ── A light-background confirm (subtask title edit) keeps the green ✓ ──────
    await row.hover();
    await row.locator('[data-testid="pencil-btn"]').click(); // edit title → InlineConfirm on the row bg
    const titleConfirm = row.locator('button[title="Confirm"]').first();
    await expect(titleConfirm).toBeVisible();
    const titleColor = await titleConfirm.evaluate((el) => getComputedStyle(el).color);
    console.log("  title confirm color (light bg):", titleColor);
    expect(titleColor).toBe("rgb(88, 129, 87)"); // default green tone, unchanged
    await row.locator('button[title="Cancel"]').first().click(); // cancel title edit

    // ── Pick COMPLETE → the pill turns green; the confirm ✓ must be white ──────
    await row.locator('[data-testid="status-pill"]').first().click();
    const dropdown = page.locator('[style*="z-index: 9999"]:has(button)').first();
    await expect(dropdown).toBeVisible();
    await dropdown.locator("button", { hasText: "Complete" }).first().click();
    await page.waitForTimeout(150);
    await shot(page, "r9-confirm-on-complete");

    const pillConfirm = row.locator('button[title="Confirm"]').first();
    await expect(pillConfirm).toBeVisible();
    const color = await pillConfirm.evaluate((el) => getComputedStyle(el).color);
    console.log("  pill confirm color (COMPLETE):", color);
    expect(color).toBe("rgb(255, 255, 255)"); // white — visible on the green pill
    const pillBg = await row
      .locator('[data-testid="status-pill-container"]').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(pillBg).toBe("rgb(88, 129, 87)"); // COMPLETE = green
    console.log("  contrast fix verified.");
  });
});
