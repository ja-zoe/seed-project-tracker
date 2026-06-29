import { test, expect } from "@playwright/test";
import { login, createProject, addSelfAsLead, createLeadMeeting, dtLocal, E2E_MARKER } from "./helpers";

/**
 * R12.2 — multiple lead meetings can be pending at once. The project button reports the
 * count, the submit page offers a date-labeled switcher, and submitting one decrements
 * the set (the earlier meeting is NOT blocked by the later one — the original bug).
 */
test.describe("R12.2 — multiple pending project standings", () => {
  test("two pending meetings: switch, submit each, count decrements", async ({ page }) => {
    await login(page);
    const ts = Date.now();
    const semester = `Pend ${ts}`;
    const projectUrl = await createProject(page, `R12.2 ${ts}`, semester);
    await addSelfAsLead(page, projectUrl);

    const titleA = `${E2E_MARKER}R12.2 A ${ts}`; // soonest (now + 2h)
    const titleB = `${E2E_MARKER}R12.2 B ${ts}`; // later  (now + 26h)
    await createLeadMeeting(page, titleA, dtLocal(2 * 3600_000), semester);
    await createLeadMeeting(page, titleB, dtLocal(26 * 3600_000), semester);

    // ── Project page: button reports N = 2 ────────────────────────────────────
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    const link = page.locator('[data-testid="submit-standing-link"]');
    await expect(link).toContainText("You have 2 Project Standing Updates to submit");
    await link.click();

    // ── Switcher shows 2, switches between date-labeled meetings ───────────────
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-testid="pending-count"]')).toHaveText("2");
    // soonest (A) is selected first
    await expect(page.locator('[data-testid="status-meeting-notice"]')).toContainText(titleA);
    // switch to the second meeting
    await page.locator('[data-testid="switcher-chip-1"]').click();
    await expect(page.locator('[data-testid="status-meeting-notice"]')).toContainText(titleB);
    // back to the first, then submit it
    await page.locator('[data-testid="switcher-chip-0"]').click();
    await expect(page.locator('[data-testid="status-meeting-notice"]')).toContainText(titleA);

    await page.fill('textarea[name="plannedWork"]', "Planned A");
    await page.fill('textarea[name="actualProgress"]', "Actual A");
    await page.fill('textarea[name="blockers"]', "None");
    await page.fill('textarea[name="nextWeekGoals"]', "Goals A");
    await page.getByRole("button", { name: "Submit Project Standing" }).click();

    // ── Back on the submit page with only B left (no switcher, N collapses) ────
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/status\/new$/);
    await expect(page.locator('[data-testid="standing-switcher"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="status-meeting-notice"]')).toContainText(titleB);

    await page.fill('textarea[name="plannedWork"]', "Planned B");
    await page.fill('textarea[name="actualProgress"]', "Actual B");
    await page.fill('textarea[name="blockers"]', "None");
    await page.fill('textarea[name="nextWeekGoals"]', "Goals B");
    await page.getByRole("button", { name: "Submit Project Standing" }).click();

    // ── Nothing left → redirected to the project, button gone ──────────────────
    await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-testid="submit-standing-link"]')).toHaveCount(0);
  });
});
