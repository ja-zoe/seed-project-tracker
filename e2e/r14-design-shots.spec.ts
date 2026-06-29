import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, addSelfAsLead, createDeliverable } from "./helpers";

const SHOTS = path.join(__dirname, "../changes/14-correctness-design-polish/screenshots");

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

/**
 * R14.2 — floating surfaces must read as crisp bordered surfaces with no glassmorphism
 * (no backdrop blur) and no heavy shadow. Captures evidence + asserts the dialog overlay
 * has no backdrop-filter.
 */
test.describe("R14.2 — no heavy shadows / no glassmorphism", () => {
  test.beforeAll(() => fs.mkdirSync(SHOTS, { recursive: true }));

  test("dialog overlay has no backdrop blur; menu + modal render flat", async ({ page }) => {
    await login(page);
    const ts = Date.now();
    const projectUrl = await createProject(page, `R14.2 ${ts}`);
    await addSelfAsLead(page, projectUrl);
    await createDeliverable(page, projectUrl, `R14.2 deliv ${ts}`, "2026-12-15");

    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // Deliverable status menu (a floating popover — should have at most a hairline shadow).
    await page.locator('[data-testid="deliverable-status-badge"]').first().click();
    const menu = page.locator('[style*="z-index: 9999"]:has(button)').first();
    await expect(menu).toBeVisible();
    await shot(page, "deliverable-status-menu");
    await page.keyboard.press("Escape");

    // Edit modal + overlay — overlay must NOT use backdrop-filter (no glass).
    await page.locator('[data-testid="deliverable-edit"]').first().click();
    const overlay = page.locator('[data-slot="dialog-overlay"]');
    const content = page.locator('[data-slot="dialog-content"]');
    await expect(content).toBeVisible();
    await shot(page, "edit-modal");

    const backdrop = await overlay.evaluate(
      (el) => getComputedStyle(el).backdropFilter || (getComputedStyle(el) as CSSStyleDeclaration).webkitBackdropFilter
    );
    expect(backdrop === "none" || backdrop === "" || backdrop == null).toBeTruthy();
  });
});
