import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, E2E_MARKER } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/10-meetings-status-lifecycle/R10.1-meeting-types-visibility/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R10.1 — meeting types & configurable submit window", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("configurable submit window persists; calendar offers Lead/Eboard meeting types", async ({ page }) => {
    await login(page);

    // ── Configurable status-submit window ─────────────────────────────────────
    await page.goto("/pm/settings");
    const win = page.locator('[data-testid="status-submit-window"]');
    await expect(win).toBeVisible();
    await win.fill("5");
    await page.getByRole("button", { name: "Save thresholds" }).click();
    await page.waitForTimeout(400);
    await page.goto("/pm/settings");
    await expect(page.locator('[data-testid="status-submit-window"]')).toHaveValue("5");
    console.log("  submit window persisted (5).");
    // reset to default
    await page.locator('[data-testid="status-submit-window"]').fill("3");
    await page.getByRole("button", { name: "Save thresholds" }).click();
    await page.waitForTimeout(300);

    // ── Calendar: create a LEAD_MEETING ───────────────────────────────────────
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Add event" }).first().click();

    const typeSelect = page.locator('select[name="type"]');
    await expect(typeSelect).toBeVisible();
    // both new meeting types are offered
    await expect(typeSelect.locator('option[value="LEAD_MEETING"]')).toHaveCount(1);
    await expect(typeSelect.locator('option[value="EBOARD_MEETING"]')).toHaveCount(1);

    await page.locator('input[name="title"]').fill(E2E_MARKER + "Lead sync");
    await typeSelect.selectOption("LEAD_MEETING");
    await page.locator('input[name="startsAt"]').fill("2026-07-15T10:00");
    await shot(page, "r10-lead-meeting-editor");
    await page.getByRole("button", { name: "Add Event", exact: true }).click(); // editor submit
    await page.waitForTimeout(500);

    // Switch to Agenda view (lists all semester events regardless of month)
    await page.getByRole("button", { name: "Agenda" }).click();
    await page.waitForLoadState("networkidle");

    // The LEAD_MEETING (created with type=LEAD_MEETING) appears for the PM (has VIEW_LEAD_MEETINGS).
    const item = page.getByText("Lead sync").first();
    await expect(item).toBeVisible({ timeout: 10_000 });
    await shot(page, "r10-lead-meeting-created");
    console.log("  LEAD_MEETING created and visible to PM.");
  });
});
