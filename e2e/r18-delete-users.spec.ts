import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * R18.2 — PM deletes an active user (anonymizing soft-delete) via the inline confirm
 * microinteraction; the PM can never delete themselves.
 */
test.describe("R18.2 — delete users", () => {
  test("PM approves then deletes a user; no self-delete control", async ({ browser }) => {
    const victimNet = `e2e18v${Date.now()}`;

    // ── Victim context: signing in creates a fresh PENDING user ────────────────
    const vctx = await browser.newContext();
    const vpage = await vctx.newPage();
    await vpage.goto("/dev-login");
    await vpage.fill("#netId", victimNet);
    await vpage.click('button[type="submit"]');
    await vpage.waitForURL("**/pending", { timeout: 15_000 });
    await vctx.close();

    // ── PM context ─────────────────────────────────────────────────────────────
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page); // jav273 = PM admin
    await page.goto("/pm/users");
    await page.waitForLoadState("networkidle");

    // Approve the pending victim with the Viewer role.
    const pendingRow = page
      .locator("div")
      .filter({ hasText: victimNet })
      .filter({ has: page.getByRole("button", { name: "Approve" }) })
      .last();
    await expect(pendingRow).toBeVisible({ timeout: 10_000 });
    await pendingRow.locator('select[name="roleId"]').selectOption({ label: "Viewer" });
    await pendingRow.getByRole("button", { name: "Approve" }).click();
    await page.waitForLoadState("networkidle");

    // The PM's own active row exposes NO delete control (self-delete blocked).
    const activeSection = page.locator("section").filter({ hasText: "Active Users" });
    const pmRow = activeSection
      .locator("div")
      .filter({ hasText: "jav273" })
      .filter({ has: page.getByRole("button", { name: "Save", exact: true }) })
      .last();
    await expect(pmRow.getByTestId("user-delete")).toHaveCount(0);

    // The victim's active row HAS a delete control. Delete → confirm → gone.
    // Scope to the single row via the email text's nearest row ancestor.
    const victimRow = page
      .getByText(victimNet, { exact: false })
      .first()
      .locator('xpath=ancestor::div[contains(@class,"items-center")][1]');
    await expect(victimRow).toBeVisible({ timeout: 10_000 });
    await victimRow.getByTestId("user-delete").click();
    await expect(victimRow.getByTestId("user-delete-confirm")).toBeVisible();
    await victimRow.locator('[title="Confirm"]').click();
    await page.waitForLoadState("networkidle");

    // Anonymized + filtered from the list — the netId no longer appears anywhere.
    await expect(page.locator(`text=${victimNet}`)).toHaveCount(0, { timeout: 10_000 });

    await ctx.close();
  });
});
