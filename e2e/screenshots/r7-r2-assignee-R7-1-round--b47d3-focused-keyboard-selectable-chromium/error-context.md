# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r7-r2-assignee.spec.ts >> R7.1 round-2 — assignee picker scope, focus, keyboard; title confirm placement >> clicking one assignee opens exactly one picker, autofocused, keyboard-selectable
- Location: e2e/r7-r2-assignee.spec.ts:71:7

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
  19  |   await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  20  |   console.log(`  📸 ${name}.png`);
  21  | }
  22  | 
  23  | // Fresh project + deliverable + 2 subtasks + 1 assigned member (so the picker has a member to pick).
  24  | async function setupProject(page: Page): Promise<{ projectUrl: string; memberLabel: string }> {
  25  |   await page.goto("/projects/new");
  26  |   await page.fill('input[name="name"]', `R7.1r2 ${Date.now()}`);
  27  |   await page.fill('input[name="semester"]', "Test 2026");
  28  |   await page.getByRole("button", { name: "Create Project" }).click();
  29  |   await page.waitForURL(
  30  |     (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
  31  |     { timeout: 15_000 }
  32  |   );
  33  |   const projectUrl = new URL(page.url()).pathname;
  34  | 
  35  |   // Add a member so the assignee picker has [None, <member>]
  36  |   await page.goto(`${projectUrl}/members`);
  37  |   await page.waitForLoadState("networkidle");
  38  |   const userSelect = page.locator('select[name="userId"]');
  39  |   // first real option (index 1; index 0 is the "Select a user…" placeholder)
  40  |   const memberLabel = (await userSelect.locator("option").nth(1).textContent())?.trim() ?? "";
  41  |   await userSelect.selectOption({ index: 1 });
  42  |   await page.locator('select[name="role"]').selectOption("MEMBER");
  43  |   await page.getByRole("button", { name: "Add to Project" }).click();
  44  |   await page.waitForLoadState("networkidle");
  45  | 
  46  |   // Deliverable
  47  |   await page.goto(`${projectUrl}/deliverables/new`);
  48  |   await page.waitForLoadState("networkidle");
  49  |   await page.fill('input[name="title"]', "R7.1r2 Deliverable");
  50  |   await page.fill('input[name="targetDate"]', "2026-12-31");
  51  |   await page.getByRole("button", { name: "Add Deliverable" }).click();
  52  |   await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  53  |   await page.waitForLoadState("networkidle");
  54  | 
  55  |   const card = page.locator("[data-deliverable-id]").first();
  56  |   await expect(card).toBeVisible({ timeout: 10_000 });
  57  | 
  58  |   // Two subtasks via the modal (the /subtasks/new page was removed in set 8)
  59  |   await page.goto(projectUrl);
  60  |   await page.waitForLoadState("networkidle");
  61  |   for (const title of ["R7.1r2 Subtask A", "R7.1r2 Subtask B"]) {
  62  |     await addSubtaskViaModal(page, title);
  63  |   }
  64  | 
  65  |   return { projectUrl, memberLabel };
  66  | }
  67  | 
  68  | test.describe("R7.1 round-2 — assignee picker scope, focus, keyboard; title confirm placement", () => {
  69  |   test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));
  70  | 
  71  |   test("clicking one assignee opens exactly one picker, autofocused, keyboard-selectable", async ({ page }) => {
  72  |     await login(page);
  73  |     const { projectUrl, memberLabel } = await setupProject(page);
  74  |     console.log("  member label:", memberLabel);
  75  |     await page.goto(projectUrl);
  76  |     await page.waitForLoadState("networkidle");
  77  | 
  78  |     const rows = page.locator('[data-testid="subtask-row"]');
  79  |     await expect(rows).toHaveCount(2);
  80  | 
  81  |     // ── Click the FIRST row's assignee name ──────────────────────────────────
  82  |     const firstAssignee = rows.nth(0).locator('button[title="Change assignee"]');
  83  |     await firstAssignee.click();
  84  |     await page.waitForTimeout(200);
  85  |     await shot(page, "r7r2-one-picker-open");
  86  | 
  87  |     // Exactly ONE picker in the whole document (the bug opened all of them)
  88  |     const pickers = page.locator('[data-testid="assignee-picker"]');
  89  |     await expect(pickers).toHaveCount(1);
  90  | 
  91  |     // Auto-focused search input
  92  |     const search = pickers.first().locator("input");
  93  |     await expect(search).toBeFocused();
  94  | 
  95  |     // ── Keyboard: ArrowDown highlights the member (index 1), Enter selects it ──
  96  |     await search.press("ArrowDown");
  97  |     await page.waitForTimeout(100);
  98  |     const active = pickers.first().locator('[data-active="true"]');
  99  |     await expect(active).toHaveCount(1);
  100 |     const activeText = (await active.textContent())?.trim() ?? "";
  101 |     console.log("  active option after ArrowDown:", activeText);
  102 |     expect(activeText).not.toBe("None");
  103 | 
  104 |     await search.press("Enter");
  105 |     await page.waitForTimeout(200);
  106 |     // Picker closes after selection
  107 |     await expect(pickers).toHaveCount(0);
  108 | 
  109 |     // Selection is pending → commit via the right-panel Save button
  110 |     const saveBtn = rows.nth(0).locator('button[title="Save"]').first();
  111 |     await expect(saveBtn).toBeVisible({ timeout: 3_000 });
  112 |     await saveBtn.click();
  113 | 
  114 |     // After revalidation the first row's assignee shows the member (not "Unassigned")
  115 |     const firstAssigneeAfter = rows.nth(0).locator('button[title="Change assignee"]');
```