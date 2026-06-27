import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/7-inline-edit-polish/R7.4-inline-deliverable-editing/screenshots"
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

async function getProjectWithDeliverable(page: Page): Promise<string> {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  const links = page.locator('a[href^="/projects/"]').filter({
    hasNot: page.locator('[href="/projects/new"]'),
  });
  for (let i = 0; i < (await links.count()); i++) {
    const href = await links.nth(i).getAttribute("href");
    if (!href) continue;
    await page.goto(href);
    await page.waitForLoadState("networkidle");
    // Need a deliverable with canEdit = true (title pencil visible on hover)
    const header = page.locator('.border.border-border.rounded-xl .bg-card').first();
    if ((await header.count()) > 0) return href;
  }

  // Create one
  await page.goto("/projects/new");
  await page.fill('input[name="name"]', "R7.4 Edit Project");
  await page.fill('input[name="semester"]', "Test 2026");
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
    { timeout: 15_000 }
  );
  const projectUrl = new URL(page.url()).pathname;

  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="title"]', "R7.4 Original Title");
  await page.fill('input[name="targetDate"]', "2026-12-31");
  await page.getByRole("button", { name: "Add Deliverable" }).click();
  await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  return projectUrl;
}

test.describe("R7.4 — inline deliverable editing", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  test("title pencil appears on hover; edit + confirm persists new title", async ({ page }) => {
    await login(page);
    const projectUrl = await getProjectWithDeliverable(page);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const header = page.locator('.border.border-border.rounded-xl .bg-card').first();
    await expect(header).toBeVisible();
    await shot(page, "r7-deliv-default");

    // ── Title pencil hidden at rest ────────────────────────────────────────────
    const titlePencil = header.locator('[data-testid="deliv-title-pencil"]').first();
    // It exists in DOM but is transparent (opacity-0); Playwright sees hidden
    const pencilInitialOpacity = await titlePencil.evaluate(
      (el) => window.getComputedStyle(el).opacity
    );
    console.log("  Title pencil initial opacity:", pencilInitialOpacity);
    expect(parseFloat(pencilInitialOpacity)).toBeLessThan(0.5);

    // ── Hover → pencil visible ────────────────────────────────────────────────
    await header.hover();
    await page.waitForTimeout(300);
    await shot(page, "r7-deliv-hover-pencil");

    const pencilHoverOpacity = await titlePencil.evaluate(
      (el) => window.getComputedStyle(el).opacity
    );
    console.log("  Title pencil hover opacity:", pencilHoverOpacity);
    expect(parseFloat(pencilHoverOpacity)).toBeGreaterThan(0.5);

    // ── Click pencil → input appears ─────────────────────────────────────────
    await titlePencil.click();
    await page.waitForTimeout(150);

    const titleInput = header.locator('[data-testid="deliv-title-input"]').first();
    await expect(titleInput).toBeVisible({ timeout: 3_000 });
    await shot(page, "r7-deliv-title-editing");

    // InlineConfirm should be visible
    const confirmBtn = header.locator('button[title="Confirm"]').first();
    const cancelBtn = header.locator('button[title="Cancel"]').first();
    await expect(confirmBtn).toBeVisible();
    await expect(cancelBtn).toBeVisible();

    // ── Type new title ────────────────────────────────────────────────────────
    const newTitle = `R7.4 Edited ${Date.now()}`;
    await titleInput.fill(newTitle);
    await shot(page, "r7-deliv-title-filled");

    // ── Confirm → input gone, new title in DOM ────────────────────────────────
    await confirmBtn.click();
    await page.waitForTimeout(200);
    // After RSC revalidation, the new title should appear
    await expect(header.locator(`text=${newTitle}`)).toBeVisible({ timeout: 10_000 });
    await shot(page, "r7-deliv-title-committed");
    console.log("  New title confirmed:", newTitle);

    // ── Cancel reverts ────────────────────────────────────────────────────────
    await header.hover();
    await page.waitForTimeout(200);
    const titlePencil2 = header.locator('[data-testid="deliv-title-pencil"]').first();
    await titlePencil2.click();
    await page.waitForTimeout(150);
    const titleInput2 = header.locator('[data-testid="deliv-title-input"]').first();
    await titleInput2.fill("This will be cancelled");
    const cancelBtn2 = header.locator('button[title="Cancel"]').first();
    await cancelBtn2.click();
    await page.waitForTimeout(150);
    // The new title (from previous commit) should still be shown, not the cancelled edit
    await expect(header.locator(`text=${newTitle}`)).toBeVisible();
    await shot(page, "r7-deliv-title-cancel-reverted");
    console.log("  Cancel correctly reverted.");
  });

  test("dates pencil appears on hover; edit + confirm persists new dates", async ({ page }) => {
    await login(page);
    const projectUrl = await getProjectWithDeliverable(page);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const header = page.locator('.border.border-border.rounded-xl .bg-card').first();
    await expect(header).toBeVisible();

    // ── Hover dates area → dates pencil visible ───────────────────────────────
    const datesGroup = header.locator('.group\\/deliv-dates').first();
    await datesGroup.hover();
    await page.waitForTimeout(300);
    await shot(page, "r7-deliv-dates-hover");

    const datesPencil = datesGroup.locator('[data-testid="deliv-dates-pencil"]').first();
    const datesPencilOpacity = await datesPencil.evaluate(
      (el) => window.getComputedStyle(el).opacity
    );
    console.log("  Dates pencil hover opacity:", datesPencilOpacity);
    expect(parseFloat(datesPencilOpacity)).toBeGreaterThan(0.5);

    // ── Click pencil → date inputs appear ────────────────────────────────────
    await datesPencil.click();
    await page.waitForTimeout(150);

    const targetInput = header.locator('[data-testid="deliv-target-input"]').first();
    await expect(targetInput).toBeVisible({ timeout: 3_000 });
    const startInput = header.locator('[data-testid="deliv-start-input"]').first();
    await expect(startInput).toBeVisible();
    await shot(page, "r7-deliv-dates-editing");

    // ── Set valid dates ───────────────────────────────────────────────────────
    await startInput.fill("2026-01-15");
    await targetInput.fill("2026-11-30");
    await shot(page, "r7-deliv-dates-filled");

    const confirmBtn = header.locator('button[title="Confirm"]').first();
    await confirmBtn.click();
    await page.waitForTimeout(200);

    // After RSC revalidation, dates should update
    await expect(header.locator('text=Nov')).toBeVisible({ timeout: 10_000 });
    await shot(page, "r7-deliv-dates-committed");
    console.log("  Dates confirmed (Nov 30 visible).");

    // ── Invalid: startDate > targetDate → error, no commit ───────────────────
    await datesGroup.hover();
    await page.waitForTimeout(200);
    const datesPencil2 = datesGroup.locator('[data-testid="deliv-dates-pencil"]').first();
    await datesPencil2.click();
    await page.waitForTimeout(150);
    const startInput2 = header.locator('[data-testid="deliv-start-input"]').first();
    const targetInput2 = header.locator('[data-testid="deliv-target-input"]').first();
    await startInput2.fill("2027-01-01");
    await targetInput2.fill("2026-01-01");
    const confirmBtn2 = header.locator('button[title="Confirm"]').first();
    await confirmBtn2.click();
    await page.waitForTimeout(200);
    await shot(page, "r7-deliv-dates-error");

    // Error message should appear, inputs still visible (no commit)
    const errorMsg = header.locator('text=Start must be before target').first();
    await expect(errorMsg).toBeVisible({ timeout: 3_000 });
    console.log("  Invalid date error shown correctly.");
    // Input should still be visible (edit was not committed)
    await expect(targetInput2).toBeVisible();
  });
});
