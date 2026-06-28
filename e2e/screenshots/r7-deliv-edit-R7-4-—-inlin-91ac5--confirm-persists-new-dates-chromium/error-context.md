# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r7-deliv-edit.spec.ts >> R7.4 — inline deliverable editing >> dates pencil appears on hover; edit + confirm persists new dates
- Location: e2e/r7-deliv-edit.spec.ts:126:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.goto: Test timeout of 60000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/projects/cmqy5ov6700259kv7cg1lihv0", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - link "SEED SEED Tracker" [ref=e6] [cursor=pointer]:
      - /url: /dashboard
      - img "SEED" [ref=e7]
      - generic [ref=e8]: SEED Tracker
    - navigation [ref=e9]:
      - link "Dashboard" [ref=e10] [cursor=pointer]:
        - /url: /dashboard
        - img [ref=e11]
        - text: Dashboard
      - link "Projects" [ref=e13] [cursor=pointer]:
        - /url: /projects
        - img [ref=e14]
        - text: Projects
      - link "My Tasks" [ref=e16] [cursor=pointer]:
        - /url: /my-tasks
        - img [ref=e17]
        - text: My Tasks
      - link "Action Items" [ref=e19] [cursor=pointer]:
        - /url: /action-items
        - img [ref=e20]
        - text: Action Items
      - link "Semester Calendar" [ref=e22] [cursor=pointer]:
        - /url: /calendar
        - img [ref=e23]
        - text: Semester Calendar
      - link "Account" [ref=e25] [cursor=pointer]:
        - /url: /account
        - img [ref=e26]
        - text: Account
      - paragraph [ref=e29]: PM Tools
      - link "Users & Roles" [ref=e30] [cursor=pointer]:
        - /url: /pm/users
        - img [ref=e31]
        - text: Users & Roles
      - link "Monthly Review" [ref=e33] [cursor=pointer]:
        - /url: /pm/review
        - img [ref=e34]
        - text: Monthly Review
      - link "Settings" [ref=e36] [cursor=pointer]:
        - /url: /pm/settings
        - img [ref=e37]
        - text: Settings
    - generic [ref=e39]:
      - generic [ref=e40]:
        - generic [ref=e41]:
          - paragraph [ref=e42]: Julian
          - paragraph [ref=e43]: jav273@scarletmail.rutgers.edu
        - button "Notifications" [ref=e45]:
          - img [ref=e46]
      - button "Sign out" [ref=e49]:
        - img [ref=e50]
        - text: Sign out
  - main [ref=e52]:
    - generic [ref=e55]:
      - generic [ref=e56]:
        - link "Projects" [ref=e57] [cursor=pointer]:
          - /url: /projects
          - img [ref=e58]
          - text: Projects
        - generic [ref=e60]:
          - generic [ref=e61]:
            - generic [ref=e62]:
              - heading "[e2e] R7.4 Edit Project 1782673358661" [level=1] [ref=e63]
              - generic [ref=e64]: On Track
            - paragraph [ref=e65]: Test 2026
            - paragraph [ref=e66]:
              - img [ref=e67]
              - text: Jun 2026 – Present · 0 days
          - generic [ref=e69]:
            - button "Edit project" [ref=e70]:
              - img [ref=e71]
              - text: Edit project
            - link "Record Meeting" [ref=e73] [cursor=pointer]:
              - /url: /projects/cmqy5ov6700259kv7cg1lihv0/meeting/new
              - img [ref=e74]
              - text: Record Meeting
      - generic [ref=e77]:
        - generic [ref=e78]:
          - heading "Deliverables" [level=2] [ref=e79]
          - generic [ref=e80]:
            - button "Sort by status" [ref=e81]:
              - img [ref=e82]
              - text: Sort by status
            - link "Add deliverable" [ref=e84] [cursor=pointer]:
              - /url: /projects/cmqy5ov6700259kv7cg1lihv0/deliverables/new
              - img [ref=e85]
              - text: Add deliverable
        - generic [ref=e90]:
          - 'button "R7.4 Original Title Not Started Med + Group Target: Dec 30, 2026 Edit Delete" [ref=e91] [cursor=pointer]':
            - generic [ref=e92]:
              - generic [ref=e93]:
                - generic [ref=e94]: R7.4 Original Title
                - button "Edit title" [ref=e95]:
                  - img [ref=e96]
                - generic [ref=e98]:
                  - button "Not Started" [ref=e99]
                  - generic:
                    - button:
                      - img
                    - button:
                      - img
                - button "Med" [ref=e101]
                - button "+ Group" [ref=e103]
              - generic [ref=e104]:
                - paragraph [ref=e105]: "Target: Dec 30, 2026"
                - button "Edit dates" [ref=e106]:
                  - img [ref=e107]
            - generic [ref=e109]:
              - button "Edit" [ref=e110]
              - button "Delete" [ref=e111]
          - button "Add subtask" [ref=e113]:
            - img [ref=e114]
            - text: Add subtask
      - generic [ref=e116]:
        - heading "Action Items" [level=2] [ref=e118]:
          - img [ref=e119]
          - text: Action Items
        - generic [ref=e121]:
          - textbox "New action item…" [ref=e122]
          - combobox [ref=e123]:
            - option "No owner" [selected]
          - textbox [ref=e124]
          - button [ref=e125]:
            - img [ref=e126]
        - paragraph [ref=e128]: No action items yet.
      - generic [ref=e129]:
        - generic [ref=e130]:
          - heading "Team" [level=2] [ref=e131]
          - link "Manage members" [ref=e132] [cursor=pointer]:
            - /url: /projects/cmqy5ov6700259kv7cg1lihv0/members
        - paragraph [ref=e133]: No members assigned.
      - generic [ref=e134]:
        - link "View timeline →" [ref=e135] [cursor=pointer]:
          - /url: /projects/cmqy5ov6700259kv7cg1lihv0/timeline
        - link "Project Standing History →" [ref=e136] [cursor=pointer]:
          - /url: /projects/cmqy5ov6700259kv7cg1lihv0/history
```

# Test source

```ts
  29  |   await page.getByRole("button", { name: "Create Project" }).click();
  30  |   await page.waitForURL(
  31  |     (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
  32  |     { timeout: 15_000 }
  33  |   );
  34  |   const projectUrl = new URL(page.url()).pathname;
  35  | 
  36  |   await page.goto(`${projectUrl}/deliverables/new`);
  37  |   await page.waitForLoadState("networkidle");
  38  |   await page.fill('input[name="title"]', "R7.4 Original Title");
  39  |   await page.fill('input[name="targetDate"]', "2026-12-31");
  40  |   await page.getByRole("button", { name: "Add Deliverable" }).click();
  41  |   await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  42  |   await page.waitForLoadState("networkidle");
  43  | 
  44  |   return projectUrl;
  45  | }
  46  | 
  47  | test.describe("R7.4 — inline deliverable editing", () => {
  48  |   test.beforeAll(() => {
  49  |     fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  50  |   });
  51  | 
  52  |   test("title pencil appears on hover; edit + confirm persists new title", async ({ page }) => {
  53  |     await login(page);
  54  |     const projectUrl = await getProjectWithDeliverable(page);
  55  |     await page.goto(projectUrl);
  56  |     await page.waitForLoadState("networkidle");
  57  | 
  58  |     const header = page.locator('.border.border-border.rounded-xl .bg-card').first();
  59  |     await expect(header).toBeVisible();
  60  |     await shot(page, "r7-deliv-default");
  61  | 
  62  |     // ── Title pencil hidden at rest ────────────────────────────────────────────
  63  |     const titlePencil = header.locator('[data-testid="deliv-title-pencil"]').first();
  64  |     // It exists in DOM but is transparent (opacity-0); Playwright sees hidden
  65  |     const pencilInitialOpacity = await titlePencil.evaluate(
  66  |       (el) => window.getComputedStyle(el).opacity
  67  |     );
  68  |     console.log("  Title pencil initial opacity:", pencilInitialOpacity);
  69  |     expect(parseFloat(pencilInitialOpacity)).toBeLessThan(0.5);
  70  | 
  71  |     // ── Hover → pencil visible ────────────────────────────────────────────────
  72  |     await header.hover();
  73  |     await page.waitForTimeout(300);
  74  |     await shot(page, "r7-deliv-hover-pencil");
  75  | 
  76  |     const pencilHoverOpacity = await titlePencil.evaluate(
  77  |       (el) => window.getComputedStyle(el).opacity
  78  |     );
  79  |     console.log("  Title pencil hover opacity:", pencilHoverOpacity);
  80  |     expect(parseFloat(pencilHoverOpacity)).toBeGreaterThan(0.5);
  81  | 
  82  |     // ── Click pencil → input appears ─────────────────────────────────────────
  83  |     await titlePencil.click();
  84  |     await page.waitForTimeout(150);
  85  | 
  86  |     const titleInput = header.locator('[data-testid="deliv-title-input"]').first();
  87  |     await expect(titleInput).toBeVisible({ timeout: 3_000 });
  88  |     await shot(page, "r7-deliv-title-editing");
  89  | 
  90  |     // InlineConfirm should be visible
  91  |     const confirmBtn = header.locator('button[title="Confirm"]').first();
  92  |     const cancelBtn = header.locator('button[title="Cancel"]').first();
  93  |     await expect(confirmBtn).toBeVisible();
  94  |     await expect(cancelBtn).toBeVisible();
  95  | 
  96  |     // ── Type new title ────────────────────────────────────────────────────────
  97  |     const newTitle = `R7.4 Edited ${Date.now()}`;
  98  |     await titleInput.fill(newTitle);
  99  |     await shot(page, "r7-deliv-title-filled");
  100 | 
  101 |     // ── Confirm → input gone, new title in DOM ────────────────────────────────
  102 |     await confirmBtn.click();
  103 |     await page.waitForTimeout(200);
  104 |     // After RSC revalidation, the new title should appear
  105 |     await expect(header.locator(`text=${newTitle}`)).toBeVisible({ timeout: 10_000 });
  106 |     await shot(page, "r7-deliv-title-committed");
  107 |     console.log("  New title confirmed:", newTitle);
  108 | 
  109 |     // ── Cancel reverts ────────────────────────────────────────────────────────
  110 |     await header.hover();
  111 |     await page.waitForTimeout(200);
  112 |     const titlePencil2 = header.locator('[data-testid="deliv-title-pencil"]').first();
  113 |     await titlePencil2.click();
  114 |     await page.waitForTimeout(150);
  115 |     const titleInput2 = header.locator('[data-testid="deliv-title-input"]').first();
  116 |     await titleInput2.fill("This will be cancelled");
  117 |     const cancelBtn2 = header.locator('button[title="Cancel"]').first();
  118 |     await cancelBtn2.click();
  119 |     await page.waitForTimeout(150);
  120 |     // The new title (from previous commit) should still be shown, not the cancelled edit
  121 |     await expect(header.locator(`text=${newTitle}`)).toBeVisible();
  122 |     await shot(page, "r7-deliv-title-cancel-reverted");
  123 |     console.log("  Cancel correctly reverted.");
  124 |   });
  125 | 
  126 |   test("dates pencil appears on hover; edit + confirm persists new dates", async ({ page }) => {
  127 |     await login(page);
  128 |     const projectUrl = await getProjectWithDeliverable(page);
> 129 |     await page.goto(projectUrl);
      |                ^ Error: page.goto: Test timeout of 60000ms exceeded.
  130 |     await page.waitForLoadState("networkidle");
  131 | 
  132 |     const header = page.locator('.border.border-border.rounded-xl .bg-card').first();
  133 |     await expect(header).toBeVisible();
  134 | 
  135 |     // ── Hover dates area → dates pencil visible ───────────────────────────────
  136 |     const datesGroup = header.locator('.group\\/deliv-dates').first();
  137 |     await datesGroup.hover();
  138 |     await page.waitForTimeout(300);
  139 |     await shot(page, "r7-deliv-dates-hover");
  140 | 
  141 |     const datesPencil = datesGroup.locator('[data-testid="deliv-dates-pencil"]').first();
  142 |     const datesPencilOpacity = await datesPencil.evaluate(
  143 |       (el) => window.getComputedStyle(el).opacity
  144 |     );
  145 |     console.log("  Dates pencil hover opacity:", datesPencilOpacity);
  146 |     expect(parseFloat(datesPencilOpacity)).toBeGreaterThan(0.5);
  147 | 
  148 |     // ── Click pencil → date inputs appear ────────────────────────────────────
  149 |     await datesPencil.click();
  150 |     await page.waitForTimeout(150);
  151 | 
  152 |     const targetInput = header.locator('[data-testid="deliv-target-input"]').first();
  153 |     await expect(targetInput).toBeVisible({ timeout: 3_000 });
  154 |     const startInput = header.locator('[data-testid="deliv-start-input"]').first();
  155 |     await expect(startInput).toBeVisible();
  156 |     await shot(page, "r7-deliv-dates-editing");
  157 | 
  158 |     // ── Set valid dates ───────────────────────────────────────────────────────
  159 |     await startInput.fill("2026-01-15");
  160 |     await targetInput.fill("2026-11-30");
  161 |     await shot(page, "r7-deliv-dates-filled");
  162 | 
  163 |     const confirmBtn = header.locator('[data-testid="deliv-dates-edit"] button[title="Confirm"]');
  164 |     await confirmBtn.click();
  165 |     await page.waitForTimeout(200);
  166 | 
  167 |     // After RSC revalidation, dates should update
  168 |     await expect(header.locator('text=Nov')).toBeVisible({ timeout: 10_000 });
  169 |     await shot(page, "r7-deliv-dates-committed");
  170 |     console.log("  Dates confirmed (Nov 30 visible).");
  171 | 
  172 |     // ── Invalid: startDate > targetDate → error, no commit ───────────────────
  173 |     await datesGroup.hover();
  174 |     await page.waitForTimeout(200);
  175 |     const datesPencil2 = datesGroup.locator('[data-testid="deliv-dates-pencil"]').first();
  176 |     await datesPencil2.click();
  177 |     await page.waitForTimeout(150);
  178 |     const startInput2 = header.locator('[data-testid="deliv-start-input"]').first();
  179 |     const targetInput2 = header.locator('[data-testid="deliv-target-input"]').first();
  180 |     await startInput2.fill("2027-01-01");
  181 |     await targetInput2.fill("2026-01-01");
  182 |     const confirmBtn2 = header.locator('[data-testid="deliv-dates-edit"] button[title="Confirm"]');
  183 |     await confirmBtn2.click();
  184 |     await page.waitForTimeout(200);
  185 |     await shot(page, "r7-deliv-dates-error");
  186 | 
  187 |     // Error message should appear, inputs still visible (no commit)
  188 |     const errorMsg = header.locator('text=Start must be before target').first();
  189 |     await expect(errorMsg).toBeVisible({ timeout: 3_000 });
  190 |     console.log("  Invalid date error shown correctly.");
  191 |     // Input should still be visible (edit was not committed)
  192 |     await expect(targetInput2).toBeVisible();
  193 |   });
  194 | });
  195 | 
```