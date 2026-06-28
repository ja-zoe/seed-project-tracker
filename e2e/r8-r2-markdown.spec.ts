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

test.describe("R8.2 round-2 — Markdown render + click-anywhere-to-expand", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("row body toggles description; Markdown renders; controls don't toggle", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R8.2r2 ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R8.2r2 Deliverable");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await addSubtask(page, "MD subtask", "This is **bold text** and a list:\n\n- one\n- two");

    const row = page.locator('[data-testid="subtask-row"]', { hasText: "MD subtask" });
    const rowBody = row.locator('[data-testid="subtask-row-body"]');

    // role/aria on the row body
    await expect(rowBody).toHaveAttribute("role", "button");
    await expect(rowBody).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator('[data-testid="subtask-description"]')).toHaveCount(0);

    // ── Click a non-control part of the row (the status bullet) → expands ──────
    await row.locator('[data-testid="status-bullet"]').click();
    const desc = page.locator('[data-testid="subtask-description"]');
    await expect(desc).toBeVisible();
    await expect(rowBody).toHaveAttribute("aria-expanded", "true");
    await shot(page, "r8r2-md-expanded");

    // ── Markdown renders to HTML (bold → <strong>, list → <li>) ───────────────
    await expect(desc.locator("strong")).toHaveText("bold text");
    expect(await desc.locator("li").count()).toBeGreaterThanOrEqual(2);
    // literal markdown syntax should NOT be shown
    await expect(desc).not.toContainText("**bold text**");
    console.log("  Markdown rendered (strong + list).");

    // ── Collapse by clicking the bullet again ─────────────────────────────────
    await row.locator('[data-testid="status-bullet"]').click();
    await expect(page.locator('[data-testid="subtask-description"]')).toHaveCount(0);

    // ── Clicking a control (status pill) does NOT toggle the description ───────
    await row.locator('[data-testid="status-pill"]').first().click();
    await expect(page.locator('[data-testid="subtask-description"]')).toHaveCount(0);
    await page.keyboard.press("Escape");

    // ── The title button still toggles (its own handler) ──────────────────────
    await row.locator('[data-testid="subtask-title-toggle"]').click();
    await expect(page.locator('[data-testid="subtask-description"]')).toBeVisible();
    console.log("  controls don't toggle; title button still does.");
  });
});
