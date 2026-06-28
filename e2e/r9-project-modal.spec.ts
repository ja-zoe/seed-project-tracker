import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, E2E_MARKER } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/9-deliverable-editing/R9.8-project-edit-modal/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R9.8 — project edit modal", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("Edit project opens a modal; save persists; delete works; old edit route gone", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, "R9.8 Original");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // ── Edit opens a modal (URL stays on the project page), pre-filled ────────
    await page.locator('[data-testid="edit-project"]').click();
    const modal = page.locator('[data-slot="dialog-content"]');
    await expect(modal.getByText("Edit project")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(projectUrl);
    await expect(modal.locator('[data-testid="project-modal-name"]')).toHaveValue(E2E_MARKER + "R9.8 Original");
    await shot(page, "r9-project-modal-open");

    // ── Change fields (keep the marker in the name so cleanup still catches it) ─
    await modal.locator('[data-testid="project-modal-name"]').fill(E2E_MARKER + "R9.8 Edited");
    await modal.locator('[data-testid="project-modal-semester"]').fill("Fall 2099");
    await modal.locator('[data-testid="project-modal-description"]').fill("**Project desc**");
    await modal.locator('[data-testid="project-modal-submit"]').click();

    await expect(page.getByText("R9.8 Edited")).toBeVisible({ timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe(projectUrl);
    await expect(page.getByText("Fall 2099")).toBeVisible();
    await shot(page, "r9-project-modal-saved");
    console.log("  project edits persisted via modal.");

    // ── Empty name rejected ───────────────────────────────────────────────────
    await page.locator('[data-testid="edit-project"]').click();
    await modal.locator('[data-testid="project-modal-name"]').fill("");
    await modal.locator('[data-testid="project-modal-submit"]').click();
    await expect(modal.getByText("Name is required")).toBeVisible();
    await page.keyboard.press("Escape");

    // ── Old edit route is gone ────────────────────────────────────────────────
    const resp = await page.goto(`${projectUrl}/edit`);
    expect(resp?.status()).toBe(404);
    console.log("  /projects/[id]/edit is 404.");

    // ── Delete via the modal (armed ✓/✗ confirm) ──────────────────────────────
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await page.locator('[data-testid="edit-project"]').click();
    await modal.locator('[data-testid="project-modal-delete"]').click();
    const delConfirm = modal.locator('[data-testid="project-modal-delete-confirm"]');
    await expect(delConfirm).toBeVisible();
    await delConfirm.locator('button[title="Confirm"]').click();

    await page.waitForURL("**/projects", { timeout: 10_000 });
    await expect(page.getByText("R9.8 Edited")).toHaveCount(0);
    console.log("  project deleted via modal.");
  });
});
