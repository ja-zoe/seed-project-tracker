import { test, expect } from "@playwright/test";
import { login, createProject } from "./helpers";

/**
 * R13.4 — inline per-field edits on action items with the InlineConfirm ✓/✗
 * microinteraction (same as deliverables/subtasks).
 */
test.describe("R13.4 — action-item inline edits", () => {
  test("inline-edit description (confirm + escape) and add a deadline", async ({ page }) => {
    await login(page);
    const ts = Date.now();
    const projectUrl = await createProject(page, `R13.4 ${ts}`);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");

    // Seed one item via the modal.
    await page.locator('[data-testid="action-item-new"]').click();
    await page.locator('[data-testid="action-item-modal-description"]').fill("Original text");
    await page.locator('[data-testid="action-item-modal-submit"]').click();
    await expect(page.getByText("Original text")).toBeVisible({ timeout: 10_000 });

    const row = page.locator('[data-testid="action-item-row"]').first();

    // ── Inline edit description → confirm ─────────────────────────────────────
    await row.locator('[data-testid="action-item-desc"]').click();
    const input = row.locator('[data-testid="action-item-desc-input"]');
    await expect(input).toBeVisible();
    await input.fill("Edited inline");
    await row.locator('[title="Confirm"]').click();
    await expect(page.getByText("Edited inline")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Original text")).toHaveCount(0);

    // ── Inline edit description → Escape cancels (no write) ────────────────────
    await row.locator('[data-testid="action-item-desc"]').click();
    await row.locator('[data-testid="action-item-desc-input"]').fill("Should not stick");
    await row.locator('[data-testid="action-item-desc-input"]').press("Escape");
    await expect(page.getByText("Edited inline")).toBeVisible();
    await expect(page.getByText("Should not stick")).toHaveCount(0);

    // ── Inline add a deadline → confirm ───────────────────────────────────────
    await row.locator('[data-testid="action-item-deadline"]').click();
    await row.locator('[data-testid="action-item-deadline-input"]').fill("2026-12-15");
    await row.locator('[title="Confirm"]').click();
    await expect(row.locator('[data-testid="action-item-deadline"]')).toContainText("due Dec 15", { timeout: 10_000 });
  });
});
