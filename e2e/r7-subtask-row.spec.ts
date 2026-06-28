import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { addSubtaskViaModal } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/7-inline-edit-polish/R7.1-subtask-row-polish/screenshots"
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

async function getProjectWithSubtask(page: Page): Promise<string> {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  const projectLinks = page.locator('a[href^="/projects/"]').filter({
    hasNot: page.locator('[href="/projects/new"]'),
  });
  if ((await projectLinks.count()) > 0) {
    const href = await projectLinks.first().getAttribute("href");
    if (href) {
      await page.goto(href);
      await page.waitForLoadState("networkidle");
      if ((await page.locator('[data-testid="subtask-row"]').count()) > 0) return href;
    }
  }

  // Create one
  await page.goto("/projects/new");
  await page.fill('input[name="name"]', "R7 Test Project");
  await page.fill('input[name="semester"]', "Test 2026");
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
    { timeout: 15_000 }
  );
  const projectUrl = new URL(page.url()).pathname;

  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="title"]', "R7 Deliverable");
  await page.fill('input[name="targetDate"]', "2026-12-31");
  await page.getByRole("button", { name: "Add Deliverable" }).click();
  await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  const card = page.locator("[data-deliverable-id]").first();
  await expect(card).toBeVisible({ timeout: 10_000 });

  // Subtask via the modal (the /subtasks/new page was removed in set 8)
  await page.goto(projectUrl);
  await page.waitForLoadState("networkidle");
  await addSubtaskViaModal(page, "R7 Subtask");

  return projectUrl;
}

test.describe("R7.1 — subtask row polish", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  test("status bullet, pill padding, click-name-to-reassign", async ({ page }) => {
    await login(page);
    const projectUrl = await getProjectWithSubtask(page);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator('[data-testid="subtask-row"]').first();

    // ── Default state ──────────────────────────────────────────────────────────
    await shot(page, "r7-subtask-row-default");

    // 1. Status bullet present (visual only — span, not button)
    const bullet = firstRow.locator('[data-testid="status-bullet"]');
    await expect(bullet).toBeVisible();
    const bulletTag = await bullet.evaluate((el) => el.tagName.toLowerCase());
    expect(bulletTag).toBe("span");

    // Bullet background matches STATUS_DOT_COLOR (one of the 4 status hex values)
    const bulletBg = await bullet.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log("  Bullet bg:", bulletBg);
    expect([
      "rgb(120, 119, 116)", // NOT_STARTED
      "rgb(31, 108, 159)",  // IN_PROGRESS
      "rgb(164, 80, 60)",   // BLOCKED
      "rgb(88, 129, 87)",   // COMPLETE
    ]).toContain(bulletBg);

    // 2. Pill padding — py-1 (4px top+bottom in px) — measured on the container
    const pillContainer = firstRow.locator('[data-testid="status-pill-container"]').first();
    if ((await pillContainer.count()) > 0) {
      const pillPaddingTop = await pillContainer.evaluate(
        (el) => parseFloat(window.getComputedStyle(el).paddingTop)
      );
      console.log("  Pill container padding-top:", pillPaddingTop, "px");
      expect(pillPaddingTop).toBeGreaterThanOrEqual(4); // py-1 = 4px
    }

    // ── Hover state — bullet should glow ──────────────────────────────────────
    await firstRow.hover();
    await page.waitForTimeout(250);
    await shot(page, "r7-status-bullet-hover");

    const bulletShadow = await bullet.evaluate(
      (el) => window.getComputedStyle(el).boxShadow
    );
    console.log("  Bullet box-shadow on hover:", bulletShadow);
    // Not "none" — some shadow was applied
    expect(bulletShadow).not.toBe("none");

    // 3. No UserCircle button in Panel A
    const userCircleBtn = firstRow.locator('button[title="Change assignee"]');
    // Panel A should only have CalendarBlank + delete — no separate UserCircle button
    // (The assignee name is now the trigger; it has title="Change assignee" too, so we
    //  check it's not in a panel but is the name button itself)
    const panelAUserCircle = firstRow.locator(
      '.flex.items-center.gap-1\\.5 button[title="Change assignee"]'
    );
    await expect(panelAUserCircle).toHaveCount(0);

    // 4. Clicking assignee name (or "Unassigned") opens picker
    const assigneeBtn = firstRow.locator('button[title="Change assignee"]').first();
    await expect(assigneeBtn).toBeVisible();
    await assigneeBtn.click();
    await page.waitForTimeout(250);
    await shot(page, "r7-assignee-name-click");

    const picker = page.locator('[data-testid="assignee-picker"]');
    await expect(picker).toBeVisible({ timeout: 5_000 });

    const pickerBox = await picker.boundingBox();
    console.log("  Picker box:", JSON.stringify(pickerBox));
    expect(pickerBox).not.toBeNull();
    // Picker must be in the page viewport (y > 50 — not stuck at top)
    expect(pickerBox!.y).toBeGreaterThan(50);
    expect(pickerBox!.width).toBeGreaterThan(100);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    console.log("  All R7.1 assertions passed.");
  });
});
