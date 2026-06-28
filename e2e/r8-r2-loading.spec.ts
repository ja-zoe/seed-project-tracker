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

test.describe("R8.6 round-2 — status-update submit loading state", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("the Submit Update button shows a pending state and disables while submitting", async ({ page }) => {
    await login(page);
    const semester = `Test ${Date.now()}`;
    const name = `R8.6r2 ${Date.now()}`;
    const projectUrl = await createProject(page, name, semester);
    await addSelfAsLead(page, projectUrl);
    // A lead meeting (in the submit window) is required to submit (R10.2)
    await createLeadMeeting(page, E2E_MARKER + "R8.6r2 lead mtg", dtLocal(86_400_000), semester);

    // Open the status form
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Submit Project Standing" }).click();
    await page.waitForLoadState("networkidle");
    await page.fill('textarea[name="plannedWork"]', "Planned");
    await page.fill('textarea[name="actualProgress"]', "Actual");
    await page.fill('textarea[name="blockers"]', "None");
    await page.fill('textarea[name="nextWeekGoals"]', "Next");

    const submit = page.getByRole("button", { name: "Submit Project Standing" });
    await expect(submit).toBeVisible();

    // Delay only the first server-action POST so the pending state is observable
    let delayedOnce = false;
    await page.route("**/*", async (route, request) => {
      try {
        if (!delayedOnce && request.method() === "POST") {
          delayedOnce = true;
          await new Promise((r) => setTimeout(r, 1500));
        }
        await route.continue();
      } catch {
        // route may already be handled/canceled (redirect/RSC) — ignore
      }
    });

    await submit.click({ noWaitAfter: true });

    // While the action runs, the button shows the pending label and is disabled
    const pending = page.getByRole("button", { name: "Submitting…" });
    await expect(pending).toBeVisible({ timeout: 3_000 });
    await expect(pending).toBeDisabled();
    await shot(page, "r8r2-submit-pending");
    console.log("  pending state observed.");

    // Submission completes and redirects back to the project (no error)
    await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
    await page.unroute("**/*");
    const body = (await page.locator("body").textContent()) ?? "";
    expect(body).not.toContain("PrismaClientKnownRequestError");
    console.log("  submission completed and redirected.");
  });
});
