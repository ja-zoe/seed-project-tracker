import { test, expect, type Page } from "@playwright/test";
import { login, createProject, E2E_MARKER } from "./helpers";

/**
 * R18.1 — MCP connection status on the account page (personal access token).
 * R18.4 — Full action-item CRUD over MCP (delete_action_item).
 */

async function mcpCall(
  page: Page,
  token: string,
  method: string,
  params?: Record<string, unknown>
) {
  const res = await page.request.post("/api/mcp", {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    data: { jsonrpc: "2.0", id: Date.now(), method, params },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

/** Unwrap a tools/call result envelope into the parsed JSON the tool returned. */
function toolResult(body: { result: { content: { text: string }[] } }) {
  return JSON.parse(body.result.content[0].text);
}

test.describe("R18.1 / R18.4 — MCP connection status + action-item CRUD", () => {
  test("generate token → connection row appears, used, then revoked", async ({ page }) => {
    await login(page);
    await page.goto("/account");
    await page.waitForLoadState("networkidle");

    // Generate (or regenerate) a personal access token.
    await page.getByRole("button", { name: /Generate token|Regenerate/ }).click();
    const tokenCode = page.getByTestId("mcp-new-token");
    await expect(tokenCode).toBeVisible({ timeout: 10_000 });
    const token = (await tokenCode.innerText()).trim();
    expect(token.length).toBeGreaterThan(20);

    // Generating upserts the ACCESS_TOKEN connection → a connection row shows immediately.
    const personal = page
      .getByTestId("mcp-connection")
      .filter({ hasText: "Personal access token" });
    await expect(personal).toBeVisible({ timeout: 10_000 });
    await expect(personal).toContainText("last used");

    // A real MCP call with the token works (and refreshes lastSeenAt).
    const list = await mcpCall(page, token, "tools/list");
    const names: string[] = list.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("delete_action_item");
    expect(names).toContain("create_action_item");
    expect(names).toContain("update_action_item");
    // 24 tools before this set + delete_action_item = 25.
    expect(names.length).toBe(25);

    // Revoke clears the connection immediately (row deleted, not just on next use).
    await page.getByRole("button", { name: "Revoke" }).click();
    await expect(
      page.getByTestId("mcp-connection").filter({ hasText: "Personal access token" })
    ).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByTestId("mcp-no-connections")).toBeVisible();
  });

  test("delete_action_item removes an item; unknown id → clean not-found", async ({ page }) => {
    await login(page);

    // Fresh token for the API calls.
    await page.goto("/account");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Generate token|Regenerate/ }).click();
    const token = (await page.getByTestId("mcp-new-token").innerText()).trim();

    const projectUrl = await createProject(page, `R18.4 mcp ${Date.now()}`);
    const projectId = projectUrl.split("/").pop()!;

    // Create via MCP, then delete via MCP, then confirm it's gone.
    const created = toolResult(
      await mcpCall(page, token, "tools/call", {
        name: "create_action_item",
        arguments: { projectId, description: `${E2E_MARKER}mcp delete me` },
      })
    );
    const aid = created.created.id as string;
    expect(aid).toBeTruthy();

    const del = toolResult(
      await mcpCall(page, token, "tools/call", {
        name: "delete_action_item",
        arguments: { action_item_id: aid },
      })
    );
    expect(del.deleted).toBe(true);
    expect(del.id).toBe(aid);

    const listed = toolResult(
      await mcpCall(page, token, "tools/call", {
        name: "list_action_items",
        arguments: { projectId },
      })
    );
    const ids: string[] = listed.actionItems.map((i: { id: string }) => i.id);
    expect(ids).not.toContain(aid);

    // Unknown id → standard not-found error result (not a crash).
    const missing = toolResult(
      await mcpCall(page, token, "tools/call", {
        name: "delete_action_item",
        arguments: { action_item_id: "does-not-exist" },
      })
    );
    expect(String(missing.error)).toMatch(/not found/i);
  });
});
