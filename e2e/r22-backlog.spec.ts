import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { login, createProject, createDeliverable } from "./helpers";

/**
 * R22.1 — Deliverable backlog. Moving a deliverable to the backlog removes it from the
 * active list and the timeline Gantt; restoring brings it back intact.
 */

test("move to backlog → off active list & timeline; restore → back intact", async ({ page }) => {
  await login(page);
  const projectUrl = await createProject(page, "backlog roundtrip");
  await createDeliverable(page, projectUrl, "deferrable work", "2026-11-30");

  // Sanity: on the timeline before backlogging.
  await page.goto(`${projectUrl}/timeline`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("deferrable work").first()).toBeVisible();

  // Move to backlog from the project page row controls.
  await page.goto(projectUrl);
  await page.waitForLoadState("networkidle");
  const row = page.locator("[data-deliverable-id]", { hasText: "deferrable work" });
  await row.locator('[data-testid="deliverable-backlog"]').click();

  // Row leaves the active list; the collapsed Backlog section appears with count 1.
  const backlogSection = page.locator('[data-testid="backlog-section"]');
  await expect(backlogSection).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-testid="deliverable-header"]', { hasText: "deferrable work" })).toHaveCount(0);
  await expect(backlogSection).toContainText("1");

  // Expand: the backlog row shows title + target date + Restore.
  await page.locator('[data-testid="backlog-toggle"]').click();
  const backlogRow = page.locator('[data-testid="backlog-row"]', { hasText: "deferrable work" });
  await expect(backlogRow).toBeVisible();
  await expect(backlogRow).toContainText("Target:");

  // Gone from the timeline.
  await page.goto(`${projectUrl}/timeline`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("deferrable work")).toHaveCount(0);

  // Restore — back on the active list with its date intact, backlog section gone.
  await page.goto(projectUrl);
  await page.waitForLoadState("networkidle");
  await page.locator('[data-testid="backlog-toggle"]').click();
  await page.locator('[data-testid="backlog-restore"]').click();
  await expect(
    page.locator('[data-testid="deliverable-header"]', { hasText: "deferrable work" })
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-testid="backlog-section"]')).toHaveCount(0);
  await expect(
    page.locator("[data-deliverable-id]", { hasText: "deferrable work" })
  ).toContainText("Nov 30, 2026");
});

test("edit modal backlog checkbox round-trips", async ({ page }) => {
  await login(page);
  const projectUrl = await createProject(page, "backlog modal");
  await createDeliverable(page, projectUrl, "modal backlog item");

  const row = page.locator("[data-deliverable-id]", { hasText: "modal backlog item" });
  await row.locator('[data-testid="deliverable-edit"]').click();
  const checkbox = page.locator('[data-testid="deliv-modal-backlog"]');
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await page.locator('[data-testid="deliv-modal-submit"]').click();

  await expect(page.locator('[data-testid="backlog-section"]')).toBeVisible({ timeout: 10_000 });
  await expect(
    page.locator('[data-testid="deliverable-header"]', { hasText: "modal backlog item" })
  ).toHaveCount(0);
});

test("Excel export lists backlogged deliverables under a Backlog grouping", async ({ page }) => {
  await login(page);
  const projectUrl = await createProject(page, "backlog export");
  await createDeliverable(page, projectUrl, "active item");
  await createDeliverable(page, projectUrl, "deferred item");

  const row = page.locator("[data-deliverable-id]", { hasText: "deferred item" });
  await row.locator('[data-testid="deliverable-backlog"]').click();
  await expect(page.locator('[data-testid="backlog-section"]')).toBeVisible({ timeout: 10_000 });

  const projectId = projectUrl.split("/").pop()!;
  const res = await page.request.get(`/api/projects/${projectId}/export`);
  expect(res.status()).toBe(200);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await res.body());
  const sheet = workbook.getWorksheet("Timeline")!;
  const rows: { type: string; title: string }[] = [];
  sheet.eachRow((r) => {
    rows.push({ type: String(r.getCell(1).value ?? ""), title: String(r.getCell(2).value ?? "") });
  });

  expect(rows.some((r) => r.type === "Deliverable" && r.title === "active item")).toBe(true);
  expect(rows.some((r) => r.type === "Backlog" && r.title === "deferred item")).toBe(true);
  // The backlogged item must not appear as a regular deliverable row.
  expect(rows.some((r) => r.type === "Deliverable" && r.title === "deferred item")).toBe(false);
});
