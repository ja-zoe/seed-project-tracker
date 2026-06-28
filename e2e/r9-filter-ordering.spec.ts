import { test, expect, type Page, type Locator } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { login, createProject, createDeliverable } from "./helpers";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../changes/9-deliverable-editing/R9.6-group-filter-and-ordering/screenshots"
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function y(loc: Locator): Promise<number> {
  return (await loc.boundingBox())!.y;
}

test.describe("R9.6 — group filter + within-group ordering", () => {
  test.beforeAll(() => fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }));

  test("filter by group; default order by priority; reorder within a priority tier", async ({ page }) => {
    await login(page);
    const projectUrl = await createProject(page, `R9.6 ${Date.now()}`);
    for (const t of ["P-High", "P-Med-A", "P-Med-B", "P-Backend"]) {
      await createDeliverable(page, projectUrl, t);
    }
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    const card = (t: string) => page.locator("[data-deliverable-id]", { hasText: t });

    async function setGroup(t: string, g: string) {
      await card(t).locator('[data-testid="deliverable-group"]').click();
      const combo = page.locator('[data-testid="group-combobox"]');
      await expect(combo).toBeVisible();
      await combo.locator("input").fill(g);
      await combo.locator("input").press("Enter");
      await expect(card(t).locator('[data-testid="deliverable-group"]')).toHaveText(g, { timeout: 8_000 });
    }
    async function setPriority(t: string, label: "High" | "Med" | "Low") {
      await card(t).locator('[data-testid="deliverable-priority"]').click();
      await page.locator('[data-testid="priority-menu"]').getByRole("button", { name: label }).click();
      await expect(card(t).locator('[data-testid="deliverable-priority"]')).toHaveText(label, { timeout: 8_000 });
    }

    await setGroup("P-High", "Frontend");
    await setGroup("P-Med-A", "Frontend");
    await setGroup("P-Med-B", "Frontend");
    await setGroup("P-Backend", "Backend");
    await setPriority("P-High", "High"); // others stay Med (default)

    // ── Default order within Frontend: HIGH above the MEDs ────────────────────
    await shot(page, "r9-order-default");
    expect(await y(card("P-High"))).toBeLessThan(await y(card("P-Med-A")));
    expect(await y(card("P-High"))).toBeLessThan(await y(card("P-Med-B")));
    // P-Med-A created before P-Med-B → A above B (orderIndex tiebreak)
    expect(await y(card("P-Med-A"))).toBeLessThan(await y(card("P-Med-B")));
    console.log("  default priority order verified.");

    // ── Reorder within the MED tier: move P-Med-B up → B above A ──────────────
    await card("P-Med-B").locator('[data-testid="deliverable-move-up"]').click();
    await expect(async () => {
      expect(await y(card("P-Med-B"))).toBeLessThan(await y(card("P-Med-A")));
    }).toPass({ timeout: 8_000 });
    await shot(page, "r9-order-reordered");
    // P-High still on top (different tier — unaffected)
    expect(await y(card("P-High"))).toBeLessThan(await y(card("P-Med-B")));
    console.log("  within-tier reorder verified.");

    // ── Group filter ──────────────────────────────────────────────────────────
    const filter = page.locator('[data-testid="group-filter"]');
    await filter.selectOption("Backend");
    await expect(card("P-Backend")).toBeVisible();
    await expect(card("P-High")).toHaveCount(0);
    await expect(card("P-Med-A")).toHaveCount(0);
    await shot(page, "r9-filter-backend");

    await filter.selectOption("ALL");
    await expect(card("P-High")).toBeVisible();
    await expect(card("P-Backend")).toBeVisible();
    console.log("  group filter verified.");
  });
});
