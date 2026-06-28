import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { addSubtaskViaModal, E2E_MARKER } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/7-inline-edit-polish/R7.3-deliverable-lock-tooltip/screenshots"
);

async function login(page: Page) {
  await page.goto("/dev-login");
  await page.fill("#netId", "jav273");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

async function shot(page: Page, name: string) {
  const dest = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function getProjectWithLockedDeliverable(page: Page): Promise<string> {
  // Always create fresh (marker-tagged) so tests never mutate real projects.
  console.log("  Creating project with locked deliverable…");
  await page.goto("/projects/new");
  await page.fill('input[name="name"]', E2E_MARKER + `R7.3 Tooltip Project ${Date.now()}`);
  await page.fill('input[name="semester"]', "Test 2026");
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
    { timeout: 15_000 }
  );
  const projectUrl = new URL(page.url()).pathname;

  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="title"]', "Locked Deliverable");
  await page.fill('input[name="targetDate"]', "2026-12-31");
  await page.getByRole("button", { name: "Add Deliverable" }).click();
  await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  const card = page.locator("[data-deliverable-id]").first();
  await expect(card).toBeVisible({ timeout: 10_000 });

  // Subtask via the modal (locks the deliverable status) — /subtasks/new removed in set 8
  await page.goto(projectUrl);
  await page.waitForLoadState("networkidle");
  await addSubtaskViaModal(page, "Lock Subtask");

  return projectUrl;
}

test.describe("R7.3 — deliverable lock tooltip (shadcn)", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  test("locked badge shows shadcn tooltip with lock reason; old custom div gone", async ({ page }) => {
    await login(page);
    const projectUrl = await getProjectWithLockedDeliverable(page);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // ── Baseline: locked badge visible ────────────────────────────────────────
    const lockedBadge = page.locator('[data-testid="deliverable-locked-badge"]').first();
    await expect(lockedBadge).toBeVisible();
    await shot(page, "r7-tooltip-baseline");

    // Old custom hover div should not exist
    const oldTooltipDiv = page.locator('.group\\/badge .absolute.bottom-full');
    await expect(oldTooltipDiv).toHaveCount(0);

    // R7.3 round-2: no cursor change on the locked badge (was cursor-help)
    const badgeCursor = await lockedBadge.evaluate((el) => window.getComputedStyle(el).cursor);
    console.log("  Locked badge cursor:", badgeCursor);
    expect(badgeCursor).not.toBe("help");

    // ── Hover the locked badge → tooltip should appear ─────────────────────
    await lockedBadge.hover();
    // Base UI tooltip has a delay, wait for it to open
    await page.waitForTimeout(600);
    await shot(page, "r7-tooltip-visible");

    // Tooltip content is rendered via portal — Base UI uses data-slot="tooltip-content"
    const tooltip = page.locator('[data-slot="tooltip-content"]');
    await expect(tooltip).toBeVisible({ timeout: 3_000 });

    const tooltipText = (await tooltip.textContent())?.trim() ?? "";
    console.log("  Tooltip text:", tooltipText);

    // Text should match LOCK_REASON based on deliverable.status
    expect(tooltipText).toMatch(/Status is locked/);
    expect(tooltipText.length).toBeGreaterThan(10);

    // Tooltip renders in a portal (body-level) — not inside the card
    const tooltipBox = await tooltip.boundingBox();
    console.log("  Tooltip bounding box:", JSON.stringify(tooltipBox));
    expect(tooltipBox).not.toBeNull();
    expect(tooltipBox!.width).toBeGreaterThan(50);

    // ── Mouse away → tooltip dismisses ───────────────────────────────────────
    await page.mouse.move(400, 400);
    await page.waitForTimeout(300);
    await expect(tooltip).not.toBeVisible({ timeout: 2_000 });
    await shot(page, "r7-tooltip-dismissed");

    console.log("  All R7.3 tooltip assertions passed.");
  });
});
