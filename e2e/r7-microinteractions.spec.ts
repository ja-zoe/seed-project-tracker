import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { addSubtaskViaModal } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/7-inline-edit-polish/R7.2-confirm-microinteractions/screenshots"
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
  const links = page.locator('a[href^="/projects/"]').filter({
    hasNot: page.locator('[href="/projects/new"]'),
  });
  if ((await links.count()) > 0) {
    const href = await links.first().getAttribute("href");
    if (href) {
      await page.goto(href);
      await page.waitForLoadState("networkidle");
      if ((await page.locator('[data-testid="subtask-row"]').count()) > 0) return href;
    }
  }

  // Create test data
  console.log("  Creating test project + deliverable + subtask…");
  await page.goto("/projects/new");
  await page.fill('input[name="name"]', "R7.2 Test Project");
  await page.fill('input[name="semester"]', "Test 2026");
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
    { timeout: 15_000 }
  );
  const projectUrl = new URL(page.url()).pathname;

  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="title"]', "R7.2 Deliverable");
  await page.fill('input[name="targetDate"]', "2026-12-31");
  await page.getByRole("button", { name: "Add Deliverable" }).click();
  await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  const card = page.locator("[data-deliverable-id]").first();
  await expect(card).toBeVisible({ timeout: 10_000 });

  // Subtask via the modal (the /subtasks/new page was removed in set 8)
  await page.goto(projectUrl);
  await page.waitForLoadState("networkidle");
  await addSubtaskViaModal(page, "R7.2 Subtask");

  return projectUrl;
}

test.describe("R7.2 — confirm microinteractions", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  test("InlineConfirm slides in, label fades, bg transitions", async ({ page }) => {
    await login(page);
    const projectUrl = await getProjectWithSubtask(page);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator('[data-testid="subtask-row"]').first();
    const pillContainer = firstRow.locator('[data-testid="status-pill-container"]').first();
    const pillBtn = firstRow.locator('[data-testid="status-pill"]').first();

    // ── Baseline ──────────────────────────────────────────────────────────────
    await shot(page, "r7-micro-baseline");

    const baseBg = await pillContainer.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log("  Baseline bg:", baseBg);

    // InlineConfirm controls are in DOM but collapsed (max-w-0 / opacity-0)
    const confirmBtn = firstRow.locator('button[title="Confirm"]').first();
    const cancelBtn = firstRow.locator('button[title="Cancel"]').first();

    // Controls should be present but visually hidden (aria-hidden on parent)
    const confirmHidden = await firstRow.locator('[aria-hidden="true"]').count();
    expect(confirmHidden).toBeGreaterThan(0);

    // ── Open dropdown, pick a different status ─────────────────────────────
    await pillBtn.click();
    await page.waitForTimeout(100);

    const dropdown = page.locator('[style*="z-index: 9999"]:has(button)').first();
    await expect(dropdown).toBeVisible();

    const currentLabel = await pillBtn.textContent();
    const options = dropdown.locator("button");
    let picked = false;
    for (let i = 0; i < (await options.count()); i++) {
      const label = await options.nth(i).textContent();
      if (label?.trim() && label.trim() !== currentLabel?.trim()) {
        await options.nth(i).click();
        picked = true;
        break;
      }
    }
    if (!picked) throw new Error("Could not pick a different status");

    // ── Confirm controls should slide in ──────────────────────────────────
    await page.waitForTimeout(50); // just past the transition start
    await shot(page, "r7-micro-confirm-revealing");

    await page.waitForTimeout(200); // wait for full 150ms transition
    await shot(page, "r7-micro-confirm-in");

    // Both ✓ and ✗ now visible
    await expect(confirmBtn).toBeVisible({ timeout: 3_000 });
    await expect(cancelBtn).toBeVisible({ timeout: 3_000 });

    // ── R7.2 round-2: confirm/cancel render Phosphor icons, not ✓/✗ glyphs ──
    const confirmHasSvg = await confirmBtn.locator("svg").count();
    const cancelHasSvg = await cancelBtn.locator("svg").count();
    expect(confirmHasSvg).toBeGreaterThan(0);
    expect(cancelHasSvg).toBeGreaterThan(0);
    const confirmText = (await confirmBtn.textContent())?.trim() ?? "";
    expect(confirmText).not.toContain("✓");
    // Confirm icon should be green (#588157 → rgb(88, 129, 87)) like the row edit panel
    const confirmColor = await confirmBtn.evaluate((el) => window.getComputedStyle(el).color);
    console.log("  Confirm icon color:", confirmColor);
    expect(confirmColor).toBe("rgb(88, 129, 87)");

    // status-pill (idle button) removed
    await expect(pillBtn).toHaveCount(0);

    // Container is still visible with new background
    await expect(pillContainer).toBeVisible();
    const confirmBg = await pillContainer.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log("  Confirm-state bg:", confirmBg);

    // ── Cancel: controls slide out, label fades back ───────────────────────
    await cancelBtn.click();
    await page.waitForTimeout(200);
    await shot(page, "r7-micro-confirm-cancelled");

    // Idle button returns
    await expect(firstRow.locator('[data-testid="status-pill"]').first()).toBeVisible({ timeout: 3_000 });
    // Background reverts to original
    const revertedBg = await pillContainer.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(revertedBg).toBe(baseBg);

    // ── Commit path: pick → confirm ────────────────────────────────────────
    const freshPill = firstRow.locator('[data-testid="status-pill"]').first();
    await freshPill.click();
    await page.waitForTimeout(100);

    const dropdown2 = page.locator('[style*="z-index: 9999"]:has(button)').first();
    await expect(dropdown2).toBeVisible();
    const currentLabel2 = await freshPill.textContent();
    const options2 = dropdown2.locator("button");
    for (let i = 0; i < (await options2.count()); i++) {
      const label = await options2.nth(i).textContent();
      if (label?.trim() && label.trim() !== currentLabel2?.trim()) {
        await options2.nth(i).click();
        break;
      }
    }
    await page.waitForTimeout(200);

    // Capture which status we're about to commit (shown in the pill during confirm)
    const pendingLabelEl = firstRow.locator('[data-testid="status-pill-container"] span').first();
    const pendingLabel = (await pendingLabelEl.textContent())?.trim() ?? "";
    console.log("  Pending label to commit:", pendingLabel);

    const confirmBtn2 = firstRow.locator('button[title="Confirm"]').first();
    await expect(confirmBtn2).toBeVisible({ timeout: 3_000 });
    await confirmBtn2.click();

    // Wait for revalidation: pill container shows the new committed label
    const pillContainerAfter = firstRow.locator('[data-testid="status-pill-container"]').first();
    await expect(pillContainerAfter).toContainText(pendingLabel, { timeout: 8_000 });
    // Idle pill button returns (no longer confirming)
    await expect(firstRow.locator('[data-testid="status-pill"]').first()).toBeVisible({ timeout: 3_000 });
    await page.waitForTimeout(200);
    await shot(page, "r7-micro-committed");
    console.log("  Committed — pill shows:", pendingLabel);

    console.log("  All R7.2 microinteraction assertions passed.");
  });
});
