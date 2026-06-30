import { test, expect } from "@playwright/test";
import { login, createProject, createDeliverable } from "./helpers";
import { isValidDateInput, parseDateInput, DateInputError } from "../src/lib/date";

/**
 * R20.2 — date-input robustness.
 *
 * The shared guard (`src/lib/date.ts`) is the root fix: impossible/invalid dates become a
 * typed error instead of silently rolling over (06/31 → 07/01) or reaching Prisma as an
 * Invalid Date. Native `<input type="date">` already prevents typing an impossible value
 * through the picker, so the guard is the defensive backstop — verified here at the helper
 * and (valid-path) UI level, plus that field errors surface inline rather than crashing.
 */

test.describe("R20.2 — date guard (helper)", () => {
  test("isValidDateInput accepts empty + real dates, rejects impossible/garbage", () => {
    // empty = "no date" is acceptable
    expect(isValidDateInput("")).toBe(true);
    expect(isValidDateInput(null)).toBe(true);
    // real dates
    expect(isValidDateInput("2026-06-15")).toBe(true);
    expect(isValidDateInput("2026-12-31")).toBe(true);
    // impossible calendar dates (would silently roll over with new Date())
    expect(isValidDateInput("2026-06-31")).toBe(false);
    expect(isValidDateInput("2026-02-30")).toBe(false);
    // malformed
    expect(isValidDateInput("2026-13-01")).toBe(false);
    expect(isValidDateInput("garbage")).toBe(false);
  });

  test("parseDateInput returns null/Date or throws DateInputError (never an Invalid Date)", () => {
    expect(parseDateInput("")).toBeNull();
    expect(parseDateInput(null)).toBeNull();

    const d = parseDateInput("2026-12-31");
    expect(d).toBeInstanceOf(Date);
    // anchored to UTC midnight (matches the app's UTC date formatting)
    expect(d!.toISOString()).toBe("2026-12-31T00:00:00.000Z");

    // impossible/garbage → typed error, so a bad Date never reaches Prisma
    for (const bad of ["2026-06-31", "2026-02-30", "2026-13-01", "garbage"]) {
      expect(() => parseDateInput(bad)).toThrow(DateInputError);
    }
  });
});

test.describe("R20.2 — date inputs in the UI", () => {
  test("a valid date saves and displays in UTC (no off-by-one)", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R20 Date ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R20 UTC Deliverable", "2026-12-31");

    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    // Dec 31 must render as Dec 31 (UTC), not Dec 30 (local shift for US-Eastern viewers).
    await expect(page.getByText("Target: Dec 31, 2026")).toBeVisible();
  });

  test("an invalid date range surfaces an inline error and never crashes the page", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R20 Inline ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R20 Inline Deliverable", "2026-06-15");

    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // Open the deliverable edit modal (Edit button reveals on header hover).
    await page.locator('[data-testid="deliverable-header"]').first().hover();
    await page.locator('[data-testid="deliverable-edit"]').first().click();
    await expect(page.getByText("Edit deliverable")).toBeVisible();

    // Set start AFTER target → the modal must show an inline error, not throw/crash.
    await page.locator('[data-testid="deliv-modal-start"]').fill("2026-06-20");
    await page.locator('[data-testid="deliv-modal-target"]').fill("2026-06-15");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Start date must be before the target date")).toBeVisible();
    // The page is still alive (modal title still visible, no Next error overlay).
    await expect(page.getByText("Edit deliverable")).toBeVisible();
  });
});
