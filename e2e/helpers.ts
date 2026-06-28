import { expect, type Page } from "@playwright/test";

export async function login(page: Page) {
  await page.goto("/dev-login");
  await page.fill("#netId", "jav273");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

export async function createProject(page: Page, name: string, semester = "Test 2026"): Promise<string> {
  await page.goto("/projects/new");
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="semester"]', semester);
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
    { timeout: 15_000 }
  );
  return new URL(page.url()).pathname;
}

export async function createDeliverable(
  page: Page,
  projectUrl: string,
  title: string,
  targetDate = "2026-12-31"
): Promise<string> {
  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="title"]', title);
  await page.fill('input[name="targetDate"]', targetDate);
  await page.getByRole("button", { name: "Add Deliverable" }).click();
  await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  const card = page.locator("[data-deliverable-id]", { hasText: title }).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  const id = await card.getAttribute("data-deliverable-id");
  if (!id) throw new Error("could not read deliverable id");
  return id;
}

/**
 * Add a subtask via the in-page modal (the /subtasks/new page was removed in set 8).
 * Assumes the project page is already loaded. `deliverableIndex` selects which
 * deliverable's "+ Add subtask" button to use (default: first).
 */
export async function addSubtaskViaModal(
  page: Page,
  title: string,
  deliverableIndex = 0
) {
  await page.locator('[data-testid="add-subtask"]').nth(deliverableIndex).click();
  const titleInput = page.locator('[data-testid="subtask-modal-title"]');
  await expect(titleInput).toBeVisible({ timeout: 5_000 });
  await titleInput.fill(title);
  await page.locator('[data-testid="subtask-modal-submit"]').click();
  await expect(
    page.locator('[data-testid="subtask-row"]', { hasText: title })
  ).toBeVisible({ timeout: 10_000 });
}
