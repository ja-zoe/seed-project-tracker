import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, E2E_MARKER } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/10-meetings-status-lifecycle/R10.3-calendar-export/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R10.3 — calendar export (ICS + Google)", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("Export .ics returns a valid calendar with visible events; per-event Google link", async ({ page }) => {
    await login(page);

    // Create a lead meeting so the export has something distinctive to assert.
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Add event" }).first().click();
    const title = E2E_MARKER + "R10.3 export evt";
    await page.locator('input[name="title"]').fill(title);
    await page.locator('select[name="type"]').selectOption("LEAD_MEETING");
    await page.locator('input[name="startsAt"]').fill("2026-07-20T09:00");
    await page.getByRole("button", { name: "Add Event", exact: true }).click();
    await page.waitForTimeout(400);

    // ── The toolbar exposes an Export .ics link ───────────────────────────────
    const exportLink = page.locator('[data-testid="export-ics"]');
    await expect(exportLink).toBeVisible();
    await expect(exportLink).toHaveAttribute("href", /\/api\/calendar\/ics/);
    await shot(page, "r10-export-toolbar");

    // ── The ICS endpoint returns a valid calendar including our event (PM sees lead meetings) ──
    const res = await page.request.get("/api/calendar/ics");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("R10.3 export evt"); // the lead meeting is included for the PM
    expect(body.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    console.log("  ICS endpoint returns a valid calendar with the event.");

    // ── Per-event "Add to Google Calendar" link ───────────────────────────────
    await page.getByRole("button", { name: "Agenda" }).click();
    await page.waitForLoadState("networkidle");
    await page.getByText("R10.3 export evt").first().click();
    const gcal = page.locator('[data-testid="add-to-google"]');
    await expect(gcal).toBeVisible();
    const href = await gcal.getAttribute("href");
    expect(href).toContain("calendar.google.com/calendar/render");
    expect(href).toContain("action=TEMPLATE");
    await shot(page, "r10-google-link");
    console.log("  per-event Google Calendar link present.");
  });
});
