import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { E2E_MARKER } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/8-subtask-modal-bulk-fixes/R8.5-bulk-project-delete/screenshots"
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

async function createProject(page: Page, name: string) {
  await page.goto("/projects/new");
  await page.fill('input[name="name"]', E2E_MARKER + name);
  await page.fill('input[name="semester"]', "Test 2026");
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
    { timeout: 15_000 }
  );
}

test.describe("R8.5 — bulk project select & delete", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("PM can multi-select projects and delete them together", async ({ page }) => {
    await login(page);
    const stamp = Date.now();
    const nameA = `BulkDel A ${stamp}`;
    const nameB = `BulkDel B ${stamp}`;
    await createProject(page, nameA);
    await createProject(page, nameB);

    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    // Both projects present
    await expect(page.getByText(nameA)).toBeVisible();
    await expect(page.getByText(nameB)).toBeVisible();

    // Enter selection mode (PM-only toggle)
    const selectToggle = page.locator('[data-testid="select-toggle"]');
    await expect(selectToggle).toBeVisible();
    await selectToggle.click();
    await shot(page, "r8-bulk-selecting");

    // Cards become selectable buttons; select our two
    const cardA = page.locator('[data-testid="project-card"]', { hasText: nameA });
    const cardB = page.locator('[data-testid="project-card"]', { hasText: nameB });
    await cardA.click();
    await cardB.click();
    await expect(page.locator('[data-testid="selected-count"]')).toHaveText("2 selected");
    await expect(cardA).toHaveAttribute("data-selected", "true");
    await shot(page, "r8-bulk-two-selected");

    // Delete → confirm
    await page.locator('[data-testid="bulk-delete"]').click();
    await page.locator('[data-testid="bulk-delete-confirm"]').click();

    // Both gone after revalidation
    await expect(page.getByText(nameA)).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText(nameB)).toHaveCount(0);
    await shot(page, "r8-bulk-deleted");
    console.log("  both projects deleted via bulk action.");
  });

  test("Cancel exits selection mode and restores navigable cards", async ({ page }) => {
    await login(page);
    const name = `BulkCancel ${Date.now()}`;
    await createProject(page, name);
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    await page.locator('[data-testid="select-toggle"]').click();
    // In selection mode the card is a button, not a link
    await expect(page.locator('[data-testid="project-card"]', { hasText: name })).toBeVisible();

    await page.locator('[data-testid="select-cancel"]').click();
    // Back to normal: the card is a link again (navigates on click)
    const link = page.getByRole("link", { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
    await expect(link).toBeVisible();
    await expect(page.locator('[data-testid="project-card"]')).toHaveCount(0);
    console.log("  cancel restored navigable cards.");
  });
});
