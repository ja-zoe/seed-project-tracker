# Project Context — invariants

Shared bootstrap for every revision set. Load this once at the start of any session.
Holds only project-wide facts that aren't obvious from the code and don't change per set.
For full architecture detail see the repo's `CLAUDE.md`; this file is the delta a cold
session needs to avoid mistakes.

---

## App

**SEED Project Tracker** — Next.js 16 (App Router, React 19, TypeScript strict).
**Repo root:** `/home/jazoe/projects/seed-project-dashboard`

## Invariants

- **Package manager:** pnpm only. Never npm/npx.
- **Branch strategy:** `main` is the single integration branch and is always working (it is the only remote branch). There is **no `develop`** — older logs that mention merging to `develop` are historical aspiration, not reality. Every revision set gets a set branch off `main` (`feat/setN-<slug>`), and every feature gets its own branch off the set branch (`feat/setN/RN.M-<slug>`). A feature branch merges into the set branch only after it passes that feature's tests/verification; the set branch merges into `main` only after every feature passes and the app boots. Never merge non-booting code into `main`. Merge only when told.
- **DB access:** Supabase Postgres via pgBouncer pooler (port 6543). `prisma db push` and direct port 5432 both hang — **never use them.** Apply DDL by writing raw SQL and running `tsx scripts/apply-schema.ts` (pg Client directly).
- **Prisma v7:** WASM engine requires the driver adapter. Always construct as `new PrismaClient({ adapter })` where `adapter = new PrismaPg({ connectionString: DATABASE_URL })`. Generated client lives at `src/generated/prisma`. After `prisma generate`, **restart the dev server** — Turbopack caches the old WASM bundle and won't hot-reload it.
- **Auth:** Auth.js v5 Credentials + Rutgers CAS. Mock mode via `CAS_MODE=mock` for now (real CAS pending IdM registration). PM auto-activates via `PM_ADMIN_EMAIL`. New users start `PENDING`.
- **Icons:** Phosphor Icons only (Bold/Fill weight). Lucide is banned.
- **Styles:** Tailwind v4 (`@import "tailwindcss"`, `@theme inline`; no config file). Forest Floor palette — `#F4F1EA` canvas, `#FFFFFF` card, `#2E4034` primary forest, `#588157` moss/on-track, `#C99846` at-risk, `#A4503C` clay/behind. No heavy shadows, no gradients, no glassmorphism.
- **Fonts:** Geist Sans (body), Instrument Serif (display/hero, h1/h2), JetBrains Mono (meta/labels/timestamps/code).

---

## Standing decisions

### AI integration: MCP server (decided R4)

The app exposes project tools via the Model Context Protocol at `POST /api/mcp` (JSON-RPC 2.0, protocol version `2024-11-05`). Auth via `Authorization: Bearer <mcpToken>` → `User.mcpToken` lookup; 401 if missing/invalid or user not ACTIVE. Users connect their own AI client (Claude Desktop, Cursor, etc.) with a personal token generated on `/account`. The model runs in the user's environment under their own subscription — **the app never handles API keys.**

**Rejected:** "Bring your own API key" chat widget (R3.4, removed R4.1) — free API tiers exhaust immediately, billing is separate from site usage, and UX friction was high.

### Clickability affordances (decided R19)

Every interactive element carries a hover cue, built on Forest Floor tokens (no fills, underlines, shadows, or gradients). Shared utility classes live in `src/app/globals.css` (`@layer utilities`):

- Clickable **icons / inline controls** → `.clickable-icon` (pointer cursor + color shift to forest `#2E4034` / `--primary` on hover).
- Clickable **text / links** that are not container rows → `.clickable` (pointer + color shift to forest on hover).
- **Destructive** triggers (delete/remove) → `.clickable-danger` (pointer + color shift to clay `#A4503C`).
- Clickable **container rows** that open (deliverable/subtask rows) → `.clickable-row` (a subtle hover *tint* with **default cursor**) — the pointer belongs to the controls *inside* the row, so the row tint just tells you which row you're on.

**Never** signal interactivity on static/display elements (non-button status badges, plain text) — affordances apply only to genuinely interactive elements.

### Cross-surface parity (learned set 21)

Any lead-facing capability or field spans several surfaces that silently drift apart. When touching one,
sync them all:

- **Write surfaces:** the server action, the page-level auth guard, the UI component's `can*` props/controls,
  any standalone edit page, and the MCP tool in `src/app/api/mcp/route.ts`. The MCP tool is the easiest to
  miss — it duplicates gate logic instead of calling the server action.
- **Parity dimensions:** permission gates, input fields (an edit modal must expose every input its create
  form has, and vice versa), display fields (a recent-N summary must show what the see-all page shows), and
  cross-field validation (create + MCP paths must enforce what the edit paths enforce; MCP partial updates
  must validate the merged post-update row).
- **Lead capability comes from `ProjectAssignment` (LEAD/SUBLEAD), not the global role** — the seeded
  "Project Lead" role deliberately lacks MANAGE_MILESTONES etc. Cross-project listing pages
  (`/action-items`, `/my-tasks`, dashboard) must compute editability **per item** from the user's lead
  assignments; a single global-permission boolean silently strips lead abilities.
- **`revalidatePath` every listing surface** that renders the mutated record (project page, `/history`,
  `/my-tasks`, `/action-items`), not just the page the mutation happened on.
