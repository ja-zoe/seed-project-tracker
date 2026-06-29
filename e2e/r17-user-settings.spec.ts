import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * R17.1 — a user can edit their profile (nickname/name) on the /account settings page,
 * and it persists. Restores the original nickname at the end so it doesn't disturb the
 * shared account.
 */
test.describe("R17.1 — self-service settings", () => {
  test("edit nickname on /account; persists; name is required", async ({ page }) => {
    await login(page);
    await page.goto("/account");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.locator('[data-testid="profile-email"]')).toHaveAttribute("readonly", "");

    const nick = page.locator('[data-testid="profile-nickname"]');
    const original = await nick.inputValue();
    const testNick = `TestNick${Date.now()}`;
    try {
      // Edit + save → "Saved", then reload → persisted.
      await nick.fill(testNick);
      await page.locator('[data-testid="profile-save"]').click();
      await expect(page.locator('[data-testid="profile-saved"]')).toBeVisible({ timeout: 10_000 });
      await page.reload();
      await page.waitForLoadState("networkidle");
      await expect(page.locator('[data-testid="profile-nickname"]')).toHaveValue(testNick);

      // Validation: clearing first name blocks the save (client guard, no write).
      await page.locator('[data-testid="profile-firstName"]').fill("");
      await page.locator('[data-testid="profile-save"]').click();
      await expect(page.getByText("First and last name are required.")).toBeVisible();
    } finally {
      // Restore the original nickname (reload resets first name from the DB).
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.locator('[data-testid="profile-nickname"]').fill(original);
      await page.locator('[data-testid="profile-save"]').click();
      await expect(page.locator('[data-testid="profile-saved"]')).toBeVisible({ timeout: 10_000 });
    }
  });
});
