# R10.2 — Status-update lifecycle (link to lead meeting, edit/delete, late marking)

**Status:** tests passing
**Files:**
- `prisma/schema.prisma` + DDL (**DB change**: `StatusUpdate.calendarEventId`)
- `src/lib/actions/status-updates.ts` (submit/edit/delete + window/late logic + permission gating)
- `src/app/(app)/projects/[id]/status/new/page.tsx` (link to the lead meeting; window gating)
- the project page (`canSubmitStatus` window) + the status history/timeline views (inline edit/delete)

**Depends on:** R10.1 (LEAD_MEETING type + `statusSubmitWindowDays`).

## Spec

**Problem:** Status updates today use a free `meetingDate` field and a fixed `submissionDeadlineHours`.
The user wants each status update to **correspond to a project's lead meeting** (on the calendar), with
this lifecycle:
1. "Submit Update" only appears within the configurable window (R10.1) **before** the lead meeting.
2. A **lead** can **edit/delete their own** status update **before** the meeting/due time.
3. A submission **after** due is **allowed but marked late**.
4. After due, a lead can **no longer edit** their update.
5. Users with the right permission (**PM + Eboard**) can **edit/delete any** status update **at any
   time** — done **inline**, with the deliverable/subtask **✓/✗ confirm microinteractions**.

**Approach:**

*DB:* `StatusUpdate.calendarEventId String?` → FK to the lead-meeting `CalendarEvent` (per-project).
`ALTER TABLE "StatusUpdate" ADD COLUMN "calendarEventId" TEXT REFERENCES "CalendarEvent"(id) ON DELETE SET NULL;`
The "due time" is the linked lead meeting's `startsAt`. Keep `isLate` (computed: submitted after
`startsAt`, or after `startsAt − statusSubmitWindowDays`? → **due = `startsAt`; late = submitted after
`startsAt`**; the window only governs when the button appears). Reconcile/retire the free `meetingDate`
+ `submissionDeadlineHours` (migrate `meetingDate` semantics to the linked meeting).

*Submit gating:* the project's "Submit Update" shows only when the project has an upcoming
LEAD_MEETING within `statusSubmitWindowDays`, and the user is a lead/sublead. The submit form links to
that meeting (sets `calendarEventId`); `isLate = now > meeting.startsAt`.

*Lead edit/delete (own, pre-due):* on the status-update record (history/timeline view), a lead who
owns it sees inline **Edit** + **Delete** **only while `now <= meeting.startsAt`**. Inline edit reuses
the Markdown/InlineConfirm patterns; delete uses the armed ✓/✗ confirm (like R9.2).

*Privileged edit/delete (PM + Eboard, any time):* users with the gating permission (recommend a new
`MANAGE_STATUS_UPDATES`, or reuse `MANAGE_PROJECTS` + Eboard) get inline Edit/Delete on **any** status
update regardless of due time.

*Server actions:* add `updateStatusUpdate(id, formData)` and `deleteStatusUpdate(id)` with the gating:
owner-lead-before-due **OR** privileged. `submitStatusUpdate` sets `calendarEventId` + `isLate`.

## Tests
- [x] DDL applied (`calendarEventId` FK, `MANAGE_STATUS_UPDATES` — see fix.sql); seed grants it to
      PM + Eboard; `prisma generate` + dev restart; `pnpm build` passes
- [x] Playwright: "Submit Update" is hidden until the project has a lead meeting open for submission,
      then appears and links to that meeting
- [x] Playwright: an upcoming (in-window) meeting → on-time submission (no Late badge); a past meeting
      → submission **marked Late**
- [x] Playwright: a privileged user (PM, MANAGE_STATUS_UPDATES) edits (modal) + deletes (inline ✓/✗
      confirm) a status update from the project page
- [~] Lead-only-before-due edit/delete: enforced server-side (`assertCanModifyStatusUpdate`) +
      gated in UI (`canModifyStatusUpdate` checks own + lead + now<=meeting). Not separately UI-tested
      (dev-login can't easily make a non-privileged ACTIVE lead distinct from the PM)
- [x] Deleting the lead meeting nulls the link (FK ON DELETE SET NULL; due then falls back to meetingDate)

## Notes / log
- 2026-06-28 — Specced (Set 10, phase 2). No code written. Open: keep vs retire `meetingDate` /
  `submissionDeadlineHours`; exact privileged permission (new `MANAGE_STATUS_UPDATES` vs `MANAGE_PROJECTS`).

- 2026-06-28 — Implemented & Playwright-verified. `getActiveLeadMeeting` (lib); submit links the meeting + derives meetingDate + isLate(now>startsAt); button gated on an active meeting; status/new shows the meeting (no free date field). `updateStatusUpdate`/`deleteStatusUpdate` gated by `assertCanModifyStatusUpdate` (privileged anytime, owner-lead before due). Inline `StatusUpdateControls` (edit modal + ✓/✗ delete). Branch: `feat/set10/R10.2-status-lifecycle`.

## Review feedback — round 2 (2026-06-28)

**Problems found in validation:**
1. The **dashboard** still showed "No update submitted yet · Submit update →" for every assigned
   project regardless of the lead meeting — its widget was never gated on the lead meeting / window
   (only the project page was). It should appear on the dashboard only when the project has an active
   lead meeting in the window **and** nothing has been submitted for it yet.
2. The submit-window setting was hard to find — it sat next to the now-**obsolete** "Submission
   deadline (hours before meeting)" field (R10.2 retired `submissionDeadlineHours` as the status
   late-marking source), which was confusing.

**Fixes:**
- New `getStatusSubmissionState(projectId)` (lib): active lead meeting + whether an update already
  exists for it → `canSubmit = active && !submitted`.
- **Project page:** `canSubmitStatus = isLead && submissionState.canSubmit` (adds the "not yet
  submitted" condition). "Submission history →" stays unconditionally at the bottom.
- **Dashboard:** the per-project Submit CTA is gated on `canSubmit` (active meeting + not submitted +
  the user is LEAD/SUBLEAD of that project) and is **hidden** otherwise. CTA text is now "Status update
  due".
- **Settings:** removed the obsolete "Submission deadline (hours)" field (and its handling in
  `updateSettings`); the single, clear **"Status submit window (days before a lead meeting)"** remains.

**Round-2 tests:**
- [x] Playwright: no lead meeting → Submit hidden on dashboard AND project page; the "Submission
      history" link is still present
- [x] Playwright: a lead meeting in window → Submit shows on both; after submitting → hidden on both
- [x] Playwright: the submit window is configurable in PM settings and persists
