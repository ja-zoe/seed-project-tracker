import { test, expect } from "@playwright/test";
import { login, createProject, addSelfAsLead, createLeadMeeting, dtLocal, E2E_MARKER } from "./helpers";

test.describe("R10.2 — submit-button gating (dashboard + project page)", () => {
  test("Submit shows only within the window AND not yet submitted", async ({ page }) => {
    await login(page);
    const name = `R10.2 gating ${Date.now()}`;
    const projectUrl = await createProject(page, name);
    await addSelfAsLead(page, projectUrl);

    const dashSubmit = () => page.locator(`a[href="${projectUrl}/status/new"]`);
    const pageSubmit = () => page.getByRole("link", { name: "Submit Update" });

    // ── No lead meeting → Submit hidden on the dashboard AND the project page ──
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(dashSubmit()).toHaveCount(0);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await expect(pageSubmit()).toHaveCount(0);
    // history link is always present
    await expect(page.getByRole("link", { name: "Submission history" })).toBeVisible();

    // ── Lead meeting in window → Submit shows on both ─────────────────────────
    await createLeadMeeting(page, E2E_MARKER + name, E2E_MARKER + "gating mtg", dtLocal(86_400_000));
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(dashSubmit()).toHaveCount(1);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await expect(pageSubmit()).toBeVisible();

    // ── Submit it → Submit hidden again on both (already submitted) ────────────
    await pageSubmit().click();
    await page.fill('textarea[name="plannedWork"]', "P");
    await page.fill('textarea[name="actualProgress"]', "A");
    await page.fill('textarea[name="blockers"]', "None");
    await page.fill('textarea[name="nextWeekGoals"]', "G");
    await page.getByRole("button", { name: "Submit Update" }).click();
    await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });

    await expect(pageSubmit()).toHaveCount(0); // project page
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(dashSubmit()).toHaveCount(0); // dashboard
    console.log("  gating correct across no-meeting / in-window / submitted.");
  });

  test("the submit window is configurable in PM settings", async ({ page }) => {
    await login(page);
    await page.goto("/pm/settings");
    const win = page.locator('[data-testid="status-submit-window"]');
    await expect(win).toBeVisible();
    const original = await win.inputValue();
    await win.fill("7");
    await page.getByRole("button", { name: "Save thresholds" }).click();
    await page.waitForTimeout(400);
    await page.goto("/pm/settings");
    await expect(page.locator('[data-testid="status-submit-window"]')).toHaveValue("7");
    // restore
    await page.locator('[data-testid="status-submit-window"]').fill(original || "3");
    await page.getByRole("button", { name: "Save thresholds" }).click();
    await page.waitForTimeout(300);
    console.log("  submit window configurable + persists.");
  });
});
