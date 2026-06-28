import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject } from "./helpers";

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
    const projectUrl = await createProject(page, `R8.6r2 ${Date.now()}`);

    // Assign the dev user as LEAD so they can submit
    await page.goto(`${projectUrl}/members`);
    await page.waitForLoadState("networkidle");
    const userSelect = page.locator('select[name="userId"]');
    const opts = await userSelect.locator("option").evaluateAll((os) =>
      (os as HTMLOptionElement[]).map((o) => ({ value: o.value, text: o.textContent ?? "" }))
    );
    const jav = opts.find((o) => o.text.includes("jav273"));
    if (!jav) throw new Error("jav273 not in member options");
    await userSelect.selectOption(jav.value);
    await page.locator('select[name="role"]').selectOption("LEAD");
    await page.getByRole("button", { name: "Add to Project" }).click();
    await page.waitForLoadState("networkidle");

    // Open the status form
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Submit Update" }).click();
    await page.waitForLoadState("networkidle");
    await page.fill('textarea[name="plannedWork"]', "Planned");
    await page.fill('textarea[name="actualProgress"]', "Actual");
    await page.fill('textarea[name="blockers"]', "None");
    await page.fill('textarea[name="nextWeekGoals"]', "Next");

    const submit = page.getByRole("button", { name: "Submit Update" });
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
