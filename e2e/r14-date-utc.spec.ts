import { test, expect } from "@playwright/test";
import { login, createProject, addSelfAsLead, createDeliverable } from "./helpers";

/**
 * R14.1 — date-only fields (deadline / dueDate / targetDate) must render the exact day the
 * user entered, not a day earlier. The runner's tz is America/New_York, where a date-only
 * value stored at UTC midnight previously rendered the prior day. A "2026-12-15" date must
 * show "Dec 15" everywhere.
 */
test.describe("R14.1 — date-only fields render in UTC (no off-by-one)", () => {
  test("deadline + targetDate show the entered day on project page, my-tasks, global list", async ({ page }) => {
    await login(page);
    const ts = Date.now();
    const projectUrl = await createProject(page, `R14.1 ${ts}`);
    await addSelfAsLead(page, projectUrl); // self becomes an assignee + owner candidate

    // Deliverable with a known target date.
    await createDeliverable(page, projectUrl, `Dated deliverable ${ts}`, "2026-12-15");

    // Action item owned by self, deadline 2026-12-15.
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await page.locator('[data-testid="action-item-new"]').click();
    await page.locator('[data-testid="action-item-modal-description"]').fill(`Dated item ${ts}`);
    await page.locator('[data-testid="action-item-modal-owner"]').selectOption({ index: 1 }); // self
    await page.locator('[data-testid="action-item-modal-deadline"]').fill("2026-12-15");
    await page.locator('[data-testid="action-item-modal-submit"]').click();

    // ── Project page: both the action item and the deliverable show Dec 15 ─────
    await expect(page.locator('[data-testid="action-item-deadline"]').first()).toContainText("Dec 15", { timeout: 10_000 });
    await expect(page.getByText("Dec 15").first()).toBeVisible(); // deliverable target date renders too
    await expect(page.getByText("Dec 14")).toHaveCount(0);

    // ── my-tasks (owned action item) shows Dec 15 ─────────────────────────────
    await page.goto("/my-tasks");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(`Dated item ${ts}`)).toBeVisible();
    await expect(page.getByText("due Dec 15")).toBeVisible();
    await expect(page.getByText("due Dec 14")).toHaveCount(0);

    // ── global action-items list shows Dec 15 ─────────────────────────────────
    await page.goto("/action-items");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("due Dec 15").first()).toBeVisible();
    await expect(page.getByText("due Dec 14")).toHaveCount(0);
  });
});
