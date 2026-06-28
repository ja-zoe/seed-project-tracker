import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable, addSubtaskViaModal } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/8-subtask-modal-bulk-fixes/R8.1-subtask-modal/screenshots"
);

test.describe("R8.1 — subtask create/edit modal", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("create via modal (no navigation), edit whole subtask via modal, old page gone", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R8.1 ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R8.1 Deliverable", "2026-12-31");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // ── Create via modal ───────────────────────────────────────────────────────
    await page.locator('[data-testid="add-subtask"]').first().click();
    const modalTitle = page.locator('[data-testid="subtask-modal-title"]');
    await expect(modalTitle).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("New subtask")).toBeVisible();
    await shot(page, "r8-modal-create-open");

    // Due-date input is bounded by the deliverable target (R8.3 ties in here)
    const dueMax = await page.locator('[data-testid="subtask-modal-duedate"]').getAttribute("max");
    expect(dueMax).toBe("2026-12-31");

    await modalTitle.fill("Modal-made subtask");
    await page.locator('[data-testid="subtask-modal-description"]').fill("Created from the modal");
    await page.locator('[data-testid="subtask-modal-submit"]').click();

    // Row appears WITHOUT a full navigation (still on the project page)
    await expect(page.locator('[data-testid="subtask-row"]', { hasText: "Modal-made subtask" }))
      .toBeVisible({ timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe(projectUrl);
    await shot(page, "r8-modal-created");

    // ── Edit the whole subtask via modal ──────────────────────────────────────
    const row = page.locator('[data-testid="subtask-row"]', { hasText: "Modal-made subtask" });
    await row.hover();
    await row.locator('[data-testid="edit-subtask-modal"]').click();
    await expect(page.getByText("Edit subtask")).toBeVisible();
    // Pre-filled
    await expect(page.locator('[data-testid="subtask-modal-title"]')).toHaveValue("Modal-made subtask");
    await expect(page.locator('[data-testid="subtask-modal-description"]')).toHaveValue("Created from the modal");
    await shot(page, "r8-modal-edit-open");

    await page.locator('[data-testid="subtask-modal-title"]').fill("Renamed via modal");
    await page.locator('[data-testid="subtask-modal-status"]').selectOption("IN_PROGRESS");
    await page.locator('[data-testid="subtask-modal-submit"]').click();

    await expect(page.locator('[data-testid="subtask-row"]', { hasText: "Renamed via modal" }))
      .toBeVisible({ timeout: 10_000 });
    // Status change propagated to the deliverable (now has an in-progress subtask)
    await expect(page.locator('[data-testid="deliverable-locked-badge"]').first())
      .toContainText("In Progress", { timeout: 8_000 });
    await shot(page, "r8-modal-edited");

    // ── Empty title is rejected ───────────────────────────────────────────────
    await page.locator('[data-testid="add-subtask"]').first().click();
    await expect(page.locator('[data-testid="subtask-modal-title"]')).toBeVisible();
    await page.locator('[data-testid="subtask-modal-submit"]').click();
    await expect(page.getByText("Title is required")).toBeVisible();
    await page.keyboard.press("Escape");

    // ── Inline edits still work (regression): title pencil ────────────────────
    const renamedRow = page.locator('[data-testid="subtask-row"]', { hasText: "Renamed via modal" });
    await renamedRow.hover();
    await expect(renamedRow.locator('[data-testid="pencil-btn"]')).toBeVisible();

    // ── Old /subtasks/new route is gone ───────────────────────────────────────
    const resp = await page.goto(`${projectUrl}/deliverables/x/subtasks/new`);
    expect(resp?.status()).toBe(404);
    console.log("  /subtasks/new is 404; modal create+edit verified.");
  });
});

async function shot(page: import("@playwright/test").Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}
