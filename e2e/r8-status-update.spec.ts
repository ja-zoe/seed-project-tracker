import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/8-subtask-modal-bulk-fixes/R8.6-status-update-null-constraint/screenshots"
);

async function login(page: Page) {
  await page.goto("/dev-login");
  await page.fill("#netId", "jav273");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

test.describe("R8.6 — status update submission (Prisma null constraint fix)", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("submitting a status update creates a row and redirects (no Prisma null-constraint crash)", async ({ page }) => {
    await login(page);

    // Create project
    await page.goto("/projects/new");
    await page.fill('input[name="name"]', `R8.6 ${Date.now()}`);
    await page.fill('input[name="semester"]', "Test 2026");
    await page.getByRole("button", { name: "Create Project" }).click();
    await page.waitForURL(
      (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
      { timeout: 15_000 }
    );
    const projectUrl = new URL(page.url()).pathname;

    // Assign the dev user (jav273) as LEAD so they can submit status updates
    await page.goto(`${projectUrl}/members`);
    await page.waitForLoadState("networkidle");
    const userSelect = page.locator('select[name="userId"]');
    const optionValues = await userSelect.locator("option").evaluateAll((opts) =>
      (opts as HTMLOptionElement[]).map((o) => ({ value: o.value, text: o.textContent ?? "" }))
    );
    const jav = optionValues.find((o) => o.text.includes("jav273"));
    if (!jav) throw new Error("jav273 not found in member options: " + JSON.stringify(optionValues));
    await userSelect.selectOption(jav.value);
    await page.locator('select[name="role"]').selectOption("LEAD");
    await page.getByRole("button", { name: "Add to Project" }).click();
    await page.waitForLoadState("networkidle");

    // Navigate to the submit form via the project page's "Submit Update" button
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Submit Update" }).click();
    await page.waitForLoadState("networkidle");
    console.log("  status form url:", new URL(page.url()).pathname);
    await expect(page.locator('textarea[name="plannedWork"]')).toBeVisible({ timeout: 10_000 });
    // meetingDate has a default; fill the four required textareas
    await page.fill('textarea[name="plannedWork"]', "Planned: build the thing");
    await page.fill('textarea[name="actualProgress"]', "Actual: built half the thing");
    await page.fill('textarea[name="blockers"]', "None");
    await page.fill('textarea[name="nextWeekGoals"]', "Finish the thing");
    await shot(page, "r8-status-form-filled");

    await page.getByRole("button", { name: "Submit Update" }).click();

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
