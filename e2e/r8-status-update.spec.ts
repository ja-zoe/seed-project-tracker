import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, addSelfAsLead, createLeadMeeting, dtLocal, E2E_MARKER } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/8-subtask-modal-bulk-fixes/R8.6-status-update-null-constraint/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R8.6 — status update submission (Prisma null constraint fix)", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("submitting a status update creates a row and redirects (no Prisma null-constraint crash)", async ({ page }) => {
    await login(page);

    const semester = `Test ${Date.now()}`;
    const name = `R8.6 ${Date.now()}`;
    const projectUrl = await createProject(page, name, semester);
    await addSelfAsLead(page, projectUrl);
    // A lead meeting (in the submit window) is required to submit (R10.2)
    await createLeadMeeting(page, E2E_MARKER + "R8.6 lead mtg", dtLocal(86_400_000), semester);

    // Navigate to the submit form via the project page's "Submit Update" button
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Submit Project Standing" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('textarea[name="plannedWork"]')).toBeVisible({ timeout: 10_000 });
    await page.fill('textarea[name="plannedWork"]', "Planned: build the thing");
    await page.fill('textarea[name="actualProgress"]', "Actual: built half the thing");
    await page.fill('textarea[name="blockers"]', "None");
    await page.fill('textarea[name="nextWeekGoals"]', "Finish the thing");
    await shot(page, "r8-status-form-filled");

    await page.getByRole("button", { name: "Submit Project Standing" }).click();

    // Should redirect back to the project page — NOT show a Prisma error
    await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await shot(page, "r8-status-submitted");

    const body = (await page.locator("body").textContent()) ?? "";
    expect(body).not.toContain("PrismaClientKnownRequestError");
    expect(body).not.toContain("Null constraint");
    console.log("  Status update submitted, redirected to project, no Prisma error.");

    // Confirm the submission shows up in history
    await page.goto(`${projectUrl}/history`);
    await page.waitForLoadState("networkidle");
    const historyBody = (await page.locator("body").textContent()) ?? "";
    expect(historyBody).toContain("build the thing");
    console.log("  Submission appears in history.");
  });
});
