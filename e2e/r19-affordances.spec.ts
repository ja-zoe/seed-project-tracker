import { test, expect, type Locator, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable, addSubtaskViaModal } from "./helpers";

/**
 * R19 — site-wide clickability affordances.
 *
 * Verifies the convention from R19.1 as rolled out in R19.2 and completed in R19.3:
 *  - clickable icons/controls: cursor `pointer` + a hover color shift to
 *    forest (--primary #2E4034) or clay (--destructive #A4503C, destructive).
 *  - container rows (deliverable/subtask): a hover background TINT but cursor
 *    NOT `pointer` (the pointer belongs to the controls inside).
 *  - the same class of object behaves identically across instances.
 *  - a status badge that opens a change dropdown IS interactive (gets the cue) —
 *    on BOTH the editable deliverable header and every subtask. The ONLY static
 *    status case is the *locked* deliverable status, which can't be changed.
 *  - R19.3: the audit is exhaustive — EVERY clickable in EVERY authenticated view
 *    (button / link / role=button / summary / select) carries a pointer cue.
 */

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

const FOREST = "rgb(46, 64, 52)"; // --primary  #2E4034
const CLAY = "rgb(164, 80, 60)"; //  --destructive #A4503C

const cursorOf = (l: Locator) => l.evaluate((el) => getComputedStyle(el).cursor);
const colorOf = (l: Locator) => l.evaluate((el) => getComputedStyle(el).color);
const bgOf = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);

async function shot(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
}

test.describe("R19 — clickability affordances", () => {
  test("controls get pointer + color; rows get tint + default cursor; statics get nothing", async ({
    page,
  }) => {
    await login(page);
    const projectUrl = await createProject(page, `R19 Affordances ${Date.now()}`);
    // Deliverable A: has subtasks → its header status is LOCKED (the static case).
    await createDeliverable(page, projectUrl, "R19 Deliverable A");

    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await addSubtaskViaModal(page, "R19 Subtask A");
    await addSubtaskViaModal(page, "R19 Subtask B");

    // Deliverable B: NO subtasks → its header status is an EDITABLE status badge.
    await createDeliverable(page, projectUrl, "R19 Deliverable B");

    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // ─── Container row: DEFAULT cursor + hover background tint (softened ~2%) ───
    const delivHeader = page.locator('[data-testid="deliverable-header"]').first();
    await expect(delivHeader).toBeVisible();

    expect(await cursorOf(delivHeader)).not.toBe("pointer");

    const headerBgRest = await bgOf(delivHeader);
    await delivHeader.hover();
    await page.waitForTimeout(250);
    const headerBgHover = await bgOf(delivHeader);
    expect(headerBgHover).not.toBe(headerBgRest); // a tint was applied
    // R19.3: the tint was softened to ~2% — assert a low alpha (was 4%).
    const alphaMatch = headerBgHover.match(/rgba?\([^)]*?,\s*([\d.]+)\)\s*$/);
    if (alphaMatch) {
      expect(Number(alphaMatch[1])).toBeLessThanOrEqual(0.03);
    }
    await shot(page, "r19-deliverables");

    // ─── Control INSIDE the row: pointer + forest color shift ──────────────────
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

    // ─── Status pills are clickable (R19.3) — BOTH surfaces ────────────────────
    // Subtask status pill (the shared StatusPill component) → pointer.
    const subtaskPill = page.locator('[data-testid="status-pill"]').first();
    await expect(subtaskPill).toBeVisible();
    expect(await cursorOf(subtaskPill)).toBe("pointer");

    // Editable deliverable header status badge (deliverable B, no subtasks) → pointer.
    const editableStatus = page.locator('[data-testid="deliverable-status-badge"]').first();
    await expect(editableStatus).toBeVisible();
    expect(await cursorOf(editableStatus)).toBe("pointer");

    // ─── Account page control (icon button) gets a pointer ─────────────────────
    await page.goto("/account");
    await page.waitForLoadState("networkidle");
    const tokenBtn = page.getByRole("button", { name: /Generate token|Regenerate/ }).first();
    await expect(tokenBtn).toBeVisible();
    expect(await cursorOf(tokenBtn)).toBe("pointer");

    // ─── No false affordance: the LOCKED deliverable status (canonical static) ──
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    const locked = page.locator('[data-testid="deliverable-locked-badge"]').first();
    await expect(locked).toBeVisible();
    expect(await cursorOf(locked)).not.toBe("pointer");
    const lockedColorRest = await colorOf(locked);
    await locked.hover();
    await page.waitForTimeout(200);
    expect(await colorOf(locked)).toBe(lockedColorRest); // no hover color cue

    // Project status badge is display-only (no change dropdown) → also static.
    const badge = page.locator('[data-testid="project-status-badge"]').first();
    await expect(badge).toBeVisible();
    expect(await cursorOf(badge)).not.toBe("pointer");

    // ─── Action-items surface: screenshot for review ───────────────────────────
    await page.goto(`${projectUrl}/action-items`);
    await page.waitForLoadState("networkidle");
    await shot(page, "r19-action-items");
  });

  test("Users & Roles controls all carry a cue (incl. destructive → clay)", async ({ page }) => {
    await login(page);
    await page.goto("/pm/users");
    await page.waitForLoadState("networkidle");

    // Role-management buttons: open the first role disclosure and check its controls.
    const roleSummary = page.locator("details summary").first();
    await expect(roleSummary).toBeVisible();
    expect(await cursorOf(roleSummary)).toBe("pointer");
    await roleSummary.click();

    const saveRole = page.getByRole("button", { name: "Save role" }).first();
    await expect(saveRole).toBeVisible();
    expect(await cursorOf(saveRole)).toBe("pointer");

    // The role <select> on each active-user row (if any) carries a pointer.
    const selects = page.locator("select");
    if ((await selects.count()) > 0) {
      expect(await cursorOf(selects.first())).toBe("pointer");
    }

    // Destructive: a delete-role button (only on non-built-in roles) hovers to clay.
    const deleteRole = page.getByRole("button", { name: "Delete role" }).first();
    if (await deleteRole.count()) {
      expect(await cursorOf(deleteRole)).toBe("pointer");
      await deleteRole.hover();
      await page.waitForTimeout(200);
      expect(await colorOf(deleteRole)).toBe(CLAY);
    }
    await shot(page, "r19-users-roles");
  });

  test("audit sweep — every clickable in every authenticated view has a pointer cue", async ({
    page,
  }) => {
    await login(page);
    const projectUrl = await createProject(page, `R19 Sweep ${Date.now()}`);
    await createDeliverable(page, projectUrl, "R19 Sweep Deliverable");

    const routes = [
      "/dashboard",
      "/projects",
      projectUrl,
      `${projectUrl}/timeline`,
      `${projectUrl}/members`,
      `${projectUrl}/action-items`,
      `${projectUrl}/history`,
      "/my-tasks",
      "/action-items",
      "/account",
      "/calendar",
      "/pm/users",
      "/pm/review",
      "/pm/settings",
    ];

    const SELECTOR = 'button, a[href], [role="button"], summary, select';
    const failures: string[] = [];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const bad = await page.$$eval(SELECTOR, (els) => {
        const out: { tag: string; text: string; testid: string }[] = [];
        for (const el of els as HTMLElement[]) {
          // skip hidden (display/visibility/zero-box) and disabled elements
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if ((el as HTMLButtonElement).disabled) continue;
          if (el.getAttribute("aria-disabled") === "true") continue;
          // Row exception: container rows that open (deliverable/subtask) use a hover
          // TINT with default cursor by design — the pointer belongs to controls inside.
          if (el.classList.contains("clickable-row")) continue;
          if (cs.cursor !== "pointer") {
            out.push({
              tag: el.tagName.toLowerCase(),
              text: (el.textContent ?? "").trim().slice(0, 40),
              testid: el.getAttribute("data-testid") ?? "",
            });
          }
        }
        return out;
      });

      for (const b of bad) {
        failures.push(`${route} → <${b.tag}> testid="${b.testid}" "${b.text}" (cursor not pointer)`);
      }
    }

    expect(failures, `Clickables missing a pointer cue:\n${failures.join("\n")}`).toEqual([]);
  });
});
