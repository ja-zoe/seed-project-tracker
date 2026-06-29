# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r12-pending-status.spec.ts >> R12.2 — multiple pending project standings >> two pending meetings: switch, submit each, count decrements
- Location: e2e/r12-pending-status.spec.ts:10:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.fill: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('input[name="name"]')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [active]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - navigation [ref=e7]:
            - button "previous" [disabled] [ref=e8]:
              - img "previous" [ref=e9]
            - generic [ref=e11]:
              - generic [ref=e12]: 1/
              - text: "1"
            - button "next" [disabled] [ref=e13]:
              - img "next" [ref=e14]
          - img
        - generic [ref=e16]:
          - generic [ref=e17]:
            - img [ref=e18]
            - generic "Latest available version is detected (16.2.9)." [ref=e20]: Next.js 16.2.9
            - generic [ref=e21]: Turbopack
          - img
      - dialog "Runtime PrismaClientKnownRequestError" [ref=e23]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]:
                - generic [ref=e30]: Runtime PrismaClientKnownRequestError
                - generic [ref=e31]: Server
              - generic [ref=e32]:
                - button "Copy Error Info" [ref=e33] [cursor=pointer]:
                  - img [ref=e34]
                - button "No related documentation found" [disabled] [ref=e36]:
                  - img [ref=e37]
                - button "Attach Node.js inspector" [ref=e39] [cursor=pointer]:
                  - img [ref=e40]
            - generic [ref=e49]: "Invalid `prisma.role.findUnique()` invocation: Value 'MANAGE_MEETING_RECORDS' not found in enum 'Permission'"
          - generic [ref=e50]:
            - generic [ref=e51]:
              - paragraph [ref=e53]:
                - img [ref=e55]
                - generic [ref=e57]: src/generated/prisma/runtime/client.js (69:8286) @ zr.handleRequestError
                - button "Open in editor" [ref=e58] [cursor=pointer]:
                  - img [ref=e60]
              - generic [ref=e63]:
                - generic [ref=e64]: 67 | ...
                - generic [ref=e65]: 68 | ...
                - generic [ref=e66]: "> 69 | ...t u=s?{modelName:s,...t.meta}:t.meta;throw new b.PrismaClientKnownRequestError(l,{code:..."
                - generic [ref=e67]: "| ^"
                - generic [ref=e68]: 70 | ...
                - generic [ref=e69]: 71 | ...
                - generic [ref=e70]: 72 | ...
            - generic [ref=e71]:
              - generic [ref=e72]:
                - paragraph [ref=e73]:
                  - text: Call Stack
                  - generic [ref=e74]: "11"
                - button "Show 5 ignore-listed frame(s)" [ref=e75] [cursor=pointer]:
                  - text: Show 5 ignore-listed frame(s)
                  - img [ref=e76]
              - generic [ref=e78]:
                - generic [ref=e79]:
                  - text: zr.handleRequestError
                  - button "Open zr.handleRequestError in editor" [ref=e80] [cursor=pointer]:
                    - img [ref=e81]
                - text: src/generated/prisma/runtime/client.js (69:8286)
              - generic [ref=e83]:
                - generic [ref=e84]:
                  - text: zr.handleAndLogRequestError
                  - button "Open zr.handleAndLogRequestError in editor" [ref=e85] [cursor=pointer]:
                    - img [ref=e86]
                - text: src/generated/prisma/runtime/client.js (69:7581)
              - generic [ref=e88]:
                - generic [ref=e89]:
                  - text: zr.request
                  - button "Open zr.request in editor" [ref=e90] [cursor=pointer]:
                    - img [ref=e91]
                - text: src/generated/prisma/runtime/client.js (69:7288)
              - generic [ref=e93]:
                - generic [ref=e94]:
                  - text: a
                  - button "Open a in editor" [ref=e95] [cursor=pointer]:
                    - img [ref=e96]
                - text: src/generated/prisma/runtime/client.js (79:6862)
              - generic [ref=e98]:
                - generic [ref=e99]:
                  - text: getUserPermissions
                  - button "Open getUserPermissions in editor" [ref=e100] [cursor=pointer]:
                    - img [ref=e101]
                - text: src/lib/permissions.ts (26:16)
              - generic [ref=e103]:
                - generic [ref=e104]:
                  - text: AppLayout
                  - button "Open AppLayout in editor" [ref=e105] [cursor=pointer]:
                    - img [ref=e106]
                - text: src/app/(app)/layout.tsx (24:23)
        - generic [ref=e108]: "1"
        - generic [ref=e109]: "2"
    - generic [ref=e114] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e115]:
        - img [ref=e116]
      - generic [ref=e119]:
        - button "Open issues overlay" [ref=e120]:
          - generic [ref=e121]:
            - generic [ref=e122]: "0"
            - generic [ref=e123]: "1"
          - generic [ref=e124]: Issue
        - button "Collapse issues badge" [ref=e125]:
          - img [ref=e126]
  - generic [ref=e129]:
    - img [ref=e130]
    - heading "This page couldn’t load" [level=1] [ref=e132]
    - paragraph [ref=e133]: A server error occurred. Reload to try again.
    - button "Reload" [ref=e136] [cursor=pointer]
  - paragraph [ref=e137]: ERROR 4027676571
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
  14  |   await page.waitForURL("**/dashboard", { timeout: 15_000 });
  15  | }
  16  | 
  17  | export async function createProject(page: Page, name: string, semester = "Test 2026"): Promise<string> {
  18  |   await page.goto("/projects/new");
> 19  |   await page.fill('input[name="name"]', E2E_MARKER + name);
      |              ^ Error: page.fill: Test timeout of 60000ms exceeded.
  20  |   await setSemesterField(page, "project-semester", semester);
  21  |   await page.getByRole("button", { name: "Create Project" }).click();
  22  |   await page.waitForURL(
  23  |     (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
  24  |     { timeout: 15_000 }
  25  |   );
  26  |   return new URL(page.url()).pathname;
  27  | }
  28  | 
  29  | /**
  30  |  * Set a SemesterField (select-existing-or-create-new). If it's currently a <select>,
  31  |  * choose "+ New semester…" first to reveal the text input, then type the value.
  32  |  */
  33  | export async function setSemesterField(page: Page, testId: string, semester: string) {
  34  |   const field = page.locator(`[data-testid="${testId}"]`);
  35  |   await field.waitFor({ state: "visible", timeout: 10_000 });
  36  |   const tag = await field.evaluate((el) => el.tagName);
  37  |   if (tag === "SELECT") {
  38  |     await field.selectOption("__new__");
  39  |   }
  40  |   await page.locator(`[data-testid="${testId}"]`).fill(semester);
  41  | }
  42  | 
  43  | export async function createDeliverable(
  44  |   page: Page,
  45  |   projectUrl: string,
  46  |   title: string,
  47  |   targetDate = "2026-12-31"
  48  | ): Promise<string> {
  49  |   await page.goto(`${projectUrl}/deliverables/new`);
  50  |   await page.waitForLoadState("networkidle");
  51  |   await page.fill('input[name="title"]', title);
  52  |   await page.fill('input[name="targetDate"]', targetDate);
  53  |   await page.getByRole("button", { name: "Add Deliverable" }).click();
  54  |   await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  55  |   await page.waitForLoadState("networkidle");
  56  |   const card = page.locator("[data-deliverable-id]", { hasText: title }).first();
  57  |   await expect(card).toBeVisible({ timeout: 10_000 });
  58  |   const id = await card.getAttribute("data-deliverable-id");
  59  |   if (!id) throw new Error("could not read deliverable id");
  60  |   return id;
  61  | }
  62  | 
  63  | /** Add the dev user (jav273) to a project as a LEAD via the members page. */
  64  | export async function addSelfAsLead(page: Page, projectUrl: string) {
  65  |   await page.goto(`${projectUrl}/members`);
  66  |   await page.waitForLoadState("networkidle");
  67  |   const userSelect = page.locator('select[name="userId"]');
  68  |   const opts = await userSelect.locator("option").evaluateAll((os) =>
  69  |     (os as HTMLOptionElement[]).map((o) => ({ value: o.value, text: o.textContent ?? "" }))
  70  |   );
  71  |   const jav = opts.find((o) => o.text.includes("jav273"));
  72  |   if (!jav) throw new Error("jav273 not in member options");
  73  |   await userSelect.selectOption(jav.value);
  74  |   await page.locator('select[name="role"]').selectOption("LEAD");
  75  |   await page.getByRole("button", { name: "Add to Project" }).click();
  76  |   await page.waitForLoadState("networkidle");
  77  | }
  78  | 
  79  | /**
  80  |  * Create a global LEAD_MEETING calendar event pinned to one or more semesters. Lead
  81  |  * meetings are semester-wide (not per-project): every project whose semester is in the
  82  |  * pinned set can submit for the meeting. `pinSemesters` defaults to [semester]; pass a
  83  |  * list to pin the meeting across multiple semesters.
  84  |  */
  85  | export async function createLeadMeeting(
  86  |   page: Page,
  87  |   title: string,
  88  |   startsAtLocal: string,
  89  |   semester = "Test 2026",
  90  |   pinSemesters?: string[]
  91  | ) {
  92  |   await page.goto(`/calendar?semester=${encodeURIComponent(semester)}`);
  93  |   await page.waitForLoadState("networkidle");
  94  |   await page.getByRole("button", { name: "Add event" }).first().click();
  95  |   await page.locator('input[name="title"]').fill(title);
  96  |   await page.locator('select[name="type"]').selectOption("LEAD_MEETING");
  97  |   await page.locator('input[name="startsAt"]').fill(startsAtLocal);
  98  | 
  99  |   // The pinned-semester checkboxes appear once type = LEAD_MEETING. The active semester
  100 |   // is pre-checked; ensure exactly the requested set is checked.
  101 |   const targets = pinSemesters ?? [semester];
  102 |   const group = page.locator('[data-testid="meeting-semesters"]');
  103 |   await group.waitFor({ state: "visible", timeout: 5_000 });
  104 |   const boxes = group.locator('input[type="checkbox"]');
  105 |   const count = await boxes.count();
  106 |   for (let i = 0; i < count; i++) {
  107 |     const box = boxes.nth(i);
  108 |     const label = (await box.locator("xpath=..").innerText()).trim();
  109 |     const shouldCheck = targets.includes(label);
  110 |     if ((await box.isChecked()) !== shouldCheck) {
  111 |       await box.click();
  112 |     }
  113 |   }
  114 | 
  115 |   await page.getByRole("button", { name: "Add Event", exact: true }).click();
  116 |   await page.waitForTimeout(400);
  117 | }
  118 | 
  119 | /** A datetime-local string at now + offsetMs (e.g. tomorrow = +86_400_000). */
```