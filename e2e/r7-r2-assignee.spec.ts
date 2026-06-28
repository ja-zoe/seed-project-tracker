import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { addSubtaskViaModal } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/7-inline-edit-polish/R7.1-subtask-row-polish/screenshots"
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

// Fresh project + deliverable + 2 subtasks + 1 assigned member (so the picker has a member to pick).
async function setupProject(page: Page): Promise<{ projectUrl: string; memberLabel: string }> {
  await page.goto("/projects/new");
  await page.fill('input[name="name"]', `R7.1r2 ${Date.now()}`);
  await page.fill('input[name="semester"]', "Test 2026");
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/projects/") && url.pathname !== "/projects/new",
    { timeout: 15_000 }
  );
  const projectUrl = new URL(page.url()).pathname;

  // Add a member so the assignee picker has [None, <member>]
  await page.goto(`${projectUrl}/members`);
  await page.waitForLoadState("networkidle");
  const userSelect = page.locator('select[name="userId"]');
  // first real option (index 1; index 0 is the "Select a user…" placeholder)
  const memberLabel = (await userSelect.locator("option").nth(1).textContent())?.trim() ?? "";
  await userSelect.selectOption({ index: 1 });
  await page.locator('select[name="role"]').selectOption("MEMBER");
  await page.getByRole("button", { name: "Add to Project" }).click();
  await page.waitForLoadState("networkidle");

  // Deliverable
  await page.goto(`${projectUrl}/deliverables/new`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="title"]', "R7.1r2 Deliverable");
  await page.fill('input[name="targetDate"]', "2026-12-31");
  await page.getByRole("button", { name: "Add Deliverable" }).click();
  await page.waitForURL((url) => url.pathname === projectUrl, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  const editLink = page.locator('a[href*="/deliverables/"][href*="/edit"]').first();
  await expect(editLink).toBeVisible({ timeout: 10_000 });

  // Two subtasks via the modal (the /subtasks/new page was removed in set 8)
  await page.goto(projectUrl);
  await page.waitForLoadState("networkidle");
  for (const title of ["R7.1r2 Subtask A", "R7.1r2 Subtask B"]) {
    await addSubtaskViaModal(page, title);
  }

  return { projectUrl, memberLabel };
}

test.describe("R7.1 round-2 — assignee picker scope, focus, keyboard; title confirm placement", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("clicking one assignee opens exactly one picker, autofocused, keyboard-selectable", async ({ page }) => {
    await login(page);
    const { projectUrl, memberLabel } = await setupProject(page);
    console.log("  member label:", memberLabel);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const rows = page.locator('[data-testid="subtask-row"]');
    await expect(rows).toHaveCount(2);

    // ── Click the FIRST row's assignee name ──────────────────────────────────
    const firstAssignee = rows.nth(0).locator('button[title="Change assignee"]');
    await firstAssignee.click();
    await page.waitForTimeout(200);
    await shot(page, "r7r2-one-picker-open");

    // Exactly ONE picker in the whole document (the bug opened all of them)
    const pickers = page.locator('[data-testid="assignee-picker"]');
    await expect(pickers).toHaveCount(1);

    // Auto-focused search input
    const search = pickers.first().locator("input");
    await expect(search).toBeFocused();

    // ── Keyboard: ArrowDown highlights the member (index 1), Enter selects it ──
    await search.press("ArrowDown");
    await page.waitForTimeout(100);
    const active = pickers.first().locator('[data-active="true"]');
    await expect(active).toHaveCount(1);
    const activeText = (await active.textContent())?.trim() ?? "";
    console.log("  active option after ArrowDown:", activeText);
    expect(activeText).not.toBe("None");

    await search.press("Enter");
    await page.waitForTimeout(200);
    // Picker closes after selection
    await expect(pickers).toHaveCount(0);

    // Selection is pending → commit via the right-panel Save button
    const saveBtn = rows.nth(0).locator('button[title="Save"]').first();
    await expect(saveBtn).toBeVisible({ timeout: 3_000 });
    await saveBtn.click();

    // After revalidation the first row's assignee shows the member (not "Unassigned")
    const firstAssigneeAfter = rows.nth(0).locator('button[title="Change assignee"]');
    await expect(firstAssigneeAfter).not.toContainText("Unassigned", { timeout: 8_000 });
    await shot(page, "r7r2-assignee-committed");
    console.log("  assignee committed via keyboard.");
  });

  test("editing a subtask title shows the confirm next to the title, not at the row's right edge", async ({ page }) => {
    await login(page);
    const { projectUrl } = await setupProject(page);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator('[data-testid="subtask-row"]').first();
    await firstRow.hover();
    await page.waitForTimeout(200);
    await firstRow.locator('[data-testid="pencil-btn"]').click();
    await page.waitForTimeout(150);

    const titleInput = firstRow.locator('input').first();
    await expect(titleInput).toBeVisible();
    await shot(page, "r7r2-title-confirm-adjacent");

    const confirmBtn = firstRow.locator('button[title="Confirm"]').first();
    await expect(confirmBtn).toBeVisible();

    // The confirm should sit just right of the title input — far from the row's right edge.
    const inputBox = await titleInput.boundingBox();
    const confirmBox = await confirmBtn.boundingBox();
    const rowBox = await firstRow.boundingBox();
    expect(confirmBox).not.toBeNull();
    // confirm is to the right of the input, but well within the left half of the row
    expect(confirmBox!.x).toBeGreaterThan(inputBox!.x);
    expect(confirmBox!.x).toBeLessThan(rowBox!.x + rowBox!.width * 0.6);
    console.log("  title confirm x:", Math.round(confirmBox!.x), "row right edge:", Math.round(rowBox!.x + rowBox!.width));
  });
});
