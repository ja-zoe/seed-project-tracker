import { test, expect, request as pwRequest } from "@playwright/test";
import "dotenv/config";
import pg from "pg";
import { login } from "./helpers";

/**
 * R20.1 — clear notifications.
 *
 * The dev/test user is jav273 (see helpers.login). We seed Notification rows directly
 * via pg (mirroring global-teardown's approach), exercise the bell's Clear all / per-item
 * dismiss, and assert the rows are actually deleted and scoped to the session user.
 */

const DEV_EMAIL = `jav273@${process.env.CAS_EMAIL_DOMAIN ?? "scarletmail.rutgers.edu"}`;

function db() {
  return new pg.Client({ connectionString: process.env.DATABASE_URL });
}

async function userId(client: pg.Client, email: string): Promise<string> {
  const r = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
  if (!r.rows[0]) throw new Error(`user ${email} not found`);
  return r.rows[0].id as string;
}

let nseq = 0;
async function seedNotif(client: pg.Client, uid: string, read: boolean) {
  const id = `e2e-notif-${Date.now()}-${nseq++}`;
  await client.query(
    `INSERT INTO "Notification" (id, "userId", type, title, body, link, read, "createdAt")
     VALUES ($1, $2, 'GENERAL', $3, 'e2e body', NULL, $4, NOW())`,
    [id, uid, `[e2e] notif ${id}`, read]
  );
  return id;
}

async function notifCount(client: pg.Client, uid: string): Promise<number> {
  const r = await client.query('SELECT COUNT(*)::int AS c FROM "Notification" WHERE "userId" = $1', [uid]);
  return r.rows[0].c as number;
}

test.describe("R20.1 — clear notifications", () => {
  test("Clear all deletes every notification (and they stay gone)", async ({ page }) => {
    const client = db();
    await client.connect();
    try {
      const uid = await userId(client, DEV_EMAIL);
      // Clean slate, then seed exactly two (one unread, one read).
      await client.query('DELETE FROM "Notification" WHERE "userId" = $1', [uid]);
      await seedNotif(client, uid, false);
      await seedNotif(client, uid, true);

      await login(page);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      await page.getByRole("button", { name: "Notifications" }).click();
      const rows = page.locator('[data-testid="notif-dismiss"]');
      await expect(rows).toHaveCount(2);

      await page.locator('[data-testid="notif-clear-all"]').click();
      await expect(rows).toHaveCount(0);
      await expect(page.getByText("No notifications yet.")).toBeVisible();

      // Actually deleted in the DB.
      expect(await notifCount(client, uid)).toBe(0);

      // A refetch still shows empty.
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Notifications" }).click();
      await expect(page.locator('[data-testid="notif-dismiss"]')).toHaveCount(0);
    } finally {
      await client.end().catch(() => {});
    }
  });

  test("Per-item dismiss removes only that notification and adjusts the unread badge", async ({ page }) => {
    const client = db();
    await client.connect();
    try {
      const uid = await userId(client, DEV_EMAIL);
      await client.query('DELETE FROM "Notification" WHERE "userId" = $1', [uid]);
      await seedNotif(client, uid, false);
      await seedNotif(client, uid, false);

      await login(page);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Badge shows 2 unread.
      await expect(page.getByRole("button", { name: "Notifications" })).toContainText("2");

      await page.getByRole("button", { name: "Notifications" }).click();
      const dismissers = page.locator('[data-testid="notif-dismiss"]');
      await expect(dismissers).toHaveCount(2);

      // Click the bottom row's × (fully in view; avoids auto-scroll under the sticky top bar).
      await dismissers.last().click();
      await expect(dismissers).toHaveCount(1);
      expect(await notifCount(client, uid)).toBe(1);
      // Badge now shows 1.
      await expect(page.getByRole("button", { name: "Notifications" })).toContainText("1");
    } finally {
      await client.end().catch(() => {});
    }
  });

  test("clear endpoint is auth-scoped (401 without session; can't clear another user's)", async ({ page }) => {
    const client = db();
    await client.connect();
    try {
      const uid = await userId(client, DEV_EMAIL);

      // 401 with no session (fresh request context, no cookies).
      const anon = await pwRequest.newContext();
      const res = await anon.post("http://localhost:3000/api/notifications/clear", { data: {} });
      expect(res.status()).toBe(401);
      await anon.dispose();

      // Cross-user: another user's notification survives jav273's "Clear all".
      const other = await client.query('SELECT id FROM "User" WHERE email <> $1 LIMIT 1', [DEV_EMAIL]);
      const otherId: string | undefined = other.rows[0]?.id;
      let otherNotifId: string | null = null;
      if (otherId) otherNotifId = await seedNotif(client, otherId, false);

      await login(page);
      // Clear all as jav273 via the real endpoint (cookies attached by the page context).
      const ok = await page.request.post("http://localhost:3000/api/notifications/clear", { data: {} });
      expect(ok.ok()).toBeTruthy();
      expect(await notifCount(client, uid)).toBe(0);

      if (otherId && otherNotifId) {
        const survived = await client.query('SELECT COUNT(*)::int AS c FROM "Notification" WHERE id = $1', [otherNotifId]);
        expect(survived.rows[0].c).toBe(1);
        await client.query('DELETE FROM "Notification" WHERE id = $1', [otherNotifId]);
      }
    } finally {
      await client.end().catch(() => {});
    }
  });
});
