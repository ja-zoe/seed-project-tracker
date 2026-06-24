# 🌱 SEED Project Tracker

A web app for the **Students for Environmental and Energy Development (SEED)** club at Rutgers University–New Brunswick. It turns the club's weekly project communication plan into a tool that **enforces accountability, surfaces blockers early, and visualizes project health** across the semester.

Built with Next.js, Supabase (Postgres), Auth.js with **Rutgers CAS** single sign-on, Recharts, and Resend, in an editorial **Eco-Tech** dashboard theme.

---

## What it does

The weekly loop the club already runs, operationalized:

- **Project leads** submit a structured status update **before** each weekly meeting. Late submissions are always accepted but **visibly flagged late**.
- **The Project Manager (PM)** records **post-meeting tracking** (status, whether the weekly goal was met, blockers, notes).
- Projects are automatically flagged **Behind** when they slip — and a corrective action plan is then required.
- Everyone sees project health, accountability, and progress trends.

### Feature map (to the planning outline)

| Outline § | Feature | Where |
|---|---|---|
| §2 | Data-driven roles & granular permissions; custom-role builder | `/admin/roles` |
| §3 | Rutgers CAS SSO restricted to the Rutgers domain; pending-user approval | `/login`, `/pending`, `/admin/users` |
| §5.1 | Pre-meeting status updates (5 required fields + "need help"), late-marking | `/status/new`, project detail |
| §5.2 | Post-meeting tracking | project detail |
| §5.3 | Red-flag auto-detection with **PM-configurable thresholds** + manual override | `/admin/notifications`, project detail |
| §5.4 | Semester milestones; on-track-vs-behind computed against them | project detail |
| §5.5 | Email + in-app notifications, configurable trigger rules | `/admin/notifications`, `/notifications` |
| §5.6 | Action items with carry-over | project detail, `/action-items` |
| §5.7 | Monthly review dashboard (auto-answers the 4 questions) | `/review` |
| §5.8 | Submission history / audit trail | project detail |
| §5.9 | Charts (goal completion, blockers, health distribution) | dashboard, `/review` |
| §10 | Eco-Tech dashboard theme (sage + dark bento panels, Gloock/JetBrains Mono) | `src/app/globals.css` |

---

## Tech stack

- **Framework:** Next.js 15 (App Router, React 19, server actions) — deploys free on Vercel.
- **Auth:** Auth.js (NextAuth v5) wrapping **Rutgers CAS** SSO (ticket-based), domain-restricted. JWT sessions so middleware can authorize without a DB round-trip. Ships with a **mock-CAS mode** so it runs before CAS registration is approved.
- **Database:** Supabase (Postgres) via Prisma ORM.
- **Charts:** Recharts.
- **Email:** Resend (free tier) — optional; the app is fully usable without it (in-app notifications still work).
- **Styling:** Custom CSS design system (Eco-Tech: sage + dark bento panels, Gloock display serif, JetBrains Mono labels) with Tailwind for layout utilities; lucide-react icons.

---

## Getting started

### 0. Prerequisites
- Node.js 20+ and **pnpm** (`npm i -g pnpm`).
- A Supabase project and (optionally) a Resend account. **No CAS setup is needed to start** — the app runs in mock-CAS mode out of the box (see [Authentication via Rutgers CAS](#authentication-via-rutgers-cas)).

### 1. Install
```bash
pnpm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Then fill in `.env`. See **[Environment variables](#environment-variables)** below for where each value comes from.

### 3. Set up the database
Push the Prisma schema to Supabase and seed the built-in roles, settings, default notification rules, and your PM admin account:
```bash
pnpm db:push     # create tables in Supabase
pnpm db:seed     # seed roles, settings, rules, and the PM admin (from PM_ADMIN_EMAIL)
```
> Want sample data to click around? Run the seed with `SEED_DEMO=true pnpm db:seed`.

### 4. Run
```bash
pnpm dev
```
Open <http://localhost:3000>, click **Sign in with NetID**, and (in mock mode) enter the NetID portion of `PM_ADMIN_EMAIL`. That account is pre-activated as the Project Manager; everyone else lands in a **pending** state until you approve them in `/admin/users`.

---

## Environment variables

All variables are documented inline in [`.env.example`](./.env.example). Summary:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Supabase **pooled** connection string (port 6543, `?pgbouncer=true`) — used by the app. |
| `DIRECT_URL` | Supabase **direct** connection string (port 5432) — used for migrations. |
| `AUTH_SECRET` | Random secret for Auth.js (also signs CAS handoff tickets). Generate: `openssl rand -base64 32`. |
| `CAS_MODE` | `mock` (default, local stand-in) or `real` (actual Rutgers CAS — requires registration). |
| `CAS_BASE_URL` | Rutgers CAS server base URL (used when `CAS_MODE=real`). |
| `CAS_EMAIL_DOMAIN` | Domain a NetID maps to (`<netid>@<CAS_EMAIL_DOMAIN>`). |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated allowed sign-in domains (e.g. `scarletmail.rutgers.edu,rutgers.edu`). Empty = allow all. |
| `PM_ADMIN_EMAIL` | The initial Project Manager; auto-activated by the seed. |
| `RESEND_API_KEY` | Resend API key for outbound email. Leave blank to disable email. |
| `EMAIL_FROM` | From address for emails. |
| `CRON_SECRET` | Shared secret protecting the notification cron endpoint. |

### Authentication via Rutgers CAS

Rutgers' official SSO is **CAS (Central Authentication Service)** — a ticket-based protocol, not OAuth. The flow:

1. App redirects to `<CAS>/login?service=<app>/cas/callback`.
2. User authenticates at CAS; CAS redirects back with a `ticket`.
3. App validates the ticket against `<CAS>/serviceValidate`, gets the NetID, and starts a session.

**Mock mode (default, `CAS_MODE=mock`)** — a local stand-in CAS screen at `/dev-login`. Enter any NetID to simulate a sign-in (no password). This exercises the *exact same* callback → session path as real CAS, so you can build and demo the whole app today. **This is the workaround while CAS registration is pending.**

**Going live with real CAS (`CAS_MODE=real`):**
1. Submit the **Enterprise CAS request** form to the Rutgers Identity Management (IdM) team to register this app's **service URL** (`https://<your-domain>/cas/callback`). Real CAS only accepts registered service URLs.
2. Once approved, set `CAS_MODE=real` and `CAS_BASE_URL` (confirm the exact base URL + validation path — `/serviceValidate` vs `/p3/serviceValidate` for attributes — in the Rutgers CAS docs/FAQ).
3. No application code changes are needed; the CAS client lives in `src/lib/cas.ts`.

> ⚠️ Also confirm the exact Rutgers domain string (`ALLOWED_EMAIL_DOMAINS`) before launch — likely `scarletmail.rutgers.edu` and/or `rutgers.edu`. Sign-in is rejected for any NetID outside it (enforced in `src/auth.ts` and the CAS callback).

---

## Roles & permissions

Roles are **data, not hardcoded.** A role carries a set of granular permission flags (see `Permission` in `prisma/schema.prisma`), and the PM can build custom roles in `/admin/roles`. Three roles are pre-seeded:

- **Project Manager** — all permissions.
- **Project Lead** — view all projects, edit/submit for own, close own action items.
- **Viewer** — read-only.

Authorization is enforced in two layers: the edge middleware gates routes from the JWT snapshot, and server actions re-read the user's **current** permissions from the database (`src/lib/session.ts`) so role changes take effect without a re-login.

---

## Notifications

- **Event-driven** (fired inline from server actions): project flagged Behind, action item assigned, user approved.
- **Time-based** (run on a schedule): "missing submission" and "action item due" reminders, handled by `src/lib/notify-engine.ts`.

The scheduled runner is exposed at `POST /api/cron/notifications` (protected by `CRON_SECRET`) and wired to **Vercel Cron** in [`vercel.json`](./vercel.json) (daily). Run it manually anytime:
```bash
pnpm notifications:run
# or
curl -X POST localhost:3000/api/cron/notifications -H "Authorization: Bearer $CRON_SECRET"
```
If `RESEND_API_KEY` is unset, emails are skipped and only in-app notifications are created.

---

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add all `.env` variables to the Vercel project (set `AUTH_URL` to your production URL).
3. For production CAS, register the app's `https://<domain>/cas/callback` service URL with Rutgers IdM and set `CAS_MODE=real` + `CAS_BASE_URL`. (Until then it runs in mock mode.)
4. Build command is `pnpm build` (runs `prisma generate` first). Run `pnpm db:push` once against your production database.
5. The cron in `vercel.json` is picked up automatically.

---

## Project structure

```
prisma/
  schema.prisma        # full data model + RBAC
  seed.ts              # built-in roles, settings, default rules, PM admin, demo data
src/
  auth.ts              # Auth.js (CAS Credentials provider, domain restriction, JWT callbacks)
  lib/cas.ts           # Rutgers CAS client (real + mock modes, ticket validation)
  auth.config.ts       # edge-safe auth config used by middleware
  middleware.ts        # route gating
  app/
    (app)/             # authenticated shell + pages (dashboard, projects, review, admin…)
    api/auth/…         # Auth.js handlers
    api/cas/login      # kicks off CAS sign-in (→ CAS or mock screen)
    api/cron/…         # scheduled notification endpoint
    cas/callback       # CAS ticket validation → session
    login, pending     # public auth screens
    dev-login          # mock CAS screen (mock mode only)
  components/          # AppShell, charts, forms, role builder, UI primitives
  lib/
    prisma.ts          # Prisma singleton
    permissions.ts     # RBAC helpers + permission metadata
    session.ts         # authoritative current-user / permission guards
    health.ts          # red-flag auto-detection + late-submission rules
    notify.ts          # in-app + email delivery
    notify-engine.ts   # time-based notification triggers
    queries.ts         # project visibility scoping
    stats.ts           # dashboard/review aggregations
scripts/run-notifications.ts
```

## Useful scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run the dev server |
| `pnpm build` | Production build (runs `prisma generate`) |
| `pnpm typecheck` | TypeScript check |
| `pnpm db:push` | Push schema to the database |
| `pnpm db:seed` | Seed roles, settings, rules, PM admin (`SEED_DEMO=true` for demo data) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm notifications:run` | Run the notification engine once |

---

## Design system

The UI follows the **"Eco-Tech Dashboard"** language (`claude/eco-tech-dashboard-DESIGN.md`): a soft sage background with dark charcoal **bento panels** for metric emphasis, lighter panels for dense content, big **Gloock** display serifs, **JetBrains Mono** technical eyebrows/labels, and **Inter** body copy. Large radii (32px cards, pill controls), earthy status colors (sage = On Track, ochre = At Risk, terracotta = Behind), and restrained hover-lift / staggered-reveal motion. Icons are from **lucide-react** (no emoji). All tokens live as CSS custom properties in `src/app/globals.css`; fonts are wired via `next/font` in `src/app/layout.tsx`.
