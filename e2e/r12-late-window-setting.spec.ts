import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * R12.2 — the late-submission window is a configurable PM setting, persisted like the
 * submit window. (Restored to 3 at the end so it doesn't affect other suites.)
 */
test.describe("R12.2 — configurable late window", () => {
  test("PM can set and persist the late submission window", async ({ page }) => {
    await login(page);
    await page.goto("/pm/settings");
    await page.waitForLoadState("networkidle");

    const field = page.locator('[data-testid="status-late-window"]');
    await expect(field).toBeVisible();
    await field.fill("5");
    await page.getByRole("button", { name: "Save thresholds" }).click();
    await page.waitForLoadState("networkidle");

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-testid="status-late-window"]')).toHaveValue("5");

    // restore default
    await page.locator('[data-testid="status-late-window"]').fill("3");
    await page.getByRole("button", { name: "Save thresholds" }).click();
    await page.waitForLoadState("networkidle");
  });
});
