import { test, expect } from "@playwright/test";
import { login, E2E_MARKER } from "./helpers";

/**
 * R22.3 — Multi-day events. An event whose endsAt falls on a later day must appear on
 * every day it spans in the month grid (with a continuation treatment after day one),
 * and single-day events must render exactly once.
 */

const SEMESTER = "Test 2026";

/** datetime-local string for today+offsetDays at the given hour (local time). */
function dtAt(offsetDays: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

test("a 3-day event shows on all three days; a single-day event on one", async ({ page }) => {
  await login(page);
  await page.goto(`/calendar?semester=${encodeURIComponent(SEMESTER)}`);
  await page.waitForLoadState("networkidle");

  // 3-day event: today 10:00 → today+2 15:00. Today is kept off month edges by using
  // the current date; if today is within 2 days of month end, span backward instead.
  const now = new Date();
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const startOffset = now.getDate() + 2 > lastOfMonth ? -2 : 0;

  const multiTitle = E2E_MARKER + "multiday retreat";
  await page.getByRole("button", { name: "Add event" }).first().click();
  await page.locator('input[name="title"]').fill(multiTitle);
  await page.locator('input[name="startsAt"]').fill(dtAt(startOffset, 10));
  await page.locator('input[name="endsAt"]').fill(dtAt(startOffset + 2, 15));
  await page.getByRole("button", { name: "Add Event", exact: true }).click();
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const multiChips = page.getByRole("button", { name: new RegExp("multiday retreat") });
  await expect(multiChips.first()).toBeVisible({ timeout: 10_000 });
  await expect(multiChips).toHaveCount(3);

  // Exactly one start chip and two continuation chips.
  await expect(
    page.locator('[data-event-day="start"]', { hasText: "multiday retreat" })
  ).toHaveCount(1);
  await expect(
    page.locator('[data-event-day="continuation"]', { hasText: "multiday retreat" })
  ).toHaveCount(2);

  // Single-day control: with an endsAt the same day — renders exactly once, no continuation.
  const singleTitle = E2E_MARKER + "single day sync";
  await page.getByRole("button", { name: "Add event" }).first().click();
  await page.locator('input[name="title"]').fill(singleTitle);
  await page.locator('input[name="startsAt"]').fill(dtAt(startOffset, 9));
  await page.locator('input[name="endsAt"]').fill(dtAt(startOffset, 11));
  await page.getByRole("button", { name: "Add Event", exact: true }).click();
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const singleChips = page.getByRole("button", { name: new RegExp("single day sync") });
  await expect(singleChips.first()).toBeVisible({ timeout: 10_000 });
  await expect(singleChips).toHaveCount(1);
  await expect(
    page.locator('[data-event-day="continuation"]', { hasText: "single day sync" })
  ).toHaveCount(0);
});
