# R10.3 — Calendar export (Google Calendar + ICS)

**Status:** planned
**Files:**
- `src/app/(app)/calendar/...` (export controls)
- `src/app/api/calendar/ics/route.ts` (new — ICS feed/download)
- `src/lib/calendar-export.ts` (new — build ICS + Google links)
- reuses the R10.1 visibility filter

**Depends on:** R10.1 (meeting types + `VIEW_LEAD_MEETINGS` visibility filter).

## Spec

**Problem:** Users can't get the semester calendar into their own calendar app. The user wants to
**export to Google Calendar** and as an **ICS file** — and a **general member's export must exclude
lead/eboard meetings** (same visibility rule as the in-app calendar).

**Approach:**

*Visibility-scoped event set:* reuse the R10.1 server filter — the export builds from exactly the
events the requesting user is allowed to see (members get no LEAD_MEETING/EBOARD_MEETING). Enforce in
the route handler (auth the user, apply `canSeeRestrictedMeetings`).

*ICS download:* a route `GET /api/calendar/ics` (auth required) returns `text/calendar` with the
user's visible events as `VEVENT`s (`UID`, `SUMMARY`=title, `DTSTART`/`DTEND` from `startsAt`/`endsAt`
or all-day, `LOCATION`, `DESCRIPTION`). A `src/lib/calendar-export.ts` builds the ICS string (escape
text, CRLF line endings, fold long lines). The `/calendar` page gets a **"Download .ics"** button
(`<a href="/api/calendar/ics" download>`).

*Google Calendar:* two options — (a) a per-event "Add to Google Calendar" link
(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=…&details=…&location=…`),
and/or (b) subscribe to the ICS feed URL. Recommendation: ship the **template link per event** (simple,
no auth) plus the **.ics download** for the whole calendar; note that a *subscribable* Google feed
needs a public/tokenized URL (out of scope unless requested).

*Scope:* default export = the current semester's visible events; optionally a project-scoped export.

## Tests
- [ ] `pnpm build` / typecheck passes
- [ ] App: "Download .ics" returns a valid `text/calendar` file whose VEVENTs match the in-app calendar
- [ ] App: a **member's** .ics (and Google links) **exclude** LEAD_MEETING/EBOARD_MEETING; a lead/eboard
      export includes them
- [ ] App: an "Add to Google Calendar" link opens a prefilled event with the correct title/time
- [ ] App: ICS validates (DTSTART/DTEND well-formed; all-day events use DATE values)

## Notes / log
- 2026-06-28 — Specced (Set 10, phase 2). No code written. Open: ship a subscribable (tokenized) ICS
  feed for live Google sync, or just one-shot download + per-event template links (recommended).
