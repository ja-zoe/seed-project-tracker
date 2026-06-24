# 🌱 SEED Project Tracker

A web app for the **Students for Environmental and Energy Development (SEED)** club at Rutgers University–New Brunswick. It turns the club's weekly project communication plan into a tool that **enforces accountability, surfaces blockers early, and visualizes project health** across the semester.

Built with Next.js, Supabase (Postgres), Auth.js (Google OAuth), Recharts, and Resend, in a forest/earth **glassmorphism** theme.

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
| §3 | Google OAuth restricted to the Rutgers domain; pending-user approval | `/login`, `/pending`, `/admin/users` |
| §5.1 | Pre-meeting status updates (5 required fields + "need help"), late-marking | `/status/new`, project detail |
| §5.2 | Post-meeting tracking | project detail |
| §5.3 | Red-flag auto-detection with **PM-configurable thresholds** + manual override | `/admin/notifications`, project detail |
| §5.4 | Semester milestones; on-track-vs-behind computed against them | project detail |
| §5.5 | Email + in-app notifications, configurable trigger rules | `/admin/notifications`, `/notifications` |
| §5.6 | Action items with carry-over | project detail, `/action-items` |
| §5.7 | Monthly review dashboard (auto-answers the 4 questions) | `/review` |
| §5.8 | Submission history / audit trail | project detail |
| §5.9 | Charts (goal completion, blockers, health distribution) | dashboard, `/review` |
| §10 | Forest/earth glassmorphism theme | `src/app/globals.css` |

---

## Tech stack

- **Framework:** Next.js 15 (App Router, React 19, server actions) — deploys free on Vercel.
- **Auth:** Auth.js (NextAuth v5) with the Google provider, domain-restricted. JWT sessions so middleware can authorize without a DB round-trip.
- **Database:** Supabase (Postgres) via Prisma ORM.
- **Charts:** Recharts.
- **Email:** Resend (free tier) — optional; the app is fully usable without it (in-app notifications still work).
- **Styling:** Custom CSS design system (forest palette + glassmorphism) with Tailwind for layout utilities.

---

## Getting started

### 0. Prerequisites
- Node.js 20+ and **pnpm** (`npm i -g pnpm`).
- A Supabase project, a Google Cloud OAuth client, and (optionally) a Resend account.

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
Open <http://localhost:3000> and sign in with the Google account you set as `PM_ADMIN_EMAIL`. That account is pre-activated as the Project Manager; everyone else lands in a **pending** state until you approve them in `/admin/users`.

---

## Environment variables

All variables are documented inline in [`.env.example`](./.env.example). Summary:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Supabase **pooled** connection string (port 6543, `?pgbouncer=true`) — used by the app. |
| `DIRECT_URL` | Supabase **direct** connection string (port 5432) — used for migrations. |
| `AUTH_SECRET` | Random secret for Auth.js. Generate: `openssl rand -base64 32`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client credentials. |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated allowed sign-in domains (e.g. `scarletmail.rutgers.edu,rutgers.edu`). Empty = allow all. |
| `PM_ADMIN_EMAIL` | The initial Project Manager; auto-activated by the seed. |
| `RESEND_API_KEY` | Resend API key for outbound email. Leave blank to disable email. |
| `EMAIL_FROM` | From address for emails. |
| `CRON_SECRET` | Shared secret protecting the notification cron endpoint. |

### Setting up Google OAuth
1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID** (Web application).
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (and your production URL).
3. Copy the client ID/secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
4. **Domain restriction:** sign-in is rejected for any email outside `ALLOWED_EMAIL_DOMAINS` (enforced in `src/auth.ts`). For org-wide enforcement you can also set `hd` on the Google Workspace side.

> ⚠️ Confirm the exact Rutgers domain string before launch — likely `scarletmail.rutgers.edu` and/or `rutgers.edu`.

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
3. Add the production redirect URI to your Google OAuth client.
4. Build command is `pnpm build` (runs `prisma generate` first). Run `pnpm db:push` once against your production database.
5. The cron in `vercel.json` is picked up automatically.

---

## Project structure

```
prisma/
  schema.prisma        # full data model + RBAC
  seed.ts              # built-in roles, settings, default rules, PM admin, demo data
src/
  auth.ts              # Auth.js (Google OAuth, domain restriction, JWT callbacks)
  auth.config.ts       # edge-safe auth config used by middleware
  middleware.ts        # route gating
  app/
    (app)/             # authenticated shell + pages (dashboard, projects, review, admin…)
    api/auth/…         # Auth.js handlers
    api/cron/…         # scheduled notification endpoint
    login, pending     # public auth screens
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

The UI follows a **forest / earthy glassmorphism** language (outline §10): muted natural tones, a barely-there topographic texture behind frosted-glass panels, and earthy status colors (moss = On Track, ochre = At Risk, clay red = Behind). The glass technique (blur, translucent borders, edge highlights, soft shadows) comes from the provided glassmorphism design skill; the palette and texture are original to this project. All tokens live as CSS custom properties in `src/app/globals.css`, and dark mode resolves automatically via `prefers-color-scheme`.
