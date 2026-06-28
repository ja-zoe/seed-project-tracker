import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/9-deliverable-editing/R9.1-deliverable-edit-modal/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R9.1 — deliverable edit modal", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("Edit opens a modal (not a page); saving persists all fields; old edit route gone", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R9.1 ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R9.1 Original");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // ── Edit opens a modal (URL stays on the project page) ────────────────────
    await page.locator('[data-testid="deliverable-edit"]').first().click();
    const modal = page.locator('[data-slot="dialog-content"]');
    await expect(modal.getByText("Edit deliverable")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(projectUrl);
    // pre-filled
    await expect(modal.locator('[data-testid="deliv-modal-title"]')).toHaveValue("R9.1 Original");
    await shot(page, "r9-modal-open");

    // ── Change every field ────────────────────────────────────────────────────
    await modal.locator('[data-testid="deliv-modal-title"]').fill("R9.1 Edited");
    await modal.locator('[data-testid="deliv-modal-priority"]').selectOption("HIGH");
    await modal.locator('[data-testid="deliv-modal-group"]').fill("Backend");
    await modal.locator('[data-testid="deliv-modal-status"]').selectOption("IN_PROGRESS");
    await modal.locator('[data-testid="deliv-modal-description"]').fill("**Modal-edited** description");
    await modal.locator('[data-testid="deliv-modal-submit"]').click();

    // ── Modal closes; deliverable reflects all changes without navigation ─────
    await expect(page.getByText("R9.1 Edited")).toBeVisible({ timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe(projectUrl);
    const card = page.locator(".border.border-border.rounded-xl", { hasText: "R9.1 Edited" });
    await expect(card.locator('[data-testid="deliverable-priority"]')).toHaveText("High");
    await expect(card.locator('[data-testid="deliverable-group"]')).toHaveText("Backend");
    await expect(card.locator('[data-testid="deliverable-status-badge"]')).toHaveText(/In Progress/i);
    await shot(page, "r9-modal-saved");

    // description (expand to check Markdown rendered)
    await page.getByText("R9.1 Edited").click();
    await expect(page.locator('[data-testid="deliverable-description"] strong')).toHaveText("Modal-edited");
    console.log("  all fields persisted via modal.");

    // ── Empty title is rejected ───────────────────────────────────────────────
    await page.locator('[data-testid="deliverable-edit"]').first().click();
    await modal.locator('[data-testid="deliv-modal-title"]').fill("");
    await modal.locator('[data-testid="deliv-modal-submit"]').click();
    await expect(modal.getByText("Title is required")).toBeVisible();
    await page.keyboard.press("Escape");

    // ── Old edit route is gone ────────────────────────────────────────────────
    const resp = await page.goto(`${projectUrl}/deliverables/x/edit`);
    expect(resp?.status()).toBe(404);
    console.log("  /deliverables/[did]/edit is 404.");
  });
});
