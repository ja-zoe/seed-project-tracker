# R10.2 — Status-update lifecycle (link to lead meeting, edit/delete, late marking)

**Status:** planned
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
- [ ] DDL applied (`calendarEventId`); `prisma generate` + dev restart; `pnpm build` passes
- [ ] App: "Submit Update" appears only within the window before a project's lead meeting
- [ ] App: a lead submits before the meeting → editable/deletable; submits after → saved + flagged
      **late** and not lead-editable
- [ ] App: after due, the lead can't edit/delete; a PM/Eboard can edit/delete inline (✓/✗ confirm)
- [ ] App: deleting the lead meeting nulls the link (no orphan crash)

## Notes / log
- 2026-06-28 — Specced (Set 10, phase 2). No code written. Open: keep vs retire `meetingDate` /
  `submissionDeadlineHours`; exact privileged permission (new `MANAGE_STATUS_UPDATES` vs `MANAGE_PROJECTS`).
