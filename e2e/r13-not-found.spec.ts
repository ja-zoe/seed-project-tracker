import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * R13.1 — styled not-found pages. In-shell 404 for a missing project (keeps the sidebar),
 * and the global 404 for an unknown top-level route.
 */
test.describe("R13.1 — catch-all not-found", () => {
  test("missing project shows the in-shell not-found", async ({ page }) => {
    await login(page);
    await page.goto("/projects/does-not-exist-xyz");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to dashboard" })).toBeVisible();
  });

  test("unknown top-level route shows the global not-found", async ({ page }) => {
    await login(page);
    await page.goto("/totally-bogus-route-xyz");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to dashboard" })).toBeVisible();
  });
});
