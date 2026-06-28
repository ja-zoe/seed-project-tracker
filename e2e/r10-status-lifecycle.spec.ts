import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, E2E_MARKER } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/10-meetings-status-lifecycle/R10.2-status-update-lifecycle/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function addSelfAsLead(page: Page, projectUrl: string) {
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
}

async function createLeadMeeting(page: Page, projectLabel: string, title: string, startsAt: string) {
  await page.goto("/calendar");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add event" }).first().click();
  await page.locator('input[name="title"]').fill(title);
  await page.locator('select[name="type"]').selectOption("LEAD_MEETING");
  await page.locator('input[name="startsAt"]').fill(startsAt);
  await page.locator('select[name="projectId"]').selectOption({ label: projectLabel });
  await page.getByRole("button", { name: "Add Event", exact: true }).click();
  await page.waitForTimeout(400);
}

function dtLocal(offsetMs: number) {
  return new Date(Date.now() + offsetMs).toISOString().slice(0, 16);
}

test.describe("R10.2 — status-update lifecycle", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("gating + link to lead meeting; privileged edit + delete", async ({ page }) => {
    await login(page);
    const name = `R10.2 main ${Date.now()}`;
    const projectUrl = await createProject(page, name);
    const projectLabel = E2E_MARKER + name;
    await addSelfAsLead(page, projectUrl);

    // ── No lead meeting yet → "Submit Update" is hidden ───────────────────────
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "Submit Update" })).toHaveCount(0);

    // ── Create an upcoming lead meeting (1 day out, within the 3-day window) ───
    await createLeadMeeting(page, projectLabel, E2E_MARKER + "R10.2 lead sync", dtLocal(86_400_000));

    // ── Now "Submit Update" appears and links to that meeting ─────────────────
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    const submit = page.getByRole("link", { name: "Submit Update" });
    await expect(submit).toBeVisible();
    await submit.click();
    await expect(page.locator('[data-testid="status-meeting-notice"]')).toContainText("R10.2 lead sync");
    await expect(page.locator('[data-testid="status-meeting-notice"]')).not.toContainText("marked late");

    await page.fill('textarea[name="plannedWork"]', "Planned alpha");
    await page.fill('textarea[name="actualProgress"]', "Actual alpha");
    await page.fill('textarea[name="blockers"]', "None");
    await page.fill('textarea[name="nextWeekGoals"]', "Goals alpha");
    await page.getByRole("button", { name: "Submit Update" }).click();
    await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });

    // The update shows (not late — meeting is in the future)
    await expect(page.getByText("Planned alpha")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("section", { hasText: "Recent Status Updates" }).getByText("Late", { exact: true })).toHaveCount(0);
    await shot(page, "r10-status-submitted");

    // ── Privileged (PM has MANAGE_STATUS_UPDATES): inline Edit + Delete ────────
    const controls = page.locator('[data-testid="status-update-controls"]').first();
    await expect(controls).toBeVisible();

    await controls.locator('[data-testid="status-edit"]').click();
    await page.locator('[data-testid="status-edit-plannedWork"]').fill("Planned EDITED");
    await page.locator('[data-testid="status-edit-submit"]').click();
    await expect(page.getByText("Planned EDITED")).toBeVisible({ timeout: 10_000 });
    console.log("  status update edited.");

    await page.locator('[data-testid="status-delete"]').first().click();
    await page.locator('[data-testid="status-delete-confirm"] button[title="Confirm"]').click();
    await expect(page.getByText("Planned EDITED")).toHaveCount(0, { timeout: 10_000 });
    console.log("  status update deleted.");
  });

  test("a submission after the meeting time is marked late", async ({ page }) => {
    await login(page);
    const name = `R10.2 late ${Date.now()}`;
    const projectUrl = await createProject(page, name);
    const projectLabel = E2E_MARKER + name;
    await addSelfAsLead(page, projectUrl);

    // Lead meeting 1 day in the PAST → its window is open, submission is late
    await createLeadMeeting(page, projectLabel, E2E_MARKER + "R10.2 past sync", dtLocal(-86_400_000));

    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Submit Update" }).click();
    await expect(page.locator('[data-testid="status-meeting-notice"]')).toContainText("marked late");
    await page.fill('textarea[name="plannedWork"]', "Past planned");
    await page.fill('textarea[name="actualProgress"]', "Past actual");
    await page.fill('textarea[name="blockers"]', "None");
    await page.fill('textarea[name="nextWeekGoals"]', "Past goals");
    await page.getByRole("button", { name: "Submit Update" }).click();
    await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });

    await expect(page.getByText("Past planned")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("section", { hasText: "Recent Status Updates" }).getByText("Late", { exact: true })).toBeVisible();
    await shot(page, "r10-status-late");
    console.log("  late submission marked late.");
  });
});
