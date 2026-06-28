import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/8-subtask-modal-bulk-fixes/R8.1-subtask-modal/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R8.1 round-2 — modal description Markdown/plain", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("modal description has MD/Plain toggle + preview; Markdown round-trips to the expanded row", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R8.1r2 ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R8.1r2 Deliverable");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // ── Open the create modal ─────────────────────────────────────────────────
    await page.locator('[data-testid="add-subtask"]').first().click();
    const modal = page.locator('[data-slot="dialog-content"]');
    await expect(modal.locator('[data-testid="subtask-modal-title"]')).toBeVisible();

    // The description field is a Markdown editor: MD/Plain toggle + Write/Preview tabs
    await expect(modal.getByRole("button", { name: "MD", exact: true })).toBeVisible();
    await expect(modal.getByRole("button", { name: "Plain", exact: true })).toBeVisible();
    await expect(modal.getByRole("button", { name: "Write", exact: true })).toBeVisible();
    await expect(modal.getByRole("button", { name: "Preview", exact: true })).toBeVisible();

    await modal.locator('[data-testid="subtask-modal-title"]').fill("MD modal subtask");
    await modal.locator('[data-testid="subtask-modal-description"]').fill("**bold via modal**");
    await shot(page, "r8r2-modal-md-write");

    // ── Preview renders the Markdown ──────────────────────────────────────────
    await modal.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(modal.locator("strong")).toHaveText("bold via modal");
    await shot(page, "r8r2-modal-md-preview");

    // ── Plain mode hides the Write/Preview tabs ───────────────────────────────
    await modal.getByRole("button", { name: "Plain", exact: true }).click();
    await expect(modal.getByRole("button", { name: "Preview", exact: true })).toHaveCount(0);
    // back to MD so the value persists as written
    await modal.getByRole("button", { name: "MD", exact: true }).click();

    // ── Submit → expand the row → Markdown renders ────────────────────────────
    await modal.locator('[data-testid="subtask-modal-submit"]').click();
    const row = page.locator('[data-testid="subtask-row"]', { hasText: "MD modal subtask" });
    await expect(row).toBeVisible({ timeout: 10_000 });

    await row.locator('[data-testid="subtask-title-toggle"]').click();
    const desc = page.locator('[data-testid="subtask-description"]');
    await expect(desc.locator("strong")).toHaveText("bold via modal");
    await shot(page, "r8r2-modal-md-rendered");
    console.log("  Markdown round-trips modal → expanded row.");

    // ── Plain text still works ────────────────────────────────────────────────
    await page.locator('[data-testid="add-subtask"]').first().click();
    await modal.locator('[data-testid="subtask-modal-title"]').fill("Plain subtask");
    await modal.locator('[data-testid="subtask-modal-description"]').fill("just plain text");
    await modal.locator('[data-testid="subtask-modal-submit"]').click();
    const row2 = page.locator('[data-testid="subtask-row"]', { hasText: "Plain subtask" });
    await expect(row2).toBeVisible({ timeout: 10_000 });
    await row2.locator('[data-testid="subtask-title-toggle"]').click();
    await expect(page.locator('[data-testid="subtask-description"]')).toContainText("just plain text");
    console.log("  plain text still saves/displays.");
  });
});
