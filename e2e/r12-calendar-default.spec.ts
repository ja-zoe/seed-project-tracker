import { test, expect } from "@playwright/test";
import { login, createProject, createLeadMeeting, dtLocal, E2E_MARKER } from "./helpers";

/**
 * R12.1 — the calendar opens on the semester whose work is happening now (a
 * project-bearing semester, nearest today), not a lexicographically-sorted one. A lead
 * meeting in that semester is therefore visible by default, with no ?semester= param.
 */
test.describe("R12.1 — calendar defaults to the current semester", () => {
  test("a lead meeting in the current project semester shows by default", async ({ page }) => {
    await login(page);
    const ts = Date.now();
    const semester = `Zcur ${ts}`; // lexicographically late — old sort().reverse() would NOT pick it
    const meetingTitle = `${E2E_MARKER}R12.1 lead ${ts}`;

    // A project in this semester makes it a project-bearing (current) semester…
    await createProject(page, `R12.1 ${ts}`, semester);
    // …and a lead meeting ~2h out makes it the nearest-today project semester.
    await createLeadMeeting(page, meetingTitle, dtLocal(2 * 3600_000), semester);

    // Open the calendar with NO semester param → should default to `semester`.
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(meetingTitle, { exact: false })).toBeVisible({ timeout: 10_000 });

    // The semester <select> reflects the default.
    const sel = page.locator("select").filter({ has: page.locator(`option[value="${semester}"]`) });
    await expect(sel).toHaveValue(semester);
  });
});
