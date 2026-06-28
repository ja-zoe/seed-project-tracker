import { expect, type Page } from "@playwright/test";

/**
 * Marker prepended to every e2e project name. The Playwright globalTeardown deletes
 * all projects whose name starts with it, so test data never piles up — and it can
 * never touch the user's real (unmarked) projects.
 */
export const E2E_MARKER = "[e2e] ";

export async function login(page: Page) {
  await page.goto("/dev-login");
  await page.fill("#netId", "jav273");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

export async function createProject(page: Page, name: string, semester = "Test 2026"): Promise<string> {
  await page.goto("/projects/new");
  await page.fill('input[name="name"]', E2E_MARKER + name);
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

/** Add the dev user (jav273) to a project as a LEAD via the members page. */
export async function addSelfAsLead(page: Page, projectUrl: string) {
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

/**
 * Create a global LEAD_MEETING calendar event in a given semester. Lead meetings are
 * semester-wide (not per-project), so any project in that semester can submit for it.
 */
export async function createLeadMeeting(page: Page, title: string, startsAtLocal: string, semester = "Test 2026") {
  await page.goto(`/calendar?semester=${encodeURIComponent(semester)}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add event" }).first().click();
  await page.locator('input[name="title"]').fill(title);
  await page.locator('select[name="type"]').selectOption("LEAD_MEETING");
  await page.locator('input[name="startsAt"]').fill(startsAtLocal);
  await page.getByRole("button", { name: "Add Event", exact: true }).click();
  await page.waitForTimeout(400);
}

/** A datetime-local string at now + offsetMs (e.g. tomorrow = +86_400_000). */
export function dtLocal(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString().slice(0, 16);
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
