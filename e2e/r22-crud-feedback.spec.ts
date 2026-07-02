import { test, expect } from "@playwright/test";
import { login, createProject, createDeliverable } from "./helpers";

/**
 * R22.4 — CRUD loading & confirmation feedback. Verifies the three trigger archetypes:
 *  1. modal submit (deliverable edit modal): spinner while pending, success check before close
 *  2. full-page form (SubmitButton on /deliverables/new): pending state on submit
 *  3. inline armed-confirm (InlineConfirm delete): spinner replaces the ✓ while running
 */

test("deliverable modal shows pending then success before closing", async ({ page }) => {
  await login(page);
  const projectUrl = await createProject(page, "crud feedback modal");
  await createDeliverable(page, projectUrl, "feedback item");

  const row = page.locator("[data-deliverable-id]", { hasText: "feedback item" });
  await row.locator('[data-testid="deliverable-edit"]').click();
  const submit = page.locator('[data-testid="deliv-modal-submit"]');
  await expect(submit).toBeVisible();

  await submit.click();
  // The button must pass through a non-idle state (pending and/or the success flash
  // with its popped-in check) before the modal closes.
  await expect(submit).toHaveAttribute("data-state", /pending|success/, { timeout: 5_000 });
  await expect(submit).toHaveAttribute("data-state", "success", { timeout: 10_000 });
  await expect(submit.locator('[data-testid="success-check"]')).toBeVisible();
  // Then the modal closes on its own.
  await expect(submit).not.toBeVisible({ timeout: 10_000 });
});

test("full-page create form button shows pending state on submit", async ({ page }) => {
  await login(page);
  const projectUrl = await createProject(page, "crud feedback page");
  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");

  await page.fill('input[name="title"]', "page feedback item");
  await page.fill('input[name="targetDate"]', "2026-12-31");
  const button = page.getByRole("button", { name: /Add Deliverable|Adding/ });
  await expect(button).toHaveAttribute("data-state", "idle");
  await button.click();
  await expect(button).toHaveAttribute("data-state", /pending|success/, { timeout: 5_000 });
  // The page redirects to the project on success.
  await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
});

test("armed delete confirm spins while the delete runs", async ({ page }) => {
  await login(page);
  const projectUrl = await createProject(page, "crud feedback delete");
  await createDeliverable(page, projectUrl, "doomed item");

  const row = page.locator("[data-deliverable-id]", { hasText: "doomed item" });
  await row.locator('[data-testid="deliverable-delete"]').click();
  const confirm = page.locator('[data-testid="deliv-delete-confirm"]');
  await expect(confirm).toBeVisible();
  await confirm.getByTitle("Confirm").click();
  // While pending, the ✓ inside InlineConfirm is replaced by the shared spinner.
  await expect(confirm.locator(".animate-spin")).toBeVisible({ timeout: 5_000 });
  // And the row ultimately disappears.
  await expect(row).toHaveCount(0, { timeout: 10_000 });
});
