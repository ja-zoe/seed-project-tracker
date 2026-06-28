# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r10-status-lifecycle.spec.ts >> R10.2 — status-update lifecycle >> a submission after the meeting time is marked late
- Location: e2e/r10-status-lifecycle.spec.ts:74:7

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
  1   | import { expect, type Page } from "@playwright/test";
  2   | 
  3   | /**
  4   |  * Marker prepended to every e2e project name. The Playwright globalTeardown deletes
  5   |  * all projects whose name starts with it, so test data never piles up — and it can
  6   |  * never touch the user's real (unmarked) projects.
  7   |  */
  8   | export const E2E_MARKER = "[e2e] ";
  9   | 
  10  | export async function login(page: Page) {
  11  |   await page.goto("/dev-login");
  12  |   await page.fill("#netId", "jav273");
  13  |   await page.click('button[type="submit"]');
> 14  |   await page.waitForURL("**/dashboard", { timeout: 15_000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  15  | }
  16  | 
  17  | export async function createProject(page: Page, name: string, semester = "Test 2026"): Promise<string> {
  18  |   await page.goto("/projects/new");
  19  |   await page.fill('input[name="name"]', E2E_MARKER + name);
  20  |   await page.fill('input[name="semester"]', semester);
  21  |   await page.getByRole("button", { name: "Create Project" }).click();
  22  |   await page.waitForURL(
  23  |     (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
  24  |     { timeout: 15_000 }
  25  |   );
  26  |   return new URL(page.url()).pathname;
  27  | }
  28  | 
  29  | export async function createDeliverable(
  30  |   page: Page,
  31  |   projectUrl: string,
  32  |   title: string,
  33  |   targetDate = "2026-12-31"
  34  | ): Promise<string> {
  35  |   await page.goto(`${projectUrl}/deliverables/new`);
  36  |   await page.waitForLoadState("networkidle");
  37  |   await page.fill('input[name="title"]', title);
  38  |   await page.fill('input[name="targetDate"]', targetDate);
  39  |   await page.getByRole("button", { name: "Add Deliverable" }).click();
  40  |   await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  41  |   await page.waitForLoadState("networkidle");
  42  |   const card = page.locator("[data-deliverable-id]", { hasText: title }).first();
  43  |   await expect(card).toBeVisible({ timeout: 10_000 });
  44  |   const id = await card.getAttribute("data-deliverable-id");
  45  |   if (!id) throw new Error("could not read deliverable id");
  46  |   return id;
  47  | }
  48  | 
  49  | /** Add the dev user (jav273) to a project as a LEAD via the members page. */
  50  | export async function addSelfAsLead(page: Page, projectUrl: string) {
  51  |   await page.goto(`${projectUrl}/members`);
  52  |   await page.waitForLoadState("networkidle");
  53  |   const userSelect = page.locator('select[name="userId"]');
  54  |   const opts = await userSelect.locator("option").evaluateAll((os) =>
  55  |     (os as HTMLOptionElement[]).map((o) => ({ value: o.value, text: o.textContent ?? "" }))
  56  |   );
  57  |   const jav = opts.find((o) => o.text.includes("jav273"));
  58  |   if (!jav) throw new Error("jav273 not in member options");
  59  |   await userSelect.selectOption(jav.value);
  60  |   await page.locator('select[name="role"]').selectOption("LEAD");
  61  |   await page.getByRole("button", { name: "Add to Project" }).click();
  62  |   await page.waitForLoadState("networkidle");
  63  | }
  64  | 
  65  | /**
  66  |  * Create a global LEAD_MEETING calendar event in a given semester. Lead meetings are
  67  |  * semester-wide (not per-project), so any project in that semester can submit for it.
  68  |  */
  69  | export async function createLeadMeeting(page: Page, title: string, startsAtLocal: string, semester = "Test 2026") {
  70  |   await page.goto(`/calendar?semester=${encodeURIComponent(semester)}`);
  71  |   await page.waitForLoadState("networkidle");
  72  |   await page.getByRole("button", { name: "Add event" }).first().click();
  73  |   await page.locator('input[name="title"]').fill(title);
  74  |   await page.locator('select[name="type"]').selectOption("LEAD_MEETING");
  75  |   await page.locator('input[name="startsAt"]').fill(startsAtLocal);
  76  |   await page.getByRole("button", { name: "Add Event", exact: true }).click();
  77  |   await page.waitForTimeout(400);
  78  | }
  79  | 
  80  | /** A datetime-local string at now + offsetMs (e.g. tomorrow = +86_400_000). */
  81  | export function dtLocal(offsetMs: number): string {
  82  |   return new Date(Date.now() + offsetMs).toISOString().slice(0, 16);
  83  | }
  84  | 
  85  | /**
  86  |  * Add a subtask via the in-page modal (the /subtasks/new page was removed in set 8).
  87  |  * Assumes the project page is already loaded. `deliverableIndex` selects which
  88  |  * deliverable's "+ Add subtask" button to use (default: first).
  89  |  */
  90  | export async function addSubtaskViaModal(
  91  |   page: Page,
  92  |   title: string,
  93  |   deliverableIndex = 0
  94  | ) {
  95  |   await page.locator('[data-testid="add-subtask"]').nth(deliverableIndex).click();
  96  |   const titleInput = page.locator('[data-testid="subtask-modal-title"]');
  97  |   await expect(titleInput).toBeVisible({ timeout: 5_000 });
  98  |   await titleInput.fill(title);
  99  |   await page.locator('[data-testid="subtask-modal-submit"]').click();
  100 |   await expect(
  101 |     page.locator('[data-testid="subtask-row"]', { hasText: title })
  102 |   ).toBeVisible({ timeout: 10_000 });
  103 | }
  104 | 
```