import { test, expect, type Locator } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable, addSubtaskViaModal } from "./helpers";

/**
 * R19 — site-wide clickability affordances.
 *
 * Verifies the convention from R19.1 as rolled out in R19.2:
 *  - clickable icons/controls: cursor `pointer` + a hover color shift to
 *    forest (--primary #2E4034) or clay (--destructive #A4503C, destructive).
 *  - container rows (deliverable/subtask): a hover background TINT but cursor
 *    NOT `pointer` (the pointer belongs to the controls inside).
 *  - the same class of object behaves identically across instances.
 *  - a static display element (a non-button status badge) gets neither pointer
 *    nor a hover cue.
 */

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

const FOREST = "rgb(46, 64, 52)"; // --primary  #2E4034
const CLAY = "rgb(164, 80, 60)"; //  --destructive #A4503C

const cursorOf = (l: Locator) => l.evaluate((el) => getComputedStyle(el).cursor);
const colorOf = (l: Locator) => l.evaluate((el) => getComputedStyle(el).color);
const bgOf = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);

async function shot(page: import("@playwright/test").Page, name: string) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
}

test.describe("R19 — clickability affordances", () => {
  test("controls get pointer + color; rows get tint + default cursor; statics get nothing", async ({
    page,
  }) => {
    await login(page);
    const projectUrl = await createProject(page, `R19 Affordances ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R19 Deliverable");

    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await addSubtaskViaModal(page, "R19 Subtask A");
    await addSubtaskViaModal(page, "R19 Subtask B");

    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // ─── Container row: DEFAULT cursor + hover background tint ──────────────────
    const delivHeader = page.locator('[data-testid="deliverable-header"]').first();
    await expect(delivHeader).toBeVisible();

    expect(await cursorOf(delivHeader)).not.toBe("pointer");

    const headerBgRest = await bgOf(delivHeader);
    await delivHeader.hover();
    await page.waitForTimeout(250);
    const headerBgHover = await bgOf(delivHeader);
    expect(headerBgHover).not.toBe(headerBgRest); // a tint was applied
    await shot(page, "r19-deliverables");

    // ─── Control INSIDE the row: pointer + forest color shift ──────────────────
    // (the title pencil reveals on row hover; it stays revealed while we hover it
    //  because it lives inside the hovered header group)
    await delivHeader.hover();
    const titlePencil = page.locator('[data-testid="deliv-title-pencil"]').first();
    expect(await cursorOf(titlePencil)).toBe("pointer");
    await titlePencil.hover();
    await page.waitForTimeout(200);
    expect(await colorOf(titlePencil)).toBe(FOREST);

    // ─── Destructive control: pointer + clay color shift ───────────────────────
    const delBtn = page.locator('[data-testid="deliverable-delete"]').first();
    await expect(delBtn).toBeVisible();
    expect(await cursorOf(delBtn)).toBe("pointer");
    await delBtn.hover();
    await page.waitForTimeout(200);
    expect(await colorOf(delBtn)).toBe(CLAY);

    // ─── Subtask rows: consistency across instances ────────────────────────────
    const rows = page.locator('[data-testid="subtask-row-body"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(2);

    // Every subtask row: default cursor (not pointer) — identical behavior.
    for (let i = 0; i < rowCount; i++) {
      expect(await cursorOf(rows.nth(i))).not.toBe("pointer");
    }

    // Row hover tint on a representative row.
    const row0 = rows.first();
    const row0Rest = await bgOf(row0);
    await row0.hover();
    await page.waitForTimeout(200);
    expect(await bgOf(row0)).not.toBe(row0Rest);

    // Every inline-edit pencil inside a subtask row: pointer — identical behavior.
    for (let i = 0; i < rowCount; i++) {
      await rows.nth(i).hover();
      const pencil = rows.nth(i).locator('[data-testid="pencil-btn"]');
      await expect(pencil).toBeVisible();
      expect(await cursorOf(pencil)).toBe("pointer");
    }

    // ─── Account page control (icon button) gets a pointer ─────────────────────
    await page.goto("/account");
    await page.waitForLoadState("networkidle");
    const tokenBtn = page.getByRole("button", { name: /Generate token|Regenerate/ }).first();
    await expect(tokenBtn).toBeVisible();
    expect(await cursorOf(tokenBtn)).toBe("pointer");

    // ─── No false affordance: a static status badge ────────────────────────────
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    const badge = page.locator('[data-testid="project-status-badge"]').first();
    await expect(badge).toBeVisible();
    expect(await cursorOf(badge)).not.toBe("pointer");
    const badgeColorRest = await colorOf(badge);
    await badge.hover();
    await page.waitForTimeout(200);
    expect(await colorOf(badge)).toBe(badgeColorRest); // no hover color cue

    // ─── Action-items surface: row controls are pointer, screenshot for review ──
    await page.goto(`${projectUrl}/action-items`);
    await page.waitForLoadState("networkidle");
    await shot(page, "r19-action-items");
  });
});
