import { test, expect, type Page } from "@playwright/test";
import { login, createProject } from "./helpers";

/**
 * R22.2 — Markdown heading hierarchy. `#`, `##`, and `###` must render at visibly
 * decreasing sizes in the editor preview, and the saved display (MarkdownView) must
 * match because the preview now renders through the same component.
 */

const MD = "# Alpha\n\n## Beta\n\n### Gamma\n\nbody text";

async function fontSize(page: Page, scope: string, selector: string): Promise<number> {
  const el = page.locator(`${scope} ${selector}`).first();
  await expect(el).toBeVisible({ timeout: 10_000 });
  return el.evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
}

test("editor preview renders #/##/### at decreasing sizes", async ({ page }) => {
  await login(page);
  const projectUrl = await createProject(page, "md headings");
  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");

  await page.fill('input[name="title"]', "md heading deliverable");
  await page.fill('input[name="targetDate"]', "2026-12-31");
  await page.fill('textarea[name="description"]', MD);
  await page.getByRole("button", { name: "Preview" }).click();

  const scope = "form"; // preview pane renders inside the create form
  const h1 = await fontSize(page, scope, "h1");
  const h2 = await fontSize(page, scope, "h2");
  const h3 = await fontSize(page, scope, "h3");
  const p = await fontSize(page, scope, "p");

  expect(h1).toBeGreaterThan(h2);
  expect(h2).toBeGreaterThan(h3);
  expect(h3).toBeGreaterThanOrEqual(p);
  // Headings must be bolder than body text, not just bigger.
  const h1Weight = await page
    .locator(`${scope} h1`)
    .first()
    .evaluate((node) => parseInt(getComputedStyle(node).fontWeight, 10));
  expect(h1Weight).toBeGreaterThanOrEqual(600);
});

test("saved deliverable description shows the same hierarchy", async ({ page }) => {
  await login(page);
  const projectUrl = await createProject(page, "md headings display");
  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");

  await page.fill('input[name="title"]', "md display deliverable");
  await page.fill('input[name="targetDate"]', "2026-12-31");
  await page.fill('textarea[name="description"]', MD);
  await page.getByRole("button", { name: "Add Deliverable" }).click();
  await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  // Description renders only when the deliverable row is expanded — click the header body.
  await page
    .locator('[data-deliverable-id]', { hasText: "md display deliverable" })
    .locator('[data-testid="deliverable-header"]')
    .click({ position: { x: 8, y: 8 } });

  const scope = '[data-testid="deliverable-description"]';
  await expect(page.locator(scope).first()).toBeVisible({ timeout: 10_000 });
  const h1 = await fontSize(page, scope, "h1");
  const h2 = await fontSize(page, scope, "h2");
  const h3 = await fontSize(page, scope, "h3");
  expect(h1).toBeGreaterThan(h2);
  expect(h2).toBeGreaterThan(h3);
});
