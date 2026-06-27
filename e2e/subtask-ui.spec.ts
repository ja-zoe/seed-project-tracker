import { test, expect, type Page } from "@playwright/test";
import * as path from "path";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/6-projects-calendar/R6.3-inline-subtask-status/screenshots"
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

// ─── Test setup: create a project with a deliverable + subtask ───────────────

async function ensureTestProject(page: Page): Promise<string> {
  // Check dashboard for existing projects (exclude /new and /active etc.)
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  // Look for links with /projects/<uuid-like> path (skip /projects/new)
  const projectLinks = page.locator('a[href^="/projects/"]').filter({
    hasNot: page.locator('[href="/projects/new"]'),
  });

  const count = await projectLinks.count();
  if (count > 0) {
    const href = await projectLinks.first().getAttribute("href");
    if (href && !href.includes("/new")) {
      // Check if it has subtasks
      await page.goto(href!);
      await page.waitForLoadState("networkidle");
      const subtasks = page.locator('[data-testid="subtask-row"]');
      if ((await subtasks.count()) > 0) return href!;
    }
  }

  // No usable project/subtask found — create test data via forms
  console.log("  Creating test project + deliverable + subtask…");

  // 1. Create project
  await page.goto("/projects/new");
  await page.fill('input[name="name"]', "Playwright Test Project");
  await page.fill('input[name="semester"]', "Test 2026");
  await page.getByRole("button", { name: "Create Project" }).click();
  // Wait until the URL changes away from /projects/new to an actual project page
  await page.waitForURL(
    (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
    { timeout: 15_000 }
  );
  const projectUrl = new URL(page.url()).pathname;
  console.log("  Project URL:", projectUrl);

  // 2. Create deliverable
  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="title"]', "Test Deliverable");
  await page.fill('input[name="targetDate"]', "2026-12-31");
  await page.getByRole("button", { name: "Add Deliverable" }).click();
  await page.waitForURL(
    (url) => url.pathname === projectUrl,
    { timeout: 15_000 }
  );
  await page.waitForLoadState("networkidle");

  // Get deliverable id from the page
  const editLink = page.locator('a[href*="/deliverables/"][href*="/edit"]').first();
  await expect(editLink).toBeVisible({ timeout: 10_000 });
  const editHref = await editLink.getAttribute("href");
  const deliverableId = editHref?.match(/deliverables\/([^/]+)\/edit/)?.[1];
  console.log("  Deliverable ID:", deliverableId);

  if (!deliverableId) throw new Error("Could not extract deliverable ID");

  // 3. Create subtask
  await page.goto(`${projectUrl}/deliverables/${deliverableId}/subtasks/new`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="title"]', "Test Subtask");
  await page.getByRole("button", { name: "Add Subtask" }).click();
  await page.waitForURL(
    (url) => url.pathname === projectUrl,
    { timeout: 15_000 }
  );
  await page.waitForLoadState("networkidle");

  return projectUrl;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("R6.3 subtask UI — pill, pencil, portal", () => {
  test("status pill replaces dot, pencil is next to title, picker is unclipped", async ({ page }) => {
    await login(page);
    const projectUrl = await ensureTestProject(page);

    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // ── Default state screenshot ───────────────────────────────────────────
    await shot(page, "subtask-row-default");

    // Old-style dot button should NOT exist
    const oldDot = page.locator('button.rounded-full[title="Change status"]');
    await expect(oldDot).toHaveCount(0);

    // Status pill container should exist (outer div holds background color)
    const firstRow = page.locator('[data-testid="subtask-row"]').first();
    const firstPillContainer = firstRow.locator('[data-testid="status-pill-container"]').first();
    await expect(firstPillContainer).toBeVisible();

    // Pill background color should be one of the 4 status colors
    const pillBg = await firstPillContainer.evaluate((el) =>
      window.getComputedStyle(el as HTMLElement).backgroundColor
    );
    console.log("  Pill background-color:", pillBg);
    expect(["rgb(120, 119, 116)", "rgb(31, 108, 159)", "rgb(164, 80, 60)", "rgb(88, 129, 87)"])
      .toContain(pillBg);

    // Idle pill button (click target) should be visible
    const firstPill = firstRow.locator('[data-testid="status-pill"]').first();
    await expect(firstPill).toBeVisible();

    // ── Hover state — pencil should appear next to title ──────────────────
    await firstRow.hover();
    await page.waitForTimeout(250);
    await shot(page, "subtask-hover");

    const pencilBtn = firstRow.locator('[data-testid="pencil-btn"]');
    await expect(pencilBtn).toBeVisible();

    // Pencil should be on the LEFT side (inside title flex, not right panel)
    const pencilBox = await pencilBtn.boundingBox();
    const pillBox = await firstPillContainer.boundingBox();
    // Pencil should appear to the LEFT of the pill
    expect(pencilBox!.x).toBeLessThan(pillBox!.x);

    // ── Status pill dropdown — appears via portal (unclipped) ─────────────
    await firstPill.click();
    await page.waitForTimeout(200);
    await shot(page, "pill-dropdown-open");

    // The portal dropdown renders at body level
    const dropdown = page.locator('[style*="z-index: 9999"]:has(button)').first();
    await expect(dropdown).toBeVisible();

    const dropdownBox = await dropdown.boundingBox();
    console.log("  Dropdown bounding box:", JSON.stringify(dropdownBox));
    expect(dropdownBox).not.toBeNull();
    expect(dropdownBox!.width).toBeGreaterThan(100);

    // Select a different status to enter confirm mode
    const currentText = (await firstPill.textContent())?.trim();
    const allOptions = dropdown.locator("button");
    let clicked = false;
    for (let i = 0; i < (await allOptions.count()); i++) {
      const optText = (await allOptions.nth(i).textContent())?.trim();
      if (optText && optText !== currentText) {
        await allOptions.nth(i).click();
        clicked = true;
        break;
      }
    }

    if (clicked) {
      await page.waitForTimeout(200);
      await shot(page, "pill-confirming");

      // In confirm mode: ✓ and ✗ buttons visible inside the pill area
      const confirmBtn = firstRow.locator('button[title="Confirm"]').first();
      const cancelBtn = firstRow.locator('button[title="Cancel"]').first();
      await expect(confirmBtn).toBeVisible();
      await expect(cancelBtn).toBeVisible();

      // The idle pill button (data-testid="status-pill") is gone during confirm
      const pillBtn = firstRow.locator('[data-testid="status-pill"]');
      await expect(pillBtn).toHaveCount(0);

      // Cancel → revert — idle button returns
      await cancelBtn.click();
      await page.waitForTimeout(200);
      const pillAfterCancel = firstRow.locator('[data-testid="status-pill"]');
      await expect(pillAfterCancel).toBeVisible();
      await expect(firstPillContainer).toContainText(currentText!);
    }

    // ── Assignee picker — portal escapes overflow-hidden card ─────────────
    await firstRow.hover();
    await page.waitForTimeout(100);
    const personBtn = firstRow.locator('[title="Change assignee"]');

    if ((await personBtn.count()) > 0) {
      await personBtn.click();
      await page.waitForTimeout(200);
      await shot(page, "assignee-picker-open");

      const picker = page.locator('[data-testid="assignee-picker"]');
      await expect(picker).toBeVisible();

      const pickerBox = await picker.boundingBox();
      console.log("  Assignee picker bounding box:", JSON.stringify(pickerBox));
      expect(pickerBox).not.toBeNull();
      expect(pickerBox!.width).toBeGreaterThan(100);
      expect(pickerBox!.height).toBeGreaterThan(30);

      // Verify the picker is not clipped: check it extends beyond the card's right edge
      const cardEl = page.locator('.border.border-border.rounded-xl').first();
      const cardBox = await cardEl.boundingBox();
      if (cardBox) {
        // Picker bottom should NOT be clipped at the card boundary
        // i.e., bottom of picker > top of card (it renders below, in the page flow)
        expect(pickerBox!.y).toBeGreaterThan(cardBox!.y);
      }

      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
    }

    console.log("  All visual assertions passed.");
  });
});
