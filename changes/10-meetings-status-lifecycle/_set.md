# Revision Set 10 — Meetings & status-update lifecycle

Bootstrap: read `changes/CONTEXT.md` first for project invariants.
This file is the index and roll-up log for set 10.

> **Specs written 2026-06-28** (phase 2, after the user confirmed the Set 9 updates + split). The
> per-feature `R10.1`–`R10.3` specs are in the sibling directories, using the user's confirmed defaults
> (Eboard = new role + permission; status update links to a per-project lead meeting). Remaining
> design choices are listed as Open questions below and inside each spec — **no code written yet;
> awaiting the user's review before implementation.**

This set ties **status updates** to **lead meetings** on the calendar, adds **lead** and **eboard**
meeting types with role-based visibility, makes the status-submit window configurable, governs the
**edit/delete lifecycle** of a status update around its meeting's due time, and adds **calendar export**.

## Status
<!-- markers: [ ] not started · [~] in progress · [t] tests passing, awaiting merge · [x] merged -->
- [t] R10.1 — Calendar meeting types & visibility — add **LEAD_MEETING** + **EBOARD_MEETING** calendar
      event types; only leads + eboard can see lead/eboard meetings; make the status-submit window
      (default 3 days before a lead meeting) **configurable** in Settings (**DB change**)
- [t] R10.2 — Status-update lifecycle — each status update links to a **lead meeting**; the "Submit
      Update" button only appears within the configurable window before that meeting; leads can
      **edit/delete** their own update **before** the meeting/due time; late submissions are allowed but
      **marked late**; after due, leads can't edit; users with the right permission can **edit/delete**
      any status update at any time — inline, with the deliverable/subtask **confirm microinteractions**
- [ ] R10.3 — Calendar export — export a user's calendar to **Google Calendar** and as an **ICS** file;
      a general member's export **excludes** lead/eboard meetings

## Sequencing & file overlap
- **R10.1 lands first** — R10.2 (status↔meeting linkage, submit window) and R10.3 (export visibility)
  both depend on the new meeting types + the Settings window.
- R10.2 and R10.3 are largely independent once R10.1 exists.

## Open questions / design decisions (resolve when writing the R10.* specs)
1. **What is "Eboard"?** There's no eboard concept today. RBAC has **global roles** (Project Manager,
   Project Lead, Viewer) via `Role.permissions[]`, and **project roles** (LEAD/SUBLEAD/MEMBER). Options:
   a new **global role** "Eboard", or a new **Permission** (e.g. `VIEW_LEAD_MEETINGS` / `MANAGE_MEETINGS`)
   granted to PM/Eboard roles. Recommendation: add permission(s) and seed them onto a new "Eboard" role.
   **Needs the user's call.**
2. **Status update ↔ lead meeting linkage.** Add `StatusUpdate.calendarEventId` (FK to the lead
   meeting `CalendarEvent`)? And does "due time" = the lead meeting's start time (replacing today's
   `meetingDate` free field + `submissionDeadlineHours`)? Recommendation: link to the lead meeting and
   derive the due time from it; keep `isLate` but compute it from the meeting + window. **DB change.**
3. **"Edit/delete after due" permission.** Which permission gates post-due edit/delete — PM only
   (`MANAGE_PROJECTS`), or PM + Eboard? Ties to Q1.
4. **Lead-meeting scope.** Is a lead meeting **per-project** (each project's leads) or a **shared**
   eboard-wide meeting that many projects' status updates link to? The user says "each status update
   will correspond to a lead's meeting" — likely a meeting that leads attend; clarify per-project vs
   global. **Needs the user's call.**
5. **Submit window unit.** Default "3 days"; store as `statusSubmitWindowDays` (Int, default 3) or
   hours? Recommendation: days. Reconcile with the existing `submissionDeadlineHours` (used for late
   marking) — they may merge.
6. **Visibility enforcement.** Lead/eboard meetings hidden from members in the calendar view **and** in
   export. Enforce server-side (filter the query by permission), not just client-side.

## DB changes anticipated (finalize in the specs)
- `CalendarEventType` enum: add `LEAD_MEETING`, `EBOARD_MEETING` (currently `PROJECT_MEETING`,
  `NON_PROJECT_EVENT`).
- `Settings`: add a configurable status-submit window (e.g. `statusSubmitWindowDays Int @default(3)`).
- `StatusUpdate`: add `calendarEventId` (FK to the lead meeting) — pending Q2/Q4.
- Possibly a new `Permission` value(s) + an "Eboard" role (Q1). Apply all via `scripts/apply-schema.ts`.

## Log
- 2026-06-28 — Set 10 outlined (theme + features + open questions).
- 2026-06-28 — R10.1–R10.3 specs written with the user's confirmed defaults. No code yet; gated on the
  user's review (esp. the DB changes: `CalendarEventType` values, `Settings.statusSubmitWindowDays`,
  `Permission.VIEW_LEAD_MEETINGS`, an Eboard role, and `StatusUpdate.calendarEventId`).
