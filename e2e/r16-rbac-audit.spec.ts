import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { login } from "./helpers";

const SHOTS = process.env.AUDIT_SHOTS || "/tmp/audit-shots";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function loginAs(page: Page, netId: string) {
  await page.goto("/dev-login");
  await page.fill("#netId", netId);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
}

/**
 * Cycle-2 RBAC audit: the PENDING gate and global-role URL-gating. A fresh user must land
 * on /pending; once activated as a Viewer they must be redirected away from PM-only pages.
 * Role activation + teardown go through the DB (deterministic); the assertions drive the UI.
 */
test.describe("RBAC audit — PENDING gate + Viewer URL-gating", () => {
  test("fresh user pends; Viewer is blocked from PM pages", async ({ browser }) => {
    const netId = `auditv${Date.now()}`;
    const email = `${netId}@scarletmail.rutgers.edu`;
    try {
      // ── 1) Fresh sign-in → PENDING → /pending ───────────────────────────────
      const ctxV = await browser.newContext();
      const v = await ctxV.newPage();
      await loginAs(v, netId);
      await expect(v).toHaveURL(/\/pending/);
      await expect(v.getByRole("heading", { name: "Awaiting approval" })).toBeVisible();
      await v.screenshot({ path: path.join(SHOTS, "pending.png") });

      // ── 2) Activate the user as a Viewer (deterministic, via DB) ────────────
      // firstName must be set, else the app layout sends them to /profile/setup.
      const viewer = await prisma.role.findUniqueOrThrow({ where: { name: "Viewer" } });
      await prisma.user.update({ where: { email }, data: { status: "ACTIVE", roleId: viewer.id, firstName: "Audit" } });

      // ── 3) Re-login → now lands on /dashboard, not /pending ─────────────────
      await loginAs(v, netId);
      await expect(v).toHaveURL(/\/dashboard/);

      // ── 4) Viewer hits PM-only URLs directly → redirected to /dashboard ─────
      for (const pmPath of ["/pm/users", "/pm/settings", "/pm/review"]) {
        await v.goto(pmPath);
        await v.waitForLoadState("networkidle");
        await expect(v, `Viewer should be redirected away from ${pmPath}`).toHaveURL(/\/dashboard/);
      }
      await ctxV.close();
    } finally {
      await prisma.user.deleteMany({ where: { email } });
      await prisma.$disconnect();
    }
  });
});
