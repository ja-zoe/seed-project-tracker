import { test, expect, type Page, type Locator } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable, addSubtaskViaModal } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/8-subtask-modal-bulk-fixes/R8.3-due-date-bounds-and-year/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function setDueInline(page: Page, row: Locator, value: string) {
  await row.hover();
  await row.locator('button[title="Edit due date"]').click();
  const input = row.locator('input[type="date"]');
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.press("Enter");
}

test.describe("R8.3 — subtask due-date bounds & year display", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("inline date input is bounded by the deliverable; year shown only when not current", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R8.3 ${Date.now()}`);
    // Deliverable target is end of the current year (2026 per the test clock)
    await createDeliverable(page, projectUrl, "R8.3 Deliverable", "2026-12-31");
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await addSubtaskViaModal(page, "Date subtask");

    const row = page.locator('[data-testid="subtask-row"]', { hasText: "Date subtask" });

    // ── Inline date input exposes max = deliverable target ────────────────────
    await row.hover();
    await row.locator('button[title="Edit due date"]').click();
    const input = row.locator('input[type="date"]');
    await expect(input).toHaveAttribute("max", "2026-12-31");
    await shot(page, "r8-date-bounded");
    await input.press("Escape");

    // ── Same-year due date → no year in the label ─────────────────────────────
    // (Dates render a day earlier than the ISO value due to a pre-existing UTC/local
    //  display quirk — see "Dec 30" for a 2026-12-31 target — so assert on the YEAR.)
    await setDueInline(page, row, "2026-08-15");
    await expect(row).toContainText("Aug", { timeout: 8_000 });
    await expect(row).not.toContainText("2026"); // current year → no year shown
    console.log("  same-year label has no year ✓");

    // ── Different-year due date → year IS shown ───────────────────────────────
    await setDueInline(page, row, "2025-08-15");
    await expect(row).toContainText("2025", { timeout: 8_000 });
    await shot(page, "r8-year-shown");
    console.log("  different-year label includes the year ✓");

    // ── Modal guards a due date beyond the deliverable target ─────────────────
    await page.locator('[data-testid="add-subtask"]').first().click();
    await page.locator('[data-testid="subtask-modal-title"]').fill("Beyond bound");
    // fill() bypasses the input's max attribute, exercising the modal's own guard
    await page.locator('[data-testid="subtask-modal-duedate"]').fill("2027-03-01");
    await page.locator('[data-testid="subtask-modal-submit"]').click();
    await expect(page.getByText("Due date can't be after the deliverable's target date")).toBeVisible();
    await shot(page, "r8-modal-bound-error");
    console.log("  modal rejects out-of-range due date ✓");
  });
});
