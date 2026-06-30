import { test, expect } from "@playwright/test";
import { login, createProject } from "./helpers";

/**
 * R18.3 — Action-item deletion in the UI: inline (open + closed rows) and from the
 * edit modal, all using the shared InlineConfirm ✓/✗ microinteraction.
 */
test.describe("R18.3 — action-item deletion (inline + modal)", () => {
  test("inline delete: cancel keeps, confirm removes (open item)", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R18.3 inline ${Date.now()}`);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // Seed one item via the modal.
    await page.locator('[data-testid="action-item-new"]').click();
    await page.locator('[data-testid="action-item-modal-description"]').fill("Inline delete me");
    await page.locator('[data-testid="action-item-modal-submit"]').click();
    await expect(page.getByText("Inline delete me")).toBeVisible({ timeout: 10_000 });

    const row = page
      .locator('[data-testid="action-item-row"]')
      .filter({ hasText: "Inline delete me" });

    // Delete → Cancel leaves it untouched.
    await row.locator('[data-testid="action-item-delete"]').click();
    await expect(row.locator('[data-testid="action-item-delete-confirm"]')).toBeVisible();
    await row.locator('[title="Cancel"]').click();
    await expect(page.getByText("Inline delete me")).toBeVisible();

    // Delete → Confirm removes it.
    await row.locator('[data-testid="action-item-delete"]').click();
    await row.locator('[title="Confirm"]').click();
    await expect(page.getByText("Inline delete me")).toHaveCount(0, { timeout: 10_000 });
  });

  test("inline delete works on a closed item", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R18.3 closed ${Date.now()}`);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    await page.locator('[data-testid="action-item-new"]').click();
    await page.locator('[data-testid="action-item-modal-description"]').fill("Closed delete me");
    await page.locator('[data-testid="action-item-modal-submit"]').click();
    await expect(page.getByText("Closed delete me")).toBeVisible({ timeout: 10_000 });

    // Close it (mark done) → it moves to the completed list.
    const openRow = page
      .locator('[data-testid="action-item-row"]')
      .filter({ hasText: "Closed delete me" });
    await openRow.locator('[title="Mark done"]').click();

    // Expand the completed details.
    await page.getByText(/completed item/).click();
    const doneRow = page
      .locator('[data-testid="action-item-done-row"]')
      .filter({ hasText: "Closed delete me" });
    await expect(doneRow).toBeVisible({ timeout: 10_000 });

    // Delete the closed item.
    await doneRow.locator('[data-testid="action-item-delete"]').click();
    await doneRow.locator('[title="Confirm"]').click();
    await expect(page.getByText("Closed delete me")).toHaveCount(0, { timeout: 10_000 });
  });

  test("modal delete removes the item and closes the modal", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R18.3 modal ${Date.now()}`);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    await page.locator('[data-testid="action-item-new"]').click();
    await page.locator('[data-testid="action-item-modal-description"]').fill("Modal delete me");
    await page.locator('[data-testid="action-item-modal-submit"]').click();
    await expect(page.getByText("Modal delete me")).toBeVisible({ timeout: 10_000 });

    // Open the edit modal.
    const row = page
      .locator('[data-testid="action-item-row"]')
      .filter({ hasText: "Modal delete me" });
    await row.locator('[data-testid="action-item-edit"]').click();

    // Delete from the modal footer (confirm), modal closes, item gone.
    await page.locator('[data-testid="action-item-modal-delete"]').click();
    const confirm = page.locator('[data-testid="action-item-modal-delete-confirm"]');
    await expect(confirm).toBeVisible();
    await confirm.locator('[title="Confirm"]').click();

    await expect(page.locator('[data-testid="action-item-modal-delete"]')).toHaveCount(0, {
      timeout: 10_000,
    });
    await expect(page.getByText("Modal delete me")).toHaveCount(0, { timeout: 10_000 });
  });
});
