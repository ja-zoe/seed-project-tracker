# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r7-subtask-row.spec.ts >> R7.1 — subtask row polish >> status bullet, pill padding, click-name-to-reassign
- Location: e2e/r7-subtask-row.spec.ts:75:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img "SEED" [ref=e6]
      - generic [ref=e7]: SEED Project Tracker
    - heading "Sign in" [level=1] [ref=e8]
    - paragraph [ref=e9]: Enter your Rutgers NetID to continue.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: NetID
        - textbox "NetID" [ref=e13]:
          - /placeholder: e.g. jav273
          - text: jav273
      - button "Sign in with Rutgers NetID" [active] [ref=e14]
    - paragraph [ref=e15]: CAS mock mode — any NetID is accepted
  - button "Open Next.js Dev Tools" [ref=e21] [cursor=pointer]:
    - generic [ref=e24]:
      - text: Rendering
      - generic [ref=e25]:
        - generic [ref=e26]: .
        - generic [ref=e27]: .
        - generic [ref=e28]: .
  - alert [ref=e29]
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import * as path from "path";
  3   | import * as fs from "fs";
  4   | import { addSubtaskViaModal } from "./helpers";
  5   | 
  6   | const SCREENSHOTS_DIR = path.join(
  7   |   __dirname,
  8   |   "../changes/7-inline-edit-polish/R7.1-subtask-row-polish/screenshots"
  9   | );
  10  | 
  11  | async function login(page: Page) {
  12  |   await page.goto("/dev-login");
  13  |   await page.fill("#netId", "jav273");
  14  |   await page.click('button[type="submit"]');
> 15  |   await page.waitForURL("**/dashboard", { timeout: 15_000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  16  | }
  17  | 
  18  | async function shot(page: Page, name: string) {
  19  |   const dest = path.join(SCREENSHOTS_DIR, `${name}.png`);
  20  |   await page.screenshot({ path: dest, fullPage: false });
  21  |   console.log(`  📸 ${name}.png`);
  22  | }
  23  | 
  24  | async function getProjectWithSubtask(page: Page): Promise<string> {
  25  |   await page.goto("/dashboard");
  26  |   await page.waitForLoadState("networkidle");
  27  | 
  28  |   const projectLinks = page.locator('a[href^="/projects/"]').filter({
  29  |     hasNot: page.locator('[href="/projects/new"]'),
  30  |   });
  31  |   if ((await projectLinks.count()) > 0) {
  32  |     const href = await projectLinks.first().getAttribute("href");
  33  |     if (href) {
  34  |       await page.goto(href);
  35  |       await page.waitForLoadState("networkidle");
  36  |       if ((await page.locator('[data-testid="subtask-row"]').count()) > 0) return href;
  37  |     }
  38  |   }
  39  | 
  40  |   // Create one
  41  |   await page.goto("/projects/new");
  42  |   await page.fill('input[name="name"]', "R7 Test Project");
  43  |   await page.fill('input[name="semester"]', "Test 2026");
  44  |   await page.getByRole("button", { name: "Create Project" }).click();
  45  |   await page.waitForURL(
  46  |     (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
  47  |     { timeout: 15_000 }
  48  |   );
  49  |   const projectUrl = new URL(page.url()).pathname;
  50  | 
  51  |   await page.goto(`${projectUrl}/deliverables/new`);
  52  |   await page.waitForLoadState("networkidle");
  53  |   await page.fill('input[name="title"]', "R7 Deliverable");
  54  |   await page.fill('input[name="targetDate"]', "2026-12-31");
  55  |   await page.getByRole("button", { name: "Add Deliverable" }).click();
  56  |   await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  57  |   await page.waitForLoadState("networkidle");
  58  | 
  59  |   const card = page.locator("[data-deliverable-id]").first();
  60  |   await expect(card).toBeVisible({ timeout: 10_000 });
  61  | 
  62  |   // Subtask via the modal (the /subtasks/new page was removed in set 8)
  63  |   await page.goto(projectUrl);
  64  |   await page.waitForLoadState("networkidle");
  65  |   await addSubtaskViaModal(page, "R7 Subtask");
  66  | 
  67  |   return projectUrl;
  68  | }
  69  | 
  70  | test.describe("R7.1 — subtask row polish", () => {
  71  |   test.beforeAll(() => {
  72  |     fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  73  |   });
  74  | 
  75  |   test("status bullet, pill padding, click-name-to-reassign", async ({ page }) => {
  76  |     await login(page);
  77  |     const projectUrl = await getProjectWithSubtask(page);
  78  |     await page.goto(projectUrl);
  79  |     await page.waitForLoadState("networkidle");
  80  | 
  81  |     const firstRow = page.locator('[data-testid="subtask-row"]').first();
  82  | 
  83  |     // ── Default state ──────────────────────────────────────────────────────────
  84  |     await shot(page, "r7-subtask-row-default");
  85  | 
  86  |     // 1. Status bullet present (visual only — span, not button)
  87  |     const bullet = firstRow.locator('[data-testid="status-bullet"]');
  88  |     await expect(bullet).toBeVisible();
  89  |     const bulletTag = await bullet.evaluate((el) => el.tagName.toLowerCase());
  90  |     expect(bulletTag).toBe("span");
  91  | 
  92  |     // Bullet background matches STATUS_DOT_COLOR (one of the 4 status hex values)
  93  |     const bulletBg = await bullet.evaluate((el) =>
  94  |       window.getComputedStyle(el).backgroundColor
  95  |     );
  96  |     console.log("  Bullet bg:", bulletBg);
  97  |     expect([
  98  |       "rgb(120, 119, 116)", // NOT_STARTED
  99  |       "rgb(31, 108, 159)",  // IN_PROGRESS
  100 |       "rgb(164, 80, 60)",   // BLOCKED
  101 |       "rgb(88, 129, 87)",   // COMPLETE
  102 |     ]).toContain(bulletBg);
  103 | 
  104 |     // 2. Pill padding — py-1 (4px top+bottom in px) — measured on the container
  105 |     const pillContainer = firstRow.locator('[data-testid="status-pill-container"]').first();
  106 |     if ((await pillContainer.count()) > 0) {
  107 |       const pillPaddingTop = await pillContainer.evaluate(
  108 |         (el) => parseFloat(window.getComputedStyle(el).paddingTop)
  109 |       );
  110 |       console.log("  Pill container padding-top:", pillPaddingTop, "px");
  111 |       expect(pillPaddingTop).toBeGreaterThanOrEqual(4); // py-1 = 4px
  112 |     }
  113 | 
  114 |     // ── Hover state — bullet should glow ──────────────────────────────────────
  115 |     await firstRow.hover();
```