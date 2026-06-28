import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { addSubtaskViaModal } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/8-subtask-modal-bulk-fixes/R8.4-deliverable-status-rederivation/screenshots"
);

async function login(page: Page) {
  await page.goto("/dev-login");
  await page.fill("#netId", "jav273");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function setup(page: Page): Promise<{ projectUrl: string; deliverableId: string }> {
  await page.goto("/projects/new");
  await page.fill('input[name="name"]', `R8.4 ${Date.now()}`);
  await page.fill('input[name="semester"]', "Test 2026");
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
    { timeout: 15_000 }
  );
  const projectUrl = new URL(page.url()).pathname;

  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="title"]', "R8.4 Deliverable");
  await page.fill('input[name="targetDate"]', "2026-12-31");
  await page.getByRole("button", { name: "Add Deliverable" }).click();
  await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  const editLink = page.locator('a[href*="/deliverables/"][href*="/edit"]').first();
  await expect(editLink).toBeVisible({ timeout: 10_000 });
  const deliverableId = (await editLink.getAttribute("href"))?.match(/deliverables\/([^/]+)\/edit/)?.[1];
  if (!deliverableId) throw new Error("no deliverable id");

  await addSubtask(page, projectUrl, deliverableId, "First subtask");
  return { projectUrl, deliverableId };
}

async function addSubtask(page: Page, projectUrl: string, _deliverableId: string, title: string) {
  // Via the modal — the /subtasks/new page was removed in set 8.
  await page.goto(projectUrl);
  await page.waitForLoadState("networkidle");
  await addSubtaskViaModal(page, title);
}

async function completeSubtask(page: Page, rowIndex: number) {
  const row = page.locator('[data-testid="subtask-row"]').nth(rowIndex);
  await row.locator('[data-testid="status-pill"]').first().click();
  await page.waitForTimeout(150);
  const dropdown = page.locator('[style*="z-index: 9999"]:has(button)').first();
  await expect(dropdown).toBeVisible();
  await dropdown.locator("button", { hasText: "Complete" }).first().click();
  await page.waitForTimeout(150);
  await row.locator('button[title="Confirm"]').first().click();
}

test.describe("R8.4 — deliverable status re-derivation on subtask add/delete", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("adding a subtask under an all-complete deliverable drops it out of COMPLETE", async ({ page }) => {
    await login(page);
    const { projectUrl, deliverableId } = await setup(page);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const lockedBadge = page.locator('[data-testid="deliverable-locked-badge"]').first();
    await expect(lockedBadge).toBeVisible();
    console.log("  initial badge:", (await lockedBadge.textContent())?.trim());

    // ── Complete the only subtask → deliverable becomes COMPLETE ──────────────
    await completeSubtask(page, 0);
    await expect(lockedBadge).toContainText("Complete", { timeout: 8_000 });
    await shot(page, "r8-rederive-all-complete");
    console.log("  after completing all: deliverable =", (await lockedBadge.textContent())?.trim());

    // ── The bug: add a NEW subtask → deliverable must leave COMPLETE ──────────
    await addSubtask(page, projectUrl, deliverableId, "Second subtask");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const badgeAfter = page.locator('[data-testid="deliverable-locked-badge"]').first();
    await expect(badgeAfter).toBeVisible();
    const txt = (await badgeAfter.textContent())?.trim() ?? "";
    console.log("  after adding a subtask: deliverable =", txt);
    await shot(page, "r8-rederive-after-add");

    // One COMPLETE + one NOT_STARTED → derived IN_PROGRESS, definitely NOT Complete
    expect(txt).not.toContain("Complete");
    expect(txt).toContain("In Progress");
  });

  test("deleting a subtask re-derives the deliverable", async ({ page }) => {
    await login(page);
    const { projectUrl, deliverableId } = await setup(page);
    // add a 2nd subtask and complete BOTH → COMPLETE; then delete one → still COMPLETE (other complete)
    await addSubtask(page, projectUrl, deliverableId, "Second subtask");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await completeSubtask(page, 0);
    await page.waitForTimeout(400);
    await completeSubtask(page, 1);

    const lockedBadge = page.locator('[data-testid="deliverable-locked-badge"]').first();
    await expect(lockedBadge).toContainText("Complete", { timeout: 8_000 });

    // Delete the 2nd subtask → remaining one is COMPLETE → deliverable stays COMPLETE,
    // proving delete triggers a re-derive (no stale crash / no error).
    const row2 = page.locator('[data-testid="subtask-row"]').nth(1);
    await row2.hover();
    await row2.locator('button[title="Delete subtask"]').click();
    await page.waitForTimeout(150);
    await row2.getByText("Yes", { exact: true }).click();
    await page.waitForTimeout(600);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="subtask-row"]')).toHaveCount(1);
    const badge = page.locator('[data-testid="deliverable-locked-badge"]').first();
    await expect(badge).toContainText("Complete");
    console.log("  after delete: deliverable =", (await badge.textContent())?.trim());
  });
});
