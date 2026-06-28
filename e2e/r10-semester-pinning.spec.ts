import { test, expect } from "@playwright/test";
import { login, createProject, addSelfAsLead, createLeadMeeting, dtLocal, E2E_MARKER } from "./helpers";

/**
 * R10.2 round-4: the Submit Project Standing button is gated on a LEAD_MEETING that is
 * **pinned to the project's semester**. This is the real-world bug the earlier rounds
 * missed — the gating matched a free-text semester string, so a leads meeting placed
 * under any other semester silently governed no projects and the button never appeared.
 */
test.describe("R10.2 — lead-meeting semester pinning gates the Submit button", () => {
  test("a meeting pinned to ANOTHER semester does not open the button; pinning to this one does", async ({ page }) => {
    await login(page);
    const semA = `PinA ${Date.now()}`;
    const semB = `PinB ${Date.now()}`;
    // A project in semB so that semester is a real, pinnable option on the calendar.
    await createProject(page, `pin-other ${Date.now()}`, semB);
    const projectUrl = await createProject(page, `pin-target ${Date.now()}`, semA);
    await addSelfAsLead(page, projectUrl);

    const dashSubmit = () => page.locator(`a[href="${projectUrl}/status/new"]`);
    const pageSubmit = () => page.getByRole("link", { name: "Submit Project Standing" });

    // A lead meeting in-window but pinned to a DIFFERENT semester → button stays hidden.
    await createLeadMeeting(page, E2E_MARKER + "wrong-sem mtg", dtLocal(86_400_000), semA, [semB]);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await expect(pageSubmit()).toHaveCount(0);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(dashSubmit()).toHaveCount(0);

    // A lead meeting pinned to the project's own semester → button appears on both.
    await createLeadMeeting(page, E2E_MARKER + "right-sem mtg", dtLocal(86_400_000), semA, [semA]);
    await page.goto(projectUrl);
    await page.waitForLoadState("networkidle");
    await expect(pageSubmit()).toBeVisible();
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(dashSubmit()).toHaveCount(1);
    console.log("  pinning gates correctly: wrong semester hidden, right semester shown.");
  });

  test("a meeting pinned to MULTIPLE semesters opens the button for projects in each", async ({ page }) => {
    await login(page);
    const semX = `MultiX ${Date.now()}`;
    const semY = `MultiY ${Date.now()}`;
    const projX = await createProject(page, `multi-x ${Date.now()}`, semX);
    await addSelfAsLead(page, projX);
    const projY = await createProject(page, `multi-y ${Date.now()}`, semY);
    await addSelfAsLead(page, projY);

    // One meeting, pinned to BOTH semesters.
    await createLeadMeeting(page, E2E_MARKER + "multi mtg", dtLocal(86_400_000), semX, [semX, semY]);

    await page.goto(projX);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "Submit Project Standing" })).toBeVisible();

    await page.goto(projY);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "Submit Project Standing" })).toBeVisible();
    console.log("  one meeting pinned to two semesters opens both projects.");
  });
});
