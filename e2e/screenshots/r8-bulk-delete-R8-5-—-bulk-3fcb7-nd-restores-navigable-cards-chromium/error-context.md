# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r8-bulk-delete.spec.ts >> R8.5 — bulk project select & delete >> Cancel exits selection mode and restores navigable cards
- Location: e2e/r8-bulk-delete.spec.ts:77:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_RESET at http://localhost:3000/dev-login
Call log:
  - navigating to "http://localhost:3000/dev-login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect, type Page } from "@playwright/test";
  2  | import * as path from "path";
  3  | import * as fs from "fs";
  4  | 
  5  | const SCREENSHOTS_DIR = path.join(
  6  |   __dirname,
  7  |   "../changes/8-subtask-modal-bulk-fixes/R8.5-bulk-project-delete/screenshots"
  8  | );
  9  | 
  10 | async function login(page: Page) {
> 11 |   await page.goto("/dev-login");
     |              ^ Error: page.goto: net::ERR_CONNECTION_RESET at http://localhost:3000/dev-login
  12 |   await page.fill("#netId", "jav273");
  13 |   await page.click('button[type="submit"]');
  14 |   await page.waitForURL("**/dashboard", { timeout: 15_000 });
  15 | }
  16 | 
  17 | async function shot(page: Page, name: string) {
  18 |   await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  19 |   console.log(`  📸 ${name}.png`);
  20 | }
  21 | 
  22 | async function createProject(page: Page, name: string) {
  23 |   await page.goto("/projects/new");
  24 |   await page.fill('input[name="name"]', name);
  25 |   await page.fill('input[name="semester"]', "Test 2026");
  26 |   await page.getByRole("button", { name: "Create Project" }).click();
  27 |   await page.waitForURL(
  28 |     (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
  29 |     { timeout: 15_000 }
  30 |   );
  31 | }
  32 | 
  33 | test.describe("R8.5 — bulk project select & delete", () => {
  34 |   test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));
  35 | 
  36 |   test("PM can multi-select projects and delete them together", async ({ page }) => {
  37 |     await login(page);
  38 |     const stamp = Date.now();
  39 |     const nameA = `BulkDel A ${stamp}`;
  40 |     const nameB = `BulkDel B ${stamp}`;
  41 |     await createProject(page, nameA);
  42 |     await createProject(page, nameB);
  43 | 
  44 |     await page.goto("/projects");
  45 |     await page.waitForLoadState("networkidle");
  46 | 
  47 |     // Both projects present
  48 |     await expect(page.getByText(nameA)).toBeVisible();
  49 |     await expect(page.getByText(nameB)).toBeVisible();
  50 | 
  51 |     // Enter selection mode (PM-only toggle)
  52 |     const selectToggle = page.locator('[data-testid="select-toggle"]');
  53 |     await expect(selectToggle).toBeVisible();
  54 |     await selectToggle.click();
  55 |     await shot(page, "r8-bulk-selecting");
  56 | 
  57 |     // Cards become selectable buttons; select our two
  58 |     const cardA = page.locator('[data-testid="project-card"]', { hasText: nameA });
  59 |     const cardB = page.locator('[data-testid="project-card"]', { hasText: nameB });
  60 |     await cardA.click();
  61 |     await cardB.click();
  62 |     await expect(page.locator('[data-testid="selected-count"]')).toHaveText("2 selected");
  63 |     await expect(cardA).toHaveAttribute("data-selected", "true");
  64 |     await shot(page, "r8-bulk-two-selected");
  65 | 
  66 |     // Delete → confirm
  67 |     await page.locator('[data-testid="bulk-delete"]').click();
  68 |     await page.locator('[data-testid="bulk-delete-confirm"]').click();
  69 | 
  70 |     // Both gone after revalidation
  71 |     await expect(page.getByText(nameA)).toHaveCount(0, { timeout: 10_000 });
  72 |     await expect(page.getByText(nameB)).toHaveCount(0);
  73 |     await shot(page, "r8-bulk-deleted");
  74 |     console.log("  both projects deleted via bulk action.");
  75 |   });
  76 | 
  77 |   test("Cancel exits selection mode and restores navigable cards", async ({ page }) => {
  78 |     await login(page);
  79 |     const name = `BulkCancel ${Date.now()}`;
  80 |     await createProject(page, name);
  81 |     await page.goto("/projects");
  82 |     await page.waitForLoadState("networkidle");
  83 | 
  84 |     await page.locator('[data-testid="select-toggle"]').click();
  85 |     // In selection mode the card is a button, not a link
  86 |     await expect(page.locator('[data-testid="project-card"]', { hasText: name })).toBeVisible();
  87 | 
  88 |     await page.locator('[data-testid="select-cancel"]').click();
  89 |     // Back to normal: the card is a link again (navigates on click)
  90 |     const link = page.getByRole("link", { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
  91 |     await expect(link).toBeVisible();
  92 |     await expect(page.locator('[data-testid="project-card"]')).toHaveCount(0);
  93 |     console.log("  cancel restored navigable cards.");
  94 |   });
  95 | });
  96 | 
```