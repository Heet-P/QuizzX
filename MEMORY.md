# QuizzX_V2 — Project Memory

This file is the single source of truth for anyone (human or AI agent) picking up
this project without prior context. It records **decisions and why they were
made**, **current status**, **what's known-broken or incomplete**, and **what's
left to build**. It is deliberately long and not trimmed for brevity — read the
index below, jump to the section(s) you need, and you should not need to re-read
the whole file or re-derive context that's already written down here.

Companion documents (not duplicated here, referenced where relevant):
- `../MIGRATION_AUDIT.md` (one directory up, next to the `QuizzX` and `QuizzX_V2`
  folders) — the exhaustive, file-by-file audit of the original QuizzX codebase
  that this migration is based on. 605 lines, every route/component/table
  enumerated with checkboxes. This MEMORY.md summarizes its findings in Section 8
  but does not reproduce it in full — go to the audit itself for exact old-code
  line references, exact SQL column types, etc.
- `design_idea/DesignPhilo.md` — the original visual-design brief (units.gr
  inspiration, tone, "12-section homepage" spec) that kicked off the landing page
  redesign described in Section 7.
- `answer_icreate.md` (repo root) — an infrastructure cost/deployment funding
  proposal for a funding committee. Not project architecture documentation, but
  useful corroborating evidence of intended production services (Vercel, Neon,
  Clerk, R2, Groq, NVIDIA NIM, Upstash Redis) — cross-referenced in Section 12.

---

## 0. INDEX

Use this to jump straight to a section instead of reading the whole file. Line
numbers are exact as of this writing — if the file has been edited since and a
heading has drifted, search for the `## N.` heading text instead (all headings
are numbered and unique, so a text search always works even if numbers drift).

| # | Section | Line |
|---|---|---|
| 0 | INDEX (this table) | 27 |
| 1 | Project Overview & Purpose | 78 |
| 2 | Repository & File Structure Map | 113 |
| 2.1 | QuizzX_V2/ top-level layout (full directory tree) | 124 |
| 2.2 | What does NOT exist yet | 188 |
| 3 | Tech Stack & Exact Versions | 199 |
| 4 | Architecture Decisions (framework-level, with rationale) | 237 |
| 4.1 | Next.js 16 specifics (proxy.ts, async APIs, no cacheComponents) | 249 |
| 4.2 | Clerk v7 specifics (deprecated route matcher, resource-based auth) | 267 |
| 4.3 | Prisma v7 specifics (driver adapters, prisma.config.ts, the directUrl gotcha) | 297 |
| 4.4 | Tailwind v4 specifics (CSS-first theming, cascade layer gotcha) | 327 |
| 4.5 | Fonts (self-hosted, which fonts, why) | 350 |
| 5 | V1 → V2 Architectural Changes | 386 |
| 5.1 | Real-time: Socket.IO dropped → SSE/polling | 392 |
| 5.2 | Storage: Cloudflare R2 added (new capability, not a replacement) | 422 |
| 5.3 | API routing: `/api/v1` dropped | 440 |
| 5.4 | Dropped dead features: GameController, AdminQuizControls | 450 |
| 5.5 | Design system: full neo-brutalist → editorial → arcade-HUD swap | 471 |
| 5.6 | Shared logic consolidation (quiz-settings, answer-matching) | 502 |
| 6 | Database Schema | 532 |
| 6.1 | Prisma models (13, one table intentionally dropped) | 534 |
| 6.2 | Migration status — **schema never pushed to a real database yet** | 580 |
| 7 | Landing Page Redesign — Full History | 599 |
| 7.1 | Round-by-round summary (every major pivot, in order) | 607 |
| 7.2 | Design system tokens (colors, radii, shadows, type scale) | 692 |
| 7.3 | Component map (every file in components/landing/, current purpose) | 724 |
| 7.4 | The sidebar saga — why it ended up as a dropdown (full postmortem) | 755 |
| 8 | Feature Migration Checklist (condensed from MIGRATION_AUDIT.md) | 817 |
| 8.1 | Pages/routes — 1 of 15 built (landing only) | 823 |
| 8.2 | API endpoints — none built yet | 848 |
| 8.3 | Cross-cutting shared logic — status | 869 |
| 9 | Known Issues / Things Actively NOT Working | 879 |
| 10 | Phase Status (against the original 6-phase migration brief) | 926 |
| 11 | Environment & Credentials Status | 966 |
| 12 | Intended Production Infrastructure (from answer_icreate.md) | 1000 |
| 13 | Key Technical Gotchas / Lessons Learned | 1034 |
| 14 | Git / Version Control Status — **nothing is committed yet** | 1110 |
| 15 | Open Questions For The User | 1147 |
| 16 | How To Resume Work — quick-start for a new agent | 1183 |

---

## 1. Project Overview & Purpose

**QuizzX** is a competitive quiz platform: users take quizzes, earn XP/levels,
maintain streaks, unlock achievements, compete on leaderboards individually or
in teams, battle in live multiplayer rooms, and (for teachers/admins) author
quizzes manually or via AI generation. It has fullscreen-lockdown/anti-cheat
tooling for graded assessments and a separate no-stakes "practice mode."

**QuizzX_V2** is a from-scratch rebuild of the same product on a different
stack, currently in progress. The original app (**QuizzX**, referred to
throughout as "v1") lives as a sibling directory at `../QuizzX` and is treated
as **read-only reference** — never edit it, only read it to understand what
behavior needs to be reproduced.

**Why rebuild instead of incrementally upgrade:** v1 is a Vite/React SPA
frontend + a separate Express/Node backend (two codebases, two deploys). v2
unifies both into a single Next.js 16 App Router project (Server Components,
Route Handlers, Server Actions) — one codebase, one deploy target (Vercel).
This is explicitly a **structural migration + since-approved visual redesign**,
not a rewrite of product behavior — see Section 5 for what changed and why, and
Section 8 for what still has to be ported.

**Current high-level status (see Section 10 for detail):** Phase 0 (audit) and
most of Phase 1 (scaffold: auth, DB schema, design tokens, fonts) are done. The
**landing page only** has been built and iterated on extensively (Section 7).
**Zero application pages exist yet** — no dashboard, quiz-taking, leaderboard,
team, admin, teacher, proctor, live-lobby, or presenter pages, and **zero API
routes exist**. The database schema is written but has **never been pushed to a
real database** (no `prisma/migrations` directory exists). Nothing in this
project has been committed to git beyond the original `create-next-app`
scaffold (Section 14) — every single change described in this file is currently
**uncommitted working-tree state**.

---

## 2. Repository & File Structure Map

Root: `c:\Users\heet1\OneDrive\Desktop\Coding\` contains sibling folders:
- `QuizzX/` — the v1 app (read-only reference). Has `client/` (Vite/React) and
  `server/` (Express) subfolders.
- `QuizzX_V2/` — this project, described below.
- `MIGRATION_AUDIT.md` — lives at this parent level, **not inside QuizzX_V2**.
  Referenced constantly throughout this file as "the audit."
- Unrelated sibling projects (`RL-game`, `Slurp`, `techgenuis-website`) — ignore,
  not part of QuizzX.

### QuizzX_V2/ top-level layout

```
QuizzX_V2/
├── app/
│   ├── layout.tsx                  Root layout: ClerkProvider, 3 fonts, ToastProvider,
│   │                               SmoothScroll (Lenis), IntroLoader
│   ├── page.tsx                    Landing page (Server Component) — THE ONLY
│   │                               real page built so far besides auth
│   ├── globals.css                 Full design system — see Section 7.2
│   ├── fonts/                      Self-hosted font files (see Section 4.5)
│   ├── login/[[...rest]]/page.tsx  Clerk <SignIn/> catch-all route
│   ├── register/[[...rest]]/page.tsx  Clerk <SignUp/> catch-all route
│   └── (protected)/
│       └── layout.tsx              Auth-gate shell + <AppNav/> — WRAPS NOTHING YET,
│                                   no page.tsx files exist under this route group
├── components/
│   ├── AppNav.tsx                  Logged-in app nav (dashboard/quizzes/leaderboard/
│   │                               team/admin/live links) — built, but nothing
│   │                               renders it yet since no protected pages exist
│   ├── LandingNav.tsx              Mobile-only (lg:hidden) top bar for the landing page
│   ├── ConfirmModal.tsx            Shared confirm dialog (ported from v1)
│   ├── Toast.tsx                   Toast notification system (ported from v1)
│   ├── IntroLoader.tsx             Session-scoped branded loading screen (new in v2)
│   ├── SmoothScroll.tsx            Lenis smooth-scroll mount (new in v2)
│   └── landing/                    Every landing-page section — see Section 7.3
│       for the full component-by-component breakdown
├── lib/
│   ├── auth.ts                     getCurrentUser()/requireUser() — v2 port of v1's
│   │                               authMiddleware.js syncUserToDb logic
│   ├── prisma.ts                   Prisma client singleton w/ Neon driver adapter
│   ├── fonts.ts                    next/font/local declarations for all 5 self-hosted
│   │                               font families
│   ├── clerk-appearance.ts         Clerk <ClerkProvider appearance={}> object, styled
│   │                               to match the current design system
│   ├── utils.ts                    cn() className helper (clsx + tailwind-merge)
│   └── generated/prisma/           Prisma Client v7 generated output (checked into
│                                   the working tree per the `output` path in
│                                   schema.prisma — this is generated code, not
│                                   hand-written; regenerate via `npx prisma generate`
│                                   if it looks stale)
├── prisma/
│   └── schema.prisma               13 models — see Section 6
├── types/
│   └── quiz.ts                     Shared QuizSettings type + normalizeQuizSettings()
│                                   — the "single source of truth" fix for a v1
│                                   cross-cutting-duplication problem, see Section 5.6
├── design_idea/                    DesignPhilo.md + 6 reference screenshots
│                                   (units.gr inspiration images) — inspiration only,
│                                   never to be copied literally
├── public/                         (mostly emptied — default Next.js SVGs deleted,
│                                   see Section 14 git status)
├── proxy.ts                        Next.js 16's renamed middleware.ts — see Section 4.1
├── prisma.config.ts                Prisma v7's new CLI config file — see Section 4.3
├── .env.local / .env.local.example Environment variables — see Section 11
├── AGENTS.md / CLAUDE.md           Both say the same thing: "this is NOT the
│                                   Next.js you know — breaking changes are
│                                   pervasive, read node_modules/next/dist/docs/
│                                   before writing code, heed deprecation notices"
├── package.json                    See Section 3 for exact dependency versions
├── answer_icreate.md               Infra cost/funding proposal — see Section 12
└── i-Create Project Proposal Format.md   Blank template, not filled in, low relevance
```

### What does NOT exist yet (do not assume otherwise)
- No `app/(protected)/dashboard/`, `/quizzes/`, `/quiz/[id]/`, `/leaderboard/`,
  `/team/`, `/admin/`, `/teacher/`, `/profile/`, `/live/` directories or
  `page.tsx` files anywhere under `(protected)`.
- No `app/api/` directory at all — zero Route Handlers exist.
- No `prisma/migrations/` directory — the schema has never been applied to a
  database.
- No test files, no CI config (`.github/workflows/`), no `vercel.json`.

---

## 3. Tech Stack & Exact Versions

From `package.json` (dependencies actually installed — this is the ground truth,
not a plan):

| Package | Version | Role |
|---|---|---|
| `next` | 16.2.11 | Framework — App Router, Turbopack default |
| `react` / `react-dom` | 19.2.4 | UI runtime |
| `typescript` | ^5 | Language |
| `@clerk/nextjs` | ^7.5.21 | Auth |
| `@prisma/client`, `prisma` | ^7.9.0 | ORM |
| `@neondatabase/serverless` | ^1.1.0 | Neon's serverless Postgres driver |
| `@prisma/adapter-neon` | ^7.9.0 | Prisma driver adapter bridging the above two |
| `tailwindcss`, `@tailwindcss/postcss` | ^4 | Styling (CSS-first config) |
| `framer-motion` | ^12.42.2 | Animation (reveals, counters, shimmer, blink) |
| `lenis` | ^1.3.25 | Smooth scroll |
| `lucide-react` | ^1.25.0 | Icon set — the ONLY icon source used; **no emoji
| | | anywhere in the UI, ever** (explicit, repeated user directive) |
| `clsx`, `tailwind-merge` | ^2.1.1 / ^3.6.0 | Used by `lib/utils.ts`'s `cn()` |
| `dotenv` | ^17.4.2 | Explicit env loading (Prisma v7 doesn't auto-load `.env`) |
| `sharp` | 0.34.5 | Image processing (Next.js/Prisma build dependency) |

No AI SDK (Groq/NVIDIA/OpenAI-compatible client), no AWS/R2 SDK, no Redis
client, no email SDK, no testing framework (Jest/Vitest/Playwright) is
installed. These are all still todo (Section 8/12) — the env vars for them
exist as scaffolding in `.env.local.example` but no code calls them yet.

`npm run dev|build|start|lint` are the only scripts (`next dev|build|start`,
`eslint`).

Node's `allowScripts` gate (a newer npm security feature) has been approved for
`@prisma/engines`, `prisma`, `sharp`, `unrs-resolver` — their postinstall
scripts were inspected and are standard binary-download logic, nothing
suspicious.

---

## 4. Architecture Decisions (framework-level, with rationale)

The single most important meta-lesson from this migration: **this project's
core frameworks (Next 16, Clerk v7, Prisma v7, Tailwind v4) all have breaking
changes vs. what's in most training data.** `AGENTS.md`/`CLAUDE.md` both
explicitly warn about this. The pattern that worked every time a framework
surprise came up: **read the actual installed code/docs
(`node_modules/next/dist/docs/`, `node_modules/@clerk/...*.d.ts`,
`node_modules/@prisma/config/dist/index.d.ts`, etc.) before writing code**,
because even version-pinned bundled skill docs have been caught being stale
against the actually-installed version (Section 13 has the specific incident).

### 4.1 Next.js 16 specifics

- **`proxy.ts` replaces `middleware.ts`.** Same mechanism, renamed file and
  export. See `proxy.ts` — it only establishes Clerk's auth context (so
  `auth()`/`currentUser()` work downstream); it does **not** enforce anything
  itself, on purpose (see 4.2).
- **Fully async Request APIs, no sync fallback at all.** `cookies()`,
  `headers()`, `params`, `searchParams` are all `Promise`-returning in this
  version — not "may be sync or async," always async. Every Server Component
  reading `params`/`searchParams` must `await` them.
- **Route Handlers are not cached by default** (a real behavior change from
  older Next versions where GET handlers were cached unless opted out).
- **`cacheComponents` config is intentionally left disabled** — this
  preserves "always dynamic," matching the original Express API's behavior
  (nothing was cached there either) rather than introducing a new caching
  behavior class the original app never had to account for.
- Turbopack is the default bundler in this version, no flag needed.

### 4.2 Clerk v7 specifics

- `clerkMiddleware()` comes from `@clerk/nextjs/server`, used in `proxy.ts`.
- `auth()`/`currentUser()` are **server-only** — the root `@clerk/nextjs`
  package's own `auth` export is typed `never` if you try to import it from
  the client-safe entry point. Always import from `@clerk/nextjs/server` in
  Server Components/Route Handlers/Server Actions.
- Client-side: `ClerkProvider`, `SignIn`, `SignUp`, `useUser`, `useClerk`,
  `useAuth`, `UserButton` all come from the root `@clerk/nextjs` package (client
  entry). `SignedIn`/`SignedOut` control components from older Clerk versions
  **do not exist in this version** — confirmed by grepping the installed
  type declarations; there is no exported symbol by that name anywhere in
  `@clerk/nextjs`. Do conditional signed-in/signed-out rendering manually via
  `useUser()`'s `{ isLoaded, isSignedIn }` instead (see `AuthCTA.tsx`).
- **`createRouteMatcher` is deprecated in this SDK version** (the installed
  type declarations' JSDoc explicitly recommend resource-based auth checks
  instead of centralized path-matching). This directly shaped the
  architecture: `proxy.ts` stays auth-logic-free, and **every** protected
  layout/page/Route Handler/Server Action does its own
  `getCurrentUser()`/`requireUser()` check (see `lib/auth.ts`,
  `app/(protected)/layout.tsx`). This mirrors Next's own recommendation to
  keep real authorization close to the data rather than centralized in
  middleware.
- `UserButton`'s prop surface changed too — `afterSignOutUrl` (a prop from
  older Clerk versions many people remember) **does not exist** on this
  version's `UserButtonProps` type; caught by `tsc` when first tried in
  `AuthCTA.tsx`, removed. If you need custom sign-out redirect behavior, it's
  configured differently now (check `UserButtonProps`/`ClerkProvider` props
  in the actual installed `.d.ts` before assuming an API shape).

### 4.3 Prisma v7 specifics

- Generator is `"prisma-client"` (not the old `"prisma-client-js"`), with a
  **mandatory explicit `output` path** — see `prisma/schema.prisma`'s
  generator block, output goes to `lib/generated/prisma`.
- **Driver adapters are REQUIRED for SQL now, not optional.** This project
  uses `@prisma/adapter-neon` + `@neondatabase/serverless` (`lib/prisma.ts`).
- **`prisma.config.ts`** (new top-level file, replaces `datasource.url` /
  `directUrl` living in `schema.prisma` itself) is how the Prisma CLI (not the
  app runtime) knows what database to point `prisma migrate`/`db push` at.
- **Known gotcha, already hit and fixed:** a bundled Prisma skill doc (written
  against v7.6.0) claimed `prisma.config.ts`'s `datasource` block supports a
  `directUrl` field alongside `url`. **It does not**, in the actually-installed
  v7.9.0 — verified by reading
  `node_modules/@prisma/config/dist/index.d.ts` directly, which only has
  `{ url?: string; shadowDatabaseUrl?: string }`. Fix used: a
  **differently-named env var** (`DIRECT_URL`) is read by `prisma.config.ts`'s
  `url` field (for CLI/migration use, needs the *unpooled* Neon connection for
  advisory locks), while the app's own runtime code (`lib/prisma.ts`)
  independently reads `DATABASE_URL` (the *pooled* connection) — same
  practical two-connection-string outcome as `directUrl` would have given,
  achieved without a field that doesn't exist. **Lesson: installed code is
  authoritative over even version-pinned bundled docs when they disagree.**
- No automatic `.env` loading — `prisma.config.ts` explicitly does
  `import { config } from "dotenv"; config({ path: ".env.local" })` before
  anything else.
- Prisma ships its own `.agents/skills/` + `.claude/skills/` AI-agent reference
  docs in `node_modules/prisma` — these are the "bundled skill docs" referenced
  above; useful but verify against actual installed types when in doubt.

### 4.4 Tailwind v4 specifics

- **CSS-first theming** — no `tailwind.config.js`. Everything is an `@theme
  inline { }` block in `app/globals.css` (custom `--color-*`, `--radius-*`,
  `--text-*`, `--animate-*` tokens auto-generate matching utility classes,
  e.g. `--color-blue` → `bg-blue`/`text-blue`/`border-blue`).
- **Cascade layer gotcha, hit and fixed twice:** Tailwind v4 generates
  `@layer base`, `@layer components`, `@layer utilities` in that fixed order
  regardless of where in your source file the corresponding class is
  authored. This means a **utility class in your JSX (e.g. `border-ink/10`)
  ALWAYS wins over a `@apply`'d style inside a `.card-tactile`-style component
  class**, even if the component class's CSS rule appears later in your
  actual `globals.css` source. This bit twice: (1) `.card-tactile`'s
  `@apply border-2 border-ink` (bold border) was silently overridden by an
  explicit `border-2 border-ink/10` (10% opacity, near-invisible) sitting
  right there in one component's className string — the fix was to delete the
  redundant utility override, not to fight the layer order. (2) Any time you
  add a "bold border to everything" style via a shared class, grep for
  explicit per-component border overrides first.
- `@theme inline` tokens: colors, radii, editorial type scale
  (`--text-display-{sm,md,lg,xl,2xl}`), tactile shadow tokens, marquee/blink
  `@keyframes` + `--animate-*` tokens — full list in Section 7.2.

### 4.5 Fonts (self-hosted, why, which ones)

All 5 font families are self-hosted via `next/font/local` (`lib/fonts.ts`),
**not** loaded from Google Fonts' CDN or any other third-party font host at
runtime — better performance (no external request, no FOUC), consistent with
this app's general avoid-third-party-runtime-dependencies posture.

- **Satoshi** (400/500/700/900) — Fontshare. Used as `--font-accent`
  (buttons, chips, labels, uppercase small text throughout).
- **Clash Display** (400/500/600/700) — Fontshare. **Downloaded, present in
  `app/fonts/`, but no longer referenced by any CSS token** — it was the
  original `--font-display` before being replaced (see below). Dead weight,
  safe to delete if you're cleaning up, but harmless to leave.
- **General Sans** (400/500/600/700) — Fontshare. Same situation as Clash
  Display: downloaded, present, **no longer referenced** — was the original
  `--font-sans` before being replaced. Dead weight.
- **Geist Pixel** (400 only — this is the font's only available weight) —
  self-hosted from Google Fonts' actual CDN (`fonts.gstatic.com`) file, not
  loaded live. Currently wired as `--font-display` (all headings site-wide).
  Chosen for its literal pixel/terminal look, which fit the arcade-HUD
  redesign direction (Section 7.1) far better than Clash Display's editorial
  elegance did.
- **Anek Devanagari** (100–800, 8 weights) — same self-hosting approach as
  Geist Pixel. Currently wired as `--font-sans` (all body text site-wide).
  Chosen alongside Geist Pixel in the same request; both were user-supplied
  via a literal Google Fonts `<link>`/`<style>` snippet, converted to
  self-hosted `next/font/local` for consistency with the rest of the font
  system rather than left as a runtime Google Fonts CDN call.
- This is a **sitewide font swap done in one shot with explicit user
  awareness that it was the higher-risk part of that change** ("the sitewide
  font swap is the biggest visual change here, so that's the one most likely
  to need a second pass") — it was never actually revisited/reverted, so
  treat it as the current, intentional state, not a pending decision.

---

## 5. V1 → V2 Architectural Changes

Four questions were explicitly resolved with the user on 2026-07-21, before
Phase 1 scaffolding began (recorded in MIGRATION_AUDIT.md Section 11 — this is
the canonical list; summarized here with the reasoning):

### 5.1 Real-time: Socket.IO dropped entirely → SSE + polling

**Why:** Socket.IO needs a long-lived Node process; typical Next.js hosting
(Vercel-style serverless) doesn't provide one. SSE and polling both work fine
from ordinary stateless Route Handlers anywhere.

**Why this is a smaller change than "drop all real-time" sounds:** auditing
what each v1 feature *actually* used (not assumed) showed:
- **Leaderboard live updates** — the only feature 100% on Socket.IO. But the
  SSE equivalent (`GET /leaderboard/stream`) was **already fully built
  server-side in v1** and already pinged on every submission — it just never
  had a frontend consumer (v1 dead-code finding, audit Section 0.5/7). v2's
  job is to **build a new `useLeaderboardStream` hook** that opens an
  `EventSource` against `/api/leaderboard/stream`, porting v1's existing
  `?__session=` → `Authorization` header rewrite (needed because
  `EventSource` can't set custom headers) into the new route handler.
- **Live lobby / presenter pages** — were **already 100% REST + polling** in
  v1 (3s/2s intervals) on the client side; Socket.IO there was only used
  *outbound* to push to the leaderboard page. **Port unchanged, no real-time
  architecture change needed.**
- **Proctor stream** — was already SSE-only in v1. **Port unchanged.**
- **Presence count** (`presence:update` event) — confirmed cosmetic/unused in
  v1 (no page ever read it). **Dropped, no replacement needed.**
- **Per-question live reveal** (driven by v1's orphaned `AdminQuizControls`,
  see 5.4) — **dropped along with that component.**

Net effect: only the leaderboard page's live-update mechanism actually
changes. Live lobby, presenter, and proctor need zero real-time-layer changes
during porting.

### 5.2 Storage: Cloudflare R2 — a new capability, not a replacement

**Finding:** v1 has **no file storage system at all**, Supabase or otherwise.
Teacher/admin quiz uploads (`.docx`/`.txt`/`.md`) are parsed in-memory
(`multer.memoryStorage()` + `mammoth`) into a JSON question array, and the
original file bytes are **discarded**, never persisted anywhere. The migration
brief's assumption that v1 uses Supabase (Postgres + Storage) was **checked
and found false** — no `@supabase/supabase-js` anywhere in either
`client/package.json` or `server/package.json`; the only "Supabase" residue is
two stale code comments. v1 already talks to Postgres via raw `pg.Pool`
pointed at Neon.

**Decision:** R2 will persist the original uploaded quiz source document (the
thing v1 currently parses-then-throws-away) — not inventing a new user-facing
upload feature, just stopping the current data loss. **Not built yet** — env
vars exist as scaffolding in `.env.local.example` (all currently empty, see
Section 11) but no R2 SDK is installed and no upload route exists.

### 5.3 API routing: `/api/v1` prefix dropped

v1's Express app mounted every router twice — `/api/v1/<resource>`
(canonical) and `/api/<resource>` (back-compat alias) — but the actual v1
frontend's `VITE_API_URL` always included `/api` and **only ever called the
alias path**, never the versioned one. **Decision: drop `/api/v1` entirely.**
v2 will serve everything at `/api/<resource>` via `app/api/<resource>/route.ts`,
matching both what the old frontend actually called and Next.js's own `app/api`
convention. (Not built yet — no `app/api/` directory exists.)

### 5.4 Dropped dead features (confirmed zero real caller in v1)

Two backend/frontend feature pairs were found, via repo-wide grep, to have
**zero actual callers** in v1:
- **`GameController`/`gameRoutes.js`/`game_sessions` table** — no page or
  component calls any `/game/...` endpoint. Redundant shadow of
  `SubmissionController`'s scoring path (same `submissions` table, same
  leaderboard push), no unique capability.
- **`AdminQuizControls.jsx`** — emits `admin:question:show`/`close`/
  `admin:quiz:end` over the quiz Socket.IO channel; server-side listeners
  fully exist, but the component is never imported by any page. Its one
  capability (host paces question reveal live) is already delivered a
  different way by the Live Lobby feature.

**Decision: drop both entirely**, consistent with the user's plan to run a
separate "essential features only" audit after this migration finishes — no
reason to carry known-dead weight into that audit. Directly reflected in
`prisma/schema.prisma`'s explicit omission of a `game_sessions` model (see
Section 6.1) and in the audit's endpoint tables (Section 8.2) simply not
listing `/game/*`.

### 5.5 Design system: full visual identity change (twice)

This is the single biggest and most iterated-on change in the whole project,
and it happened in **two distinct stages**, not one:

**Stage A (Phase 1, structural-migration-only, per the original brief):**
port v1's neo-brutalist Tailwind v4 token set
(`--color-neo-{black,white,yellow,pink,blue,green,purple}`, `--shadow-neo*`,
Space Grotesk/Space Mono via Google Fonts, `.btn-neo`/`.card-neo`/`.input-neo`
component classes) verbatim — the original brief was explicit: **"this is a
structural migration, not a redesign — preserve existing UI, components,
styling, and UX exactly unless technically incompatible."**

**Stage B (explicit user reversal, mid-project):** the user then said,
verbatim, *"read @QuizzX_V2/design_idea/ and then redesign accordingly even
though originally i said not to redesign but i think we should."* Confirmed
via clarifying question that this meant the **entire app**, following the
`design_idea/DesignPhilo.md` 12-section homepage spec closely, with
self-hosted fonts and geometric/SVG illustrations (no photoreal/3D assets).
This fully replaced the neo-brutalist system with what's now in place: warm
cream/parchment surfaces, vivid saturated section colors, large soft radii,
"tactile" card styling — see Section 7 for the complete redesign history,
which went through many further rounds of visual feedback after this initial
pivot (color/contrast passes, emoji-to-SVG-icon conversion, a full arcade-HUD
header, brutalist border pass, and the sidebar-to-dropdown rewrite).

**Net effect for anyone porting a v1 page now:** do **not** try to visually
match v1's neo-brutalist screenshots. Match the *functional behavior*
described in `MIGRATION_AUDIT.md`, but build it in the current (Stage B, and
by now much-iterated) design system described in Section 7.2.

### 5.6 Shared-logic consolidation (fixing v1's cross-cutting duplication)

v1 kept several pieces of logic in sync **by hand across two separate
codebases** (frontend JS, backend JS) — a real source of drift risk the
audit flagged explicitly (audit Section 9). Since v2 unifies frontend+backend
into one TypeScript project, these became genuinely shared modules:
- **Quiz settings shape + defaults + legacy-mode translation** — v1 had this
  logic duplicated three times (server upload defaults, client authoring
  presets, client runtime defaults), all doing the same `mode` →
  `{timer,visibility,...}` translation independently. **v2 fix: `types/quiz.ts`**
  — one `QuizSettings` type, one `DEFAULT_QUIZ_SETTINGS` constant, one
  `normalizeQuizSettings()` function, meant to be imported everywhere instead
  of re-implemented. **This file is written and ready to use**, but nothing
  calls it yet since no quiz-upload or quiz-taking routes/pages exist yet.
- **Answer matching / letter resolution** (v1: `mapAnswerLetter.js`, used in
  4+ places) — not yet ported to v2; flagged as a todo, no `lib/answer-matching.ts`
  exists yet.
  - Open question carried over from the audit: should practice-mode's
    client-side correctness check use the same matching function as real
    grading, or stay intentionally simpler (low-stakes, no score at risk)?
    Not yet decided — flag it when building quiz-taking, don't silently pick.
- **Seeded shuffle** — v1 has one server-only implementation
  (`QuizController.seededShuffle`); just needs porting once, no
  consolidation problem to solve.
- **CSV export helper** — v1 has near-identical CSV-building logic in two
  controllers; worth one small shared helper when building admin/leaderboard
  export routes. Not yet started.

---

## 6. Database Schema

### 6.1 Prisma models (13 total)

`prisma/schema.prisma` — ported from v1's canonical
`server/migrations/001_initial_schema.sql` (the idempotent, currently-correct
migration file; **not** `supabase_schema.sql` or `server/schema.sql`, which
describe the same 14-table shape but are a reference-only DDL dump and a
destructive from-scratch script respectively — see the audit Section 5 for
why `001_initial_schema.sql` is the one to trust).

Models present: `User`, `Team`, `TeamMember`, `Quiz`, `Submission`,
`SubmissionEvent`, `Achievement`, `UserAchievement`, `QuizComment`, `Room`,
`RoomParticipant`, `TeamQuizScore`, `AppSetting`.

**`game_sessions` is intentionally NOT a model** — this is the v1 table
backing the dead `GameController` feature dropped in Section 5.4. The schema
file's own top comment states this explicitly so it doesn't look like an
oversight later.

All models use `@map`/`@@map` to preserve the original snake_case Postgres
column/table names (e.g. `User.clerkId` maps to column `clerk_id`, model
`User` maps to table `users`) — this matters if anyone ever hand-writes raw
SQL or inspects the DB directly; the Prisma-side names are camelCase but the
actual database will use v1's original snake_case naming.

**Known schema-DSL limitation (documented in the schema file's own header
comment):** two partial indexes from the original SQL
(`idx_submissions_completed_score WHERE status='completed'`,
`idx_submission_events_quiz_id`) **cannot be expressed in Prisma's schema DSL**
today. These need a hand-written follow-up SQL migration once `prisma migrate`
has been run for the first time (see 6.2) — not yet done, since no migration
has ever been run.

Field-level things worth knowing:
- `User.role` is a plain string (`"user"`/`"admin"`/`"teacher"` presumably,
  matching v1's role model), not a Prisma enum.
- `Quiz.questions` and `Quiz.settings` are `Json` columns — the actual
  question array and settings object are NOT relational; `types/quiz.ts`'s
  `QuizSettings`/`QuizQuestion` TypeScript interfaces are the intended shape
  for that JSON, enforced only at the application layer, not the DB layer.
- `Submission.attemptNonce` backs v1's replay-protection mechanism (issue a
  nonce on `/submissions/start`, validate + invalidate on final submit).
- `RoomParticipant.score`/`.answers` — v1 had these bolted on via an inline
  runtime migration in `server/index.js` (not in the original
  `001_initial_schema.sql`); v2's schema includes them from the start
  instead of relying on an app-boot patch.

### 6.2 Migration status — DONE (2026-07-22)

**Update, 2026-07-22**: the first migration has been run against the real
Neon instance. `prisma/migrations/` now has two migrations:
- `20260722162259_init` — generated straight from `schema.prisma` (13 tables).
- `20260722162409_partial_indexes_and_seed` — hand-written (created via
  `prisma migrate dev --create-only`, then edited), adds the two partial/
  composite indexes the schema DSL can't express
  (`idx_submissions_completed_score WHERE status='completed'`,
  `idx_submission_events_quiz_id`) plus seed data: 3 `app_settings` rows
  (`leaderboard_visible=true`, `current_season="Spring 2026"`,
  `season_start="2026-01-01"`) and all 7 `achievements` catalogue rows
  (`first_quiz`, `perfect_score`, `streak_3`, `streak_7`, `lockdown_clean`,
  `speed_demon`, `top_3`) — all copied verbatim from v1's
  `server/migrations/001_initial_schema.sql`. Verified directly against the
  live DB (row counts + index names queried via the Prisma client) — see git
  history for the exact migration SQL.

**Gotcha hit and fixed**: the first attempt at the seed migration failed
shadow-DB validation (`P3006`/`23502`, `null value in column "id"`) because
`Achievement.id`'s `@default(uuid())` in `schema.prisma` is a **Prisma
Client-side default only** — it does **not** produce a DB-level `DEFAULT` in
the generated DDL (confirmed by reading the generated `CREATE TABLE
"achievements"` — no default on the `id UUID NOT NULL` column). Raw SQL
`INSERT`s (as used in hand-written migrations) must supply an explicit
`gen_random_uuid()` for any UUID-PK model instead of relying on Prisma to
fill it in — this applies to every model, not just `Achievement`, if anyone
writes a future hand-written data migration.

**Note on the achievement `icon` column**: the seeded values are literal
emoji (`🎯`, `💯`, `🔥`, etc.), copied verbatim from v1 for data fidelity.
This does **not** conflict with the project's "never render emoji in the UI"
rule (Section 13 item 9) — that rule is about UI rendering choices, not
stored data; whichever component eventually displays achievements should map
`slug`/`icon` to a Lucide icon rather than rendering this column directly.

**Still not done**: nothing has consumed this schema yet (no API routes, no
pages read/write these tables) — the DB is now correctly provisioned and
seeded, but otherwise untouched by application code. `npx prisma generate`
was not re-run as part of this (schema.prisma itself didn't change, only
migrations were added) — the existing `lib/generated/prisma` output is still
current.

---

## 7. Landing Page Redesign — Full History

The landing page (`app/page.tsx` + everything under `components/landing/`) is
the only fully-built page in the app, and it went through a long, iterative
back-and-forth with the user. This section exists so a future agent doesn't
have to re-derive *why* the current structure looks the way it does, or
accidentally re-introduce a bug that was already found and fixed once.

### 7.1 Round-by-round summary (chronological, every major pivot)

1. **Original brief**: structural migration only, preserve v1 UI exactly.
   Reversed almost immediately (Section 5.5, Stage A → B).
2. **Redesign kickoff**: full app redesign per `design_idea/DesignPhilo.md`,
   confirmed as "entire app" (not just landing) via clarifying question,
   "follow closely," self-hosted Fontshare fonts (Satoshi/Clash
   Display/General Sans at this point) + geometric/SVG illustrations (no
   photoreal/3D — the agent can't generate images).
3. **First major feedback round** (screenshots of both the new build and the
   units.gr reference site itself): text-on-colored-cards needed to be black
   not white; colors read as "pale," needed brightening/more saturation;
   **never use emoji** — always Lucide SVG icons, and if no good icon exists,
   log a request to a `svg_request.md` file with description + color palette
   for the user to commission (this file existed for one icon — "anime-mask.svg"
   for the Anime category — and was deleted later when that whole section was
   removed, see point 9 below).
4. **Second round**: sidebar nav needed to be **persistent** (not scroll away
   after the hero), consistent spacing, bolder headings, "interactive fun
   elements" (an intro loading screen was added — `IntroLoader.tsx`).
5. **Third round**: marquee repositioning, reduce excess whitespace between
   sections.
6. **Fourth round**: remove 3 social icon circles from the sidebar; improve
   text contrast (opacity bumps across ~10 files); center the marquee's star
   glyph symmetrically between words (was hugging one side due to nested
   asymmetric padding — fixed by flattening to one consistent `gap-8`
   structure).
7. **Fifth+ rounds — the sidebar height-matching saga**: user wanted the
   sidebar narrower, then wanted its nav-card block height to exactly match
   `MosaicHero`'s height and its Sign In button to match `CategoryMarquee`'s
   height. This was solved with CSS Grid `subgrid` row-track matching, which
   **broke sticky positioning** (span-20-rows mistake), got fixed (span-2),
   then **broke again** when the sidebar needed a logo removed and grid
   auto-placement scattered later sections into the freed-up column 1 (fixed
   with explicit `lg:col-start-2` on every section). This entire saga (and
   its eventual abandonment in favor of a dropdown) is written up in full,
   blow-by-blow, in Section 7.4 — it's the single most bug-prone piece of
   this whole project and worth reading in full before touching sidebar/nav
   layout again.
8. **"Brutalist theme" pass**: bumped every card/panel border from a
   near-invisible `border-black/[0.06]` hairline to a bold `border-2
   border-ink` — see the Tailwind cascade-layer gotcha in Section 4.4 for the
   bug this caused (one card's explicit low-opacity border override silently
   winning over the new shared bold-border style).
9. **CategoryGrid section fully removed** — the "Pick your arena" horizontal
   category-scroller section was deleted entirely per explicit user request
   ("no horizontal scrolling"). `components/landing/CategoryGrid.tsx` was
   deleted, its sidebar nav entry and `svg_request.md` (which only existed
   for that section's Anime icon) were removed too.
10. **TopHUD built** — the bare "QuizzX — Gamified Quiz Platform" title was
    replaced with a full arcade-machine-dashboard-style header
    (`components/landing/TopHUD.tsx`): live pulse indicator + animated
    player counter, season badge, pixel wordmark with a blinking terminal
    cursor, tagline, animated XP progress bar, status chips (Trophy/Bot/
    Zap/Flame icons). This is also where **Geist Pixel + Anek Devanagari**
    fonts were introduced (Section 4.5) — explicitly applied **sitewide**,
    not just to the HUD, per user choice among 3 offered options.
11. **Zoom-related layout bug found and fixed**: at 110%/125% browser zoom
    the hero/HUD no longer fit the viewport and looked broken. Root cause:
    fixed `px`/`rem` sizes don't shrink with browser zoom, but the viewport
    (in CSS pixels) does, so fixed-size content eats a growing share of the
    screen as zoom increases. **Fix: `clamp(min, Ndvh, max)` on the biggest
    vertical-space consumers** (MosaicHero's 5 card min-heights, TopHUD's
    padding/gaps/wordmark size, CategoryMarquee's padding) — ties them to a
    *proportion* of viewport height instead of a fixed size, which is
    zoom-invariant. This is a generally-useful technique, not landing-page-specific
    — remember it for any future "must fit above the fold" requirement.
12. **Sidebar → dropdown menu rewrite** (see Section 7.4 for the full why).
13. **Post-dropdown cleanup**: `LeaderboardPreview` and `FAQ` still had
    `max-w-4xl mx-auto lg:mx-0` / `max-w-3xl mx-auto lg:mx-0` wrappers from
    the old sidebar-reserved-column layout — once the sidebar stopped
    reserving a column, `lg:mx-0` pinned them to the left with a large dead
    zone on the right. Fixed by removing the width caps entirely so they
    expand to fill their panels like every other section.
14. **`AuthCTA.tsx` added**: top-right, beside the dropdown's Menu trigger.
    Logged-out: Sign In + Get Started buttons (mirrors `LandingNav`'s
    existing mobile pattern). Logged-in: Clerk's real `<UserButton/>` (first
    place in the app using an actual avatar photo rather than the generic
    icon `AppNav.tsx` uses) + a "Start a Quiz" link to `/quizzes`. **Caveat,
    flagged to the user but not resolved**: `app/page.tsx` currently
    `redirect()`s any signed-in user to `/dashboard` before they ever see
    this page, so the logged-in branch is implemented correctly but
    currently **unreachable** in practice. Whether to loosen that redirect
    is an open question (Section 15).

### 7.2 Design system tokens (current state, `app/globals.css`)

Full `@theme inline` block:
- **Surfaces**: `--color-cream: #f2e8d3`, `--color-cream-alt: #ecdfc2`,
  `--color-cream-deep: #e3d3ac` (warm aged-paper tones, chosen specifically
  to read as less "flat/plain" than a pure off-white — plus a subtle SVG
  `feTurbulence` grain texture on `body` for the same reason),
  `--color-ink: #14120f`, `--color-white: #ffffff`.
- **Section colors** (each landing section owns one dominant color; also now
  reused as color-coded sidebar-dropdown pill colors, Section 7.4):
  `--color-blue: #2e5bff` (+ `-deep: #1435c4`), `--color-yellow: #ffd200`
  (+ `-deep: #e6b800`), `--color-coral: #ff4b36` (+ `-deep: #e6341f`),
  `--color-orange: #ff9500` (+ `-deep: #e68500`), `--color-purple: #8b5cf6`
  (+ `-deep: #6d3fd9`), `--color-green: #22c55e` (+ `-deep: #169447`). These
  were explicitly brightened/re-saturated once already, after user feedback
  that earlier values read as "pale" next to the units.gr reference.
- **Radii**: `--radius-card: 32px`, `--radius-card-sm: 24px`,
  `--radius-btn: 18px`, `--radius-chip: 999px` (fully round).
- **Fonts**: see Section 4.5. Token names: `--font-display` (Geist Pixel),
  `--font-sans` (Anek Devanagari), `--font-accent` (Satoshi).
- **Editorial display type scale**: `--text-display-{sm,md,lg,xl,2xl}` from
  40px to 72px, each with a matched `--line-height` token.
- **Shadows**: `--shadow-tactile` (default card shadow), `--shadow-tactile-sm`
  (smaller variant), `--shadow-tactile-lift` (hover-state, more dramatic).
- **Animations**: `--animate-marquee` (28s linear infinite scroll),
  `--animate-blink` (1s step terminal cursor, added with TopHUD).
- **`@layer components` classes** (the shared visual vocabulary — use these,
  don't reinvent): `.card-tactile` (base card unit — bg-cream-alt, 32px
  radius, bold 2px ink border, tactile shadow, lift-on-hover), `.btn-tactile`
  (pill button with a 3D "springy press" box-shadow effect), `.chip` (small
  rounded pill label), `.input-tactile` (form input styling).

### 7.3 Component map — `components/landing/`

| File | Purpose / current state |
|---|---|
| `Reveal.tsx` | Shared scroll-reveal wrapper (Framer `whileInView`, used by nearly every section) |
| `TopHUD.tsx` | Arcade-dashboard header — see 7.1 point 10. Uses `dvh`-clamp sizing throughout (7.1 point 11) |
| `SidebarNav.tsx` | **Now a dropdown menu**, not a persistent rail — see 7.4 for why. Sticky "Menu" trigger button + full-screen blurred overlay with 8 color-coded section-jump pills + Sign In |
| `AuthCTA.tsx` | Top-right auth CTA beside the Menu trigger — see 7.1 point 14 |
| `MosaicHero.tsx` | Opening asymmetric bento-card hero (replaces a conventional centered hero). 5 cards: headline (coral), illustrated quiz-session mockup (blue), Fair Play info (yellow), Team Battles info (purple), illustrated rank card (ink/dark). Card min-heights use `dvh`-clamp (7.1 point 11) |
| `CategoryMarquee.tsx` | Infinite CSS-animation scrolling category ticker on an ink background. Star glyph centered symmetrically between words (7.1 point 6) |
| `FeatureMosaic.tsx` | 6-card bento feature grid; the Achievements card spans the full row width (`sm:col-span-3`) to avoid a dead-space bug found when it only spanned 2 of 3 columns |
| `LiveStats.tsx` | Animated counters (Framer `animate()` + `useInView`) — numbers were deliberately made "believable" (tens of thousands, not millions) after user feedback that the originals looked absurd for an early-stage product |
| `BattleMode.tsx` | Team-vs-team split layout; Team Blue card is blue, Team Gold is yellow/gold (explicitly fixed after they were both neutral colors) |
| `AIAssistant.tsx` | AI quiz-generation pitch section, purple panel, floating mock chat-prompt bubbles |
| `AchievementGallery.tsx` | 7-badge grid with hover-triggered confetti burst (this IS an intentional interaction animation, not one of the "idle loop" animations that got removed elsewhere) |
| `LeaderboardPreview.tsx` | Top-5 rank list; top-3 rows get a real gold/silver/bronze metallic gradient with a CSS shimmer sweep (`.rank-gold/-silver/-bronze` in globals.css), not a flat tint |
| `Testimonials.tsx` | 4 quote cards — names are Indian (explicit user request), 2 of 4 are professors (also explicit) |
| `FAQ.tsx` | Accordion, wrapped in its own blue color panel (previously sat directly on page background — fixed per "no section should touch raw background" feedback) |
| `SiteFooter.tsx` | Large branded footer — ink background, floating decorative squares, email capture form (fixed from a translucent barely-visible input to a solid one with proper vertical text centering) |

**Idle-animation removal note**: several small icon animations that looped
forever (Trophy bouncing, AI bot floating, Battle Mode team-card swaying,
swords pulsing) were **removed entirely** per explicit feedback that "random
animations on emojis/icons" (the user's term, even though these are SVG icons
not emoji) aren't wanted. What was kept: purposeful interaction animations
(hover states, the AchievementGallery confetti burst, scroll-triggered
reveals) and a small set of deliberate "alive" indicators added later in
TopHUD (LIVE pulse dot, blinking cursor, animated counters, animated XP bar)
— the distinction that matters is **purposeful/interaction-triggered vs.
idly-looping-forever-with-no-purpose**, not "no animation at all."

### 7.4 The sidebar saga — full postmortem (read before touching nav layout)

The sidebar/index-nav went through **five distinct architectures** before
landing on a dropdown. Recorded in detail because each abandoned approach
failed for a specific, non-obvious CSS reason worth knowing in advance:

1. **Persistent left rail, height matched to Hero+Marquee via CSS Grid
   `subgrid`, spanning `grid-row: 1 / span 20`.** Intent: make it "always
   sticky, never scrolls away." **Broke `position: sticky` entirely** — the
   root cause (a genuinely useful, non-obvious CSS fact): **`position: sticky`
   only has room to visually "float" an element that is *shorter* than its
   containing block.** Spanning 20 rows made the aside's own box stretch to
   ≈ the full page height, leaving zero slack for sticky to do anything —
   it just scrolled normally. **Extra side effect**: CSS Grid places a
   `row-gap` between *every* adjacent row-track pair, including phantom
   empty ones beyond real content — spanning 20 rows when only ~12 existed
   padded extra blank space onto the bottom of the whole page.
2. **Fixed to `grid-row: 1 / span 2`** (just Hero+Marquee) — restored sticky
   correctly (verified via multiple scroll-depth checks), but this freed up
   grid column 1 for auto-placement starting at row 3, and CSS Grid's
   auto-placement algorithm then **scattered every later section between
   both columns** in a zigzag (a severe visual bug the user caught: "you
   broke stuff," giant overlapping mismatched color blocks). **Fix: explicit
   `lg:col-start-2` on every section past row 2** — never rely on grid
   auto-placement once any sibling has an irregular explicit span; always
   give every item an explicit column.
3. **Extended the nav from 3 items to 8 (one per section) to fill the
   leftover empty column-1 space below "Sign In"** — filled some of the gap,
   but a fixed natural-content height still didn't adapt to different
   viewport sizes/scroll depths, so a large gap remained on longer pages.
4. **`height: calc(100dvh - X)` + `flex-1` pills to force-fill the full
   viewport height** — eliminated the gap while scrolled into the page, but
   introduced a **new** bug: at the very top of the page (before you've
   scrolled far enough for `position: sticky` to actually engage), the
   element sits at its *natural* flow position (below TopHUD, empirically
   measured ≈ 240px down), not at `top: 6px` — a height sized for the latter
   overflowed the viewport in the former ("Menu... cuts off... a mess" per
   user report). There is **no single static CSS height value that's exactly
   correct in both the "stuck" and "natural" positions** (they differ by
   TopHUD's height) — this was patched with a generous fixed buffer subtracted
   from the height (accepting a bounded, non-zero gap once actually stuck, in
   exchange for zero overflow at the top), but it was a compromise, not a
   real fix.
5. **User's own proposal, adopted: convert to a dropdown menu** (small sticky
   "Menu" trigger button + full-screen backdrop-blurred overlay, same 8
   color-coded pills + Sign In inside, click-to-navigate auto-closes it).
   **This sidesteps every single problem above** — a dropdown only needs to
   size itself once, while open, with nothing else on the page to coordinate
   heights/rows/columns against. The page layout was simplified back to a
   single-width column (no more sidebar-reserved grid column at all) as part
   of this change.

**Lesson for next time a "persistent sidebar" request comes in**: seriously
consider whether it needs to be persistent at all, or whether a
trigger-button-plus-overlay pattern satisfies the actual underlying need
("always able to navigate quickly") with far less CSS fragility. If a
persistent rail is truly required, do not use CSS Grid subgrid + a fixed
row-span to try to match its height to unrelated sibling content — that
combination is what caused bugs 1–3 above.

---

## 8. Feature Migration Checklist (condensed from MIGRATION_AUDIT.md)

This is a summary for orientation. **For exact route paths, request/response
shapes, and old-code line references, read `../MIGRATION_AUDIT.md` directly**
— it has per-endpoint checkboxes already.

### 8.1 Pages/routes — ALL BUILT (2026-07-22)

**Every application page now exists.** This was the single biggest gap in
the project as of this morning (0 of 12 non-landing/auth pages); all 12 were
built in one session, in strict numerical phase order per explicit user
instruction (see `feedback_phase_order_strict` in this agent's cross-session
memory — always work the lowest-numbered incomplete phase next).

| Route | Built in v2? |
|---|---|
| `/` (landing) | **Yes** — extensively iterated, see Section 7 |
| `/login`, `/register` | **Yes** — Clerk catch-all routes exist |
| `/dashboard` | **Yes** — `app/(protected)/dashboard/page.tsx`, Server Component reading Prisma directly via `lib/dashboard-data.ts`. Achievement grid renders from the real DB catalogue (7 rows) rather than v1's hardcoded client-side `ACHIEVEMENT_DEFS` array, which had drifted to reference two keys (`quiz_10`, `speedster`) not in the seeded catalogue — a v1 bug, not preserved. |
| `/quizzes` | **Yes** — `app/(protected)/quizzes/page.tsx`, Client Component, 15s poll + `visibilitychange` pause ported 1:1. |
| `/quiz/:id` | **Yes** — `app/(protected)/quiz/[id]/page.tsx` (thin Server shell) + `components/quiz/QuizClient.tsx` (the full ~770-line v1 state machine) + `hooks/useQuizCheating.ts` + `components/quiz/{AntiCopy,QuizTimer,QuestionCard,RulesScreen,PinGateModal,WatermarkOverlay}.tsx`. Uses `types/quiz.ts`'s `normalizeQuizSettings()` instead of re-deriving the legacy-`mode` translation a third time. Added a real "already completed" screen — v1's 403-completed response left `showRules`/`submitted` in a state that fell through every branch to a confusing empty-quiz render (0 questions, a "Submit Final Answers" button) rather than crashing; not a deliberate v1 screen, so not reproduced. |
| `/quiz/:id/results` | **Yes** — `app/(protected)/quiz/[id]/results/page.tsx` + `components/quiz/ResultsClient.tsx`. v1 passed result data via React Router `location.state`; Next.js has no equivalent, so `QuizClient` stashes the same payload in `sessionStorage` (`quiz_result_${id}`) and this page reads that first, falling back to URL params (for shared-link opens) exactly like v1's own fallback. |
| `/leaderboard` | **Yes** — `app/(protected)/leaderboard/page.tsx` + `components/leaderboard/LeaderboardClient.tsx` + `hooks/useLeaderboardStream.ts` (replaces Socket.IO per Section 5.1). Real finding while building this: v1's SSE broadcast (`lb.broadcast(quizId, {type:'new_submission', quizId, score})`) only ever sent a lightweight ping, never the full rankings array — unlike the Socket.IO `leaderboard:update` event it was meant to parallel. So the hook only signals "something changed"; the page's existing REST fetch re-runs on that signal. This also **removes** v1's "SSE data only applies for individual+global mode" caveat entirely, since every filter combination now just refetches via REST. |
| `/team` | **Yes** — `app/(protected)/team/page.tsx`. |
| `/admin` | **Yes** — `app/(protected)/admin/page.tsx` + `components/admin/{QuizManager,QuizUploader,DailyChallengePanel}.tsx` (all three shared with `/teacher`). `QuizUploader`'s AI-generate tab is fully implemented (calls `/api/ai/generate-quiz`) per explicit user instruction to build AI features now even though `GROQ_API_KEY`/`NVIDIA_NIM_API_KEY` aren't configured yet (user will add both "at the very end"; R2 likewise deferred, see Section 9/15). |
| `/admin/proctor/:quizId` | **Yes** — `app/(protected)/admin/proctor/[quizId]/page.tsx` + `components/admin/ProctorClient.tsx`. Same-origin simplification: v1 needed a `?token=` query-param workaround because its `EventSource` call was cross-origin (separate Vite frontend); this app is same-origin so the Clerk session cookie rides along automatically — no token plumbing needed. |
| `/teacher` | **Yes** — `app/(protected)/teacher/page.tsx`, reuses `QuizUploader`/`DailyChallengePanel`. Client-side-only role gate ("Access Denied" unless `role` is `teacher`/`admin`) ported as-is — v1's own real gap (no server-side enforcement) isn't fixed here, that belongs in Phase 3's route handlers. Added a "Teacher" link to `AppNav` (visible for `teacher`/`admin`) since it was missing entirely — the audit documents `/teacher` as a real route but v1's own `Layout.jsx` nav never linked to it either. |
| `/profile` | **Yes** — `app/(protected)/profile/page.tsx`, Server Component using `lib/profile-data.ts` (new: `getStreakCalendar`, `getMyTeam`) plus `getRecentSubmissions`/`getMyAchievements` reused from `lib/dashboard-data.ts`. Unifies on `lib/xp.ts`'s 200-XP/level formula rather than v1's own separate `XP_PER_LEVEL=100` constant on this specific page — that was real v1 drift (Dashboard used 200 on the same account), not an intentional per-page difference. |
| `/live`, `/live/:code` | **Yes** — `app/(protected)/live/page.tsx` (create-lobby form, its own route now rather than a no-`code` branch of one component) + `app/(protected)/live/[code]/page.tsx` + `components/live/LiveLobbyClient.tsx` (host/participant views). |
| `/live/:code/display` | **Yes** — `app/(presenter)/live/[code]/display/page.tsx` + `components/live/PresenterClient.tsx`, in a **new route group** `app/(presenter)/` with its own `layout.tsx` (auth-gated, but deliberately no `AppNav`/padding — this view needs to fill an entire projector/TV screen, which the normal `(protected)` shell can't do). Route groups don't affect URL structure, so `(presenter)/live/[code]/display` and `(protected)/live/[code]` coexist fine as siblings under the same `/live/...` URL space. |

`app/(protected)/layout.tsx` (the auth-gate shell + `AppNav`) wraps all of the
above as originally scaffolded — no changes needed there beyond adding the
Teacher nav link mentioned above.

**Architectural pattern used throughout, worth knowing before touching any of
these pages**: pages needing only read-only *initial-render* data (dashboard,
profile) are Server Components calling Prisma directly via small `lib/*-data.ts`
helper modules — **not** self-fetches to `/api/*`, since Next.js Server
Components can query the DB directly and a same-process HTTP round-trip would
be pure overhead. Pages needing genuine client-side interactivity (polling,
mutations, form submits, SSE) are Client Components calling `/api/*` routes
that **don't exist yet** (Phase 3) — those calls are written against the exact
response shapes `MIGRATION_AUDIT.md` documents for each v1 endpoint, so they
activate with zero changes once Phase 3 implements the matching route. Several
pages mix both: a Server Component page passing server-fetched props into a
small Client Component for just the interactive slice (e.g. `/dashboard`'s
`DraftsSection`, which needs `localStorage`).

### 8.2 API endpoints — ALL BUILT (2026-07-23)

v1 has these route groups (audit Section 4, full request/response detail
there): `/quizzes` (7 endpoints), `/admin` (14 endpoints), `/ai` (4
endpoints), `/leaderboard` (4 endpoints incl. SSE), `/proctor` (2 endpoints),
`/rooms` (5 endpoints), `/submissions` (5 endpoints, including the ~7-step
grading transaction with achievement rules), `/teams` (4 endpoints), `/users`
(8 endpoints). `/game` is explicitly dropped (Section 5.4). **Every one of
these now exists under `app/api/...`**, dropping the `/api/v1` prefix per
Section 5.3, verified with `npm run build` (all ~43 routes compile) and a
runtime smoke test (curled several against a live `next dev` instance — all
correctly returned 401 unauthenticated rather than crashing).

Notable implementation decisions made while building this phase:
- **Direct Prisma in Route Handlers, not raw `pg`** — every route uses
  `lib/prisma.ts`, reusing `lib/dashboard-data.ts`/`lib/profile-data.ts`
  functions where a Phase 2 Server Component already needed the same query
  (e.g. `/api/users/me/achievements` just calls `getMyAchievements()`).
- **New shared server-only libs** added for logic the audit flagged as
  duplicated across 3+ v1 controllers (Section 9's original finding):
  `lib/answer-matching.ts` (`mapAnswerLetter`/`normalizeAnswer`/`letterOf`/
  `isAnswerMatch` — used by `/api/submissions`, `/api/rooms/:code/answer`,
  `/api/admin/quizzes/:id/analytics`, `/api/ai` question remapping),
  `lib/seeded-shuffle.ts` (`GET /api/quizzes/:id`'s pool/shuffle logic),
  `lib/csv-response.ts` (shared CSV response builder, used by
  `/api/leaderboard/export` and `/api/admin/quizzes/:id/integrity`),
  `lib/team-helpers.ts` (leave/promote/delete-team logic shared across the 3
  team-mutation routes), `lib/ai-clients.ts` (NIM/Groq OpenAI-compatible
  clients + the shared `generateQuestions` used by both
  `/api/ai/generate-quiz` and `/api/admin/daily-challenge`),
  `lib/quiz-parser.ts` (the `.md`/`.txt` quiz-document parser),
  `lib/leaderboard-broadcast.ts` (in-process SSE fan-out registry).
- **Socket.IO's outbound pushes replaced with the SSE broadcast**, not
  dropped silently: `RoomController.answerQuestion`/`endRoom` used to emit to
  the leaderboard page's Socket.IO room; `/api/rooms/:code/answer` and
  `/api/rooms/:code/end` now call `broadcastLeaderboardUpdate()` (the same
  function `/api/submissions` uses), so any open `/leaderboard` page's SSE
  connection still gets nudged to refetch when room scores change.
- **`lib/leaderboard-broadcast.ts` is in-process only** (a `Map`, no Redis
  pub/sub) — correct for single-instance hosting, but a submission handled
  by one server instance won't reach an SSE connection held by another
  instance in a multi-instance/serverless deployment. Flagged in the file's
  own header comment; revisit with Redis pub/sub if/when this app runs as
  more than one instance (Redis still isn't provisioned — Section 11).
- **Two new dependencies installed**: `bcryptjs` (PIN hashing/verification —
  matches v1's own choice of the pure-JS bcrypt implementation) and
  `mammoth` + `openai` (docx text extraction; NIM/Groq clients).
- **Rate limiting was NOT ported** (v1 had `apiLimiter`/`pinLimiter`/
  `commentLimiter`/`submitLimiter`/`aiLimiter` via `express-rate-limit`) —
  proper distributed rate limiting needs Redis for correctness across
  serverless instances, and Redis isn't provisioned yet; an in-memory-only
  limiter would work for single-instance hosting but wasn't built this pass.
  Flagged as a real gap, not forgotten.
- **`/api/admin/quizzes/:id/clone` exists but nothing calls it** — ported for
  REST parity anyway since v1's own `QuizManager.jsx` never wired up a clone
  button either (confirmed in the audit) — a pre-existing v1 dead endpoint,
  not something this port introduced.

The auth-sync logic that v1 ran as middleware before every protected request
(`authMiddleware.js`: look up by `clerk_id` → fall back to lookup-by-email +
backfill → else create a new user with a generated username/user_code,
collision-retried) **has already been ported** — see `lib/auth.ts`'s
`getCurrentUser()`. New for Phase 3: `lib/api-auth.ts`'s
`requireApiUser()`/`requireApiAdmin()`/`requireApiTeacherOrAdmin()` are the
Route Handler equivalent of v1's `authMiddleware`/`adminMiddleware` — called
at the top of every route instead of centralized middleware (consistent with
`proxy.ts` staying auth-logic-free, Section 4.2).

### 8.3 Cross-cutting shared logic — status

- Quiz settings type + normalization: **done** (`types/quiz.ts`), consumed by
  `/quiz/:id` (`QuizClient.tsx`), `/admin`+`/teacher`'s `QuizUploader.tsx`,
  and now also `/api/admin/quizzes/upload`+`/api/admin/quizzes/create`.
- Answer matching / letter resolution: **done** (`lib/answer-matching.ts`,
  2026-07-23) — used by `/api/submissions`, `/api/rooms/:code/answer`,
  `/api/admin/quizzes/:id/analytics`. The Section 5.6 open question (should
  practice-mode's client-side check use this too?) is still **not decided**
  — `QuestionCard.tsx` still does the simple `option === q.answer` exact
  match, unchanged.
- Seeded shuffle: **done** (`lib/seeded-shuffle.ts`, 2026-07-23) — used by
  `GET /api/quizzes/:id`.
- CSV export helper: **done** (`lib/csv-response.ts`, 2026-07-23) — used by
  `/api/leaderboard/export` and `/api/admin/quizzes/:id/integrity`.
- **New shared modules added while building Phase 2** (2026-07-22):
  - `lib/xp.ts` — `XP_PER_LEVEL`/`getLevel`/`getLevelProgress`, used by both
    `/dashboard` and `/profile`. Fixed real v1 drift: `ProfilePage.jsx` had
    its own separate `XP_PER_LEVEL=100` while `DashboardPage.jsx` used 200 —
    same user's level would render differently on the two pages. Unified on
    200 (Dashboard's value) rather than preserving the inconsistency.
  - `lib/achievements.ts` — `ACHIEVEMENT_ICONS`/`ACHIEVEMENT_LABELS` (slug →
    Lucide icon/label), extracted from what used to be private to
    `Toast.tsx`; now also used by `/dashboard` and `/profile`'s achievement
    grids. Values unchanged, just relocated so a third use site doesn't
    duplicate the map.
  - `lib/dashboard-data.ts` — `getRecentSubmissions`, `getMyAchievements`,
    `getWeakTopics`, `getFeaturedQuiz`, `getDailyQuizForUser`. Used by both
    `/dashboard` and (the first two) `/profile`.
  - `lib/profile-data.ts` — `getStreakCalendar`, `getMyTeam`, used by
    `/profile` only so far.

---

## 9. Known Issues / Things Actively NOT Working

- ~~Client-side `/api/*` calls could surface raw JSON-parse errors~~ **Fixed
  2026-07-23** — since `/api/*` doesn't exist yet, an un-guarded `res.json()`
  on Next's HTML 404 body threw `Unexpected token '<', "<!DOCTYPE "... is not
  valid JSON` straight into toasts (user hit this on the profile
  username-save form and the team create/join/leave forms). Added
  `lib/api-client.ts` (`apiFetch`/`apiFetchBlob`/`errorMessage`) — checks
  `res.ok`/content-type before parsing, throws a clean `ApiError` with a
  friendly message instead. Swept every client component doing `/api/*`
  fetches to use it (team, profile, admin + its 3 sub-components, quizzes,
  quiz-taking, results, leaderboard, proctor, teacher, live lobby, presenter,
  create-lobby). See `feedback_graceful_error_handling` in this agent's
  cross-session memory — this pattern is now the standing default for any
  new client-side fetch in this project, not just these call sites.
- ~~Leaderboard had a "Campus" scope toggle with no real data behind it~~
  **Fixed 2026-07-23** — the project has no college/university integration,
  so campus scope was dead UI. Removed entirely (always implicitly global
  now); also removed the auto-select-first-live-quiz behavior — the user
  must explicitly pick a quiz from the dropdown before any leaderboard
  content renders (a "Select a quiz above" prompt shows until they do). A
  `quizId` passed via URL (e.g. the results page's "View Leaderboard" link)
  still pre-selects one.
- ~~Admin's "Upload Answer Key" panel only used half the page width~~ **Fixed
  2026-07-23** — it was wrapped in a `grid lg:grid-cols-2` with only one
  child (a v1 bug, ported faithfully then caught by the user) — now a normal
  full-width section with its form fields laid out in an internal 2-column
  grid instead.
- **Clerk `<UserButton/>`'s dropdown is slow on first click** — this is
  inherent to Clerk's SDK architecture (the trigger renders immediately, but
  the popover UI is fetched as a separate chunk on first interaction, not
  preloaded with the initial page bundle), not a bug in this app's code —
  confirmed by checking installed `@clerk/nextjs`/`@clerk/shared` types for
  any preload option (none exists). Added one concrete, low-risk mitigation
  (2026-07-23): `lib/clerk-frontend-api.ts` decodes the Clerk publishable key
  to get the Frontend API host, and `app/layout.tsx` emits
  `<link rel="preconnect">`/`dns-prefetch` for it, warming the DNS+TLS
  handshake ahead of the first click. This won't eliminate the delay (the
  chunk itself still has to download), just shave the connection-setup part
  off it — flagged to the user as a partial fix, not a full one.
- ~~No application pages exist beyond the landing page and auth.~~ **Fixed
  2026-07-22** — all 12 application pages built, see Section 8.1.
- ~~No API routes exist at all.~~ **Fixed 2026-07-23** — all ~43 `/api/*`
  routes built, see Section 8.2. **The app should now be functionally
  complete end-to-end** for the first time (dashboard → browse quizzes →
  take a quiz → submit → results → leaderboard; team create/join; admin/
  teacher quiz upload+AI-generate+publish; live lobby + presenter) — this
  has not yet been exercised end-to-end with real data by anyone (no manual
  QA pass done yet, no automated tests exist — Phase 6 Verification is still
  "not started"). Treat as "should work," not "confirmed working," until
  actually clicked through.
- ~~Database schema has never been migrated to a real database.~~ **Fixed
  2026-07-22** — see Section 6.2. Migrated + seeded; now consumed by both the
  Server Component pages (`/dashboard`, `/profile`) and every `/api/*` route.
- ~~No seed data~~ **Fixed 2026-07-22** — see Section 6.2.
- **Cloudflare R2 setup deliberately deferred** (2026-07-22) — the user has
  no credit card/PayPal/Apple Pay (India, UPI-only), and Cloudflare requires
  a payment method on file even for R2's free tier. Decision: skip storage
  entirely for now rather than force a workaround, since per Section 5.2 it's
  a **new capability**, not something replacing existing migrated
  functionality — nothing else is blocked by its absence. Revisit later via
  either (a) a UPI-funded virtual Visa/Mastercard (Niyo Global, Scapia,
  Jupiter, etc. — issued against Indian bank accounts, usable for Cloudflare
  billing verification), or (b) a card-free storage alternative (e.g.
  Supabase Storage) if picked instead of R2 — no storage code has been
  written yet either way, so the provider choice is still fully open.
- ~~`AuthCTA.tsx`'s signed-in branch is currently unreachable~~ **Resolved
  2026-07-22** — see Section 15 item 1. The user removed `app/page.tsx`'s
  signed-in redirect entirely (manual edit, reviewed); `AuthCTA`'s logged-in
  branch is reachable now, and landing CTAs route through the new
  `SmartCTAButton` instead of hardcoding `/register`.
- **Two dead font families still downloaded**: `clash-display-*.woff2` and
  `general-sans-*.woff2` sit in `app/fonts/` and are declared in `lib/fonts.ts`
  but no CSS token references them anymore since the Geist Pixel/Anek
  Devanagari swap (Section 4.5). Harmless, but dead weight if anyone's
  auditing bundle size.
- **`svg_request.md` no longer exists** — it was created once (for an Anime
  category icon) and deleted when that whole section (`CategoryGrid.tsx`)
  was removed. If a future icon genuinely has no good Lucide equivalent, the
  process (log name + description + color palette to a new `svg_request.md`
  for the user to commission) is still the expected pattern — just re-create
  the file when actually needed.
- **R2/Groq/NVIDIA NIM/Redis integrations are 100% unimplemented** — env var
  slots exist in `.env.local.example` (all currently empty in the real
  `.env.local` too, see Section 11), no SDKs installed, no code calls any of
  them. Don't assume any AI-generation or file-upload code path exists.
- **No tests of any kind** — no Jest/Vitest/Playwright config, no test
  files. v1 had some (`k6` load tests, a gated Playwright spec, a gated
  Supertest spec) but none were ever wired into CI even there, and none have
  been ported.
- ~~Nothing is committed to git except the original scaffold~~ **Partially
  fixed 2026-07-22** — see Section 14. A second commit now covers the DB
  migration, `/dashboard`+`/quizzes`, and the user's manual auth/design
  fixes. The remaining 10 Phase 2 pages built later in the same session
  (quiz-taking through presenter view) are **not committed yet** — confirm
  with the user before committing further rather than assuming continued
  work should be auto-committed.
- **The user has explicitly said not to use Playwright/headless-browser
  tooling for self-initiated UI verification** (memory: `feedback_no_playwright_visual_checks`)
  — default to `npm run build` + code review; the user does their own manual
  visual checks. (There was a temporary exception granted mid-project after a
  build-passing-but-visually-broken incident, then explicitly revoked again
  — treat "don't use it" as the standing default unless the user says
  otherwise in the moment.)
- **No rate limiting on any `/api/*` route** — v1 had 5 different limiters
  (general/PIN/comments/submissions/AI). Not ported (Section 8.2) — needs
  Redis for correctness across serverless instances, which isn't provisioned.
- **SSE leaderboard updates only fan out within a single process** —
  `lib/leaderboard-broadcast.ts` is an in-memory `Map`, not Redis pub/sub
  (Section 8.2). Fine for single-instance hosting; a submission on one
  instance won't reach an SSE listener connected to a different instance.

---

## 10. Phase Status (against the original 6-phase migration brief)

The original brief structured the migration as 6 phases:

- **Phase 0 — Audit**: **Done.** `MIGRATION_AUDIT.md` (605 lines) is the
  deliverable, covers every route/component/table/endpoint in v1.
- **Phase 1 — Scaffold**: **Mostly done.** Next.js 16 project created, Clerk
  wired up (`proxy.ts`, `ClerkProvider`, login/register pages), Prisma schema
  written (13 models), design tokens established (though later fully replaced
  per Section 5.5 Stage B — the *scaffolding mechanism* for tokens is done,
  the *specific tokens* have moved on from what Phase 1 originally produced).
  **Not done**: actual `prisma migrate` run (Section 6.2).
- **Phase 2 — Frontend**: **DONE (2026-07-22).** Landing page (Section 7)
  plus all 12 application pages — see Section 8.1 for the full per-page
  breakdown. Every page renders and is UI-complete; most are functionally
  inert until Phase 3 builds the `/api/*` routes they call.
- **Phase 3 — Backend**: **DONE (2026-07-23).** All ~43 `/api/*` Route
  Handlers built across all 9 route groups — see Section 8.2 for the full
  breakdown, new shared libs, and known gaps (no rate limiting, in-process-only
  SSE fan-out).
- **Phase 4 — Auth**: **Mostly done.** The "is anyone signed in" layer
  (`lib/auth.ts`, `app/(protected)/layout.tsx`) plus every Phase 3 route now
  calls `lib/api-auth.ts`'s `requireApiUser()`/`requireApiAdmin()`/
  `requireApiTeacherOrAdmin()` — so server-side role enforcement **is** in
  place for the API now (this was the main "not done" item as of Phase 2's
  completion, and it's resolved as a side effect of building Phase 3
  correctly). `/teacher`'s own page-level role gate is still client-side-only
  (Section 8.1) — low-stakes since the actual data-fetching routes it calls
  are now properly gated regardless of what the page itself shows.
- **Phase 5 — Database/Storage**: **DB migrated + seeded** (Section 6.2,
  done 2026-07-22). **R2 storage: deliberately deferred**, not just
  "not started" — see Section 9 (no payment method available; revisit once
  one exists or an alternative provider is chosen).
- **Phase 6 — Verification**: **Not started — this is the next thing to work
  on.** The app should now be functionally complete end-to-end for the first
  time, but nothing has actually been clicked through with real data yet, and
  `MIGRATION_AUDIT.md`'s per-endpoint/per-page checkboxes are all still
  unchecked. No automated tests exist either.

**Bottom line for a new agent**: work Phase 6 next (verification) — strictly
in numerical phase order per standing instruction (see
`feedback_phase_order_strict` in this agent's cross-session memory). That
means: get real env values in for Groq/NVIDIA (R2 stays deferred), run
`prisma db seed`-equivalent test data through the actual flows (sign up →
upload/AI-generate a quiz → publish → take it → submit → check leaderboard →
try team/live-lobby), and work through `MIGRATION_AUDIT.md`'s checkboxes
against what's actually observed, fixing whatever doesn't match rather than
building anything new.

---

## 11. Environment & Credentials Status

`.env.local` exists and is gitignored (confirmed `.gitignore` has `.env*`
with a `!.env.local.example` exception, correctly configured). Checked
presence (not values, to avoid leaking secrets into this file):

| Variable | Status |
|---|---|
| `DATABASE_URL` (Neon pooled) | **Populated** (real value) |
| `DIRECT_URL` (Neon direct/unpooled, for migrations) | **Populated** (real value) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | **Populated** (real Clerk test-mode keys) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `..._SIGN_UP_URL` | Set to `/login` / `/register` |
| `ADMIN_EMAILS` | Populated (one address, auto-promotes to `role='admin'` on sign-in) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_PUBLIC_URL` | **Empty** — R2 not provisioned yet |
| `GROQ_API_KEY` | **Empty** — not provisioned yet |
| `NVIDIA_NIM_API_KEY` | **Empty** — not provisioned yet |
| `REDIS_URL` | **Empty** — optional, falls back to in-memory/single-instance behavior when unset |
| `LOG_LEVEL` | Set (`info`) |

**Caution for anyone editing `.env.local.example`**: at time of writing it
contains what appear to be **real Clerk test-mode key values**, not
placeholders — worth flagging to the user whether that was intentional
before committing it anywhere public, since example files are normally
committed to git and this one currently is not gitignored (only `.env.local`
itself is excluded; `.env.local.example` is explicitly un-ignored via the
`!.env.local.example` rule).

To get the database into a testable state, the next concrete step is:
`npx prisma migrate dev` (or equivalent) against the real Neon instance
already configured in `DIRECT_URL`, then hand-write the two partial-index
migration (Section 6.1) and seed `app_settings`/`achievements` (Section 6.2).

---

## 12. Intended Production Infrastructure

Source: `answer_icreate.md` (an infrastructure cost/funding proposal written
for a funding committee — not architecture documentation per se, but a
useful, evidence-based snapshot of the intended production stack, built by
reading the actual repo rather than any narrative plan). Cross-referenced
here because it corroborates and extends Section 3/5/11's picture of what
services this app is meant to eventually use:

| Layer | Intended service | Status in repo (per that document, corroborated above) |
|---|---|---|
| Hosting (SSR + API) | Vercel (Pro plan — Hobby/free forbids commercial use) | Implied by `next` dependency + no Dockerfile/`fly.toml`/etc.; not yet deployed anywhere |
| Database | Neon Postgres (serverless, pay-as-you-go) | Provisioned (Section 11), schema not migrated (Section 6.2) |
| Auth | Clerk (free tier, up to 50,000 Monthly Retained Users) | Wired up (Section 4.2) |
| Object storage | Cloudflare R2 (free tier at modeled scale; zero egress fees) | Not started (Section 5.2) |
| AI inference (primary) | Groq (pay-per-token; Llama 3.1 8B for explanations, Llama 3.3 70B for quiz authoring) | Not started — no SDK installed |
| AI inference (fallback) | NVIDIA NIM (free evaluation tier; **pricing unverified** by that document's own admission) | Not started |
| Realtime/cache | Upstash Redis (fixed $10/mo tier chosen for billing predictability over pay-as-you-go) | Not started; optional per `.env.local.example`'s own comment, though that proposal argues it becomes **required**, not optional, once the app runs as more than one serverless instance (needed for cross-instance `Room`/`RoomParticipant` state) |
| Domain | Porkbun (flat, non-bait-and-switch renewal pricing) | Not registered yet |
| DNS | Cloudflare (free plan) | Not configured |
| Monitoring/analytics | Vercel built-in (free tier) — explicitly flagged in that document as a real pre-launch gap, not merely deferred | Not configured |
| CI/CD | Vercel's native Git integration (no GitHub Actions needed) | Not configured — no `.github/workflows/` |

Modeled realistic monthly cost at a 1,000-peak-concurrent / ~10,000 MAU
target: **$54–$92/month** (dominated by Vercel's mandatory $20 Pro plan and
Neon compute). The single largest scaling risk flagged: Clerk's free tier
covers up to 50,000 Monthly Retained Users, then becomes a steep per-MRU
cost — modeled at ~$1,025/month at 100,000 MAU. Full breakdown, all cited
sources, and the funding recommendation ($200 min / $950 comfortable / $1,850
ideal) are in `answer_icreate.md` itself — not reproduced further here since
this is cost/funding context, not a build task.

---

## 13. Key Technical Gotchas / Lessons Learned

Collected in one place since they're each individually easy to hit again:

1. **CSS Grid + `position: sticky`**: a sticky element can only visually
   "float" across a scroll range roughly equal to (its containing block's
   height − its own height). Making a sticky element's own box nearly as
   tall as its containing block (e.g., by spanning too many grid rows, or by
   sizing it to `100dvh` when it also has significant natural offset from
   the top of its container) removes that slack and breaks the pinned
   effect, or overflows the viewport at the un-stuck (natural-position)
   scroll state. See Section 7.4 for the full incident history.
2. **CSS Grid auto-placement is dangerous once any sibling has an irregular
   explicit span.** If one grid item explicitly spans multiple rows/columns
   and a later item doesn't get an explicit column too, auto-placement can
   fill whatever cells it thinks are free in an order that doesn't match
   visual intent. Always give every item in a mixed explicit/auto grid an
   explicit column once *any* item has an irregular span.
3. **Tailwind v4's fixed cascade-layer order** (`base` < `components` <
   `utilities`, always, regardless of source order in your actual CSS file)
   means a plain utility class in JSX always beats a `@apply`'d style inside
   a shared component class. If a "shared style" change doesn't seem to be
   taking effect on one specific instance, grep for an explicit override
   utility class sitting right there in that instance's own `className`
   string.
4. **Browser zoom and fixed-size layouts**: `px`/`rem` don't shrink with
   browser page-zoom, but the viewport's *effective* CSS-pixel dimensions
   do shrink as zoom increases — so fixed-size content occupies a growing
   share of the (shrinking) viewport at higher zoom, and "fits perfectly at
   100%" layouts can visibly break at 110–125%. Fix: size the biggest
   vertical/horizontal space-consumers with `clamp(min, Nvh/dvh, max)`
   instead of fixed lengths, so they scale down proportionally with the
   (zoom-aware) viewport-relative unit.
5. **Framework knowledge-gap discipline**: this project's core frameworks
   (Next 16, Clerk v7, Prisma v7, Tailwind v4) all have real breaking changes
   vs. typical training-data knowledge. The pattern that worked every single
   time: read the actually-installed code/types
   (`node_modules/**/*.d.ts`, `node_modules/next/dist/docs/`) before writing
   code that depends on an assumed API shape, and trust that over even
   version-pinned bundled skill docs when they disagree (the Prisma
   `directUrl` incident, Section 4.3, is the concrete example — a doc
   written for v7.6.0 was wrong about v7.9.0's actual type).
6. **Windows/OneDrive file locks**: `mv`/`rmdir` can intermittently fail with
   "Permission denied" on Windows when a directory is inside a OneDrive-synced
   folder (sync process or Defender holding a lock). `robocopy /E /MOVE`
   reliably works instead (its exit code 1 is normal/success, not an error —
   don't treat a non-zero robocopy exit code as failure without checking
   what it means).
7. **Verify Lucide icon names exist before using them** — this version of
   `lucide-react` doesn't have every icon name people might remember from
   older versions (e.g. `Github`/`Twitter` don't exist in the installed
   version; used `AtSign`/`Share2`/`MessageCircle`/similar existing icons
   instead). A quick Node script checking
   `Object.prototype.hasOwnProperty.call(icons, name)` against the actual
   installed package is more reliable than assuming.
8. **npm's `allowScripts` gate**: newer npm blocks postinstall scripts by
   default for security. If a legitimate dependency's postinstall script is
   blocked, inspect the actual script content before approving — in this
   project `@prisma/engines`, `prisma`, `sharp`, `unrs-resolver` were all
   inspected and confirmed to be standard binary-download logic, then
   approved via `npm approve-scripts <pkg>`.
9. **Never use emoji in this app's UI, ever** — explicit, repeated,
   non-negotiable user directive from early in the redesign. Always Lucide
   SVG icons. If no suitable icon exists for a concept, log a request (name +
   description + color palette) to **`svg.md`** (repo root) for the user to
   commission real artwork, rather than falling back to an emoji or a
   vague/wrong icon. This convention previously used a file called
   `svg_request.md` (Section 8/9 history above) which was deleted once its
   one entry became irrelevant; the user explicitly asked for the file to be
   named `svg.md` on 2026-07-23, so that's the current name — don't recreate
   `svg_request.md`.
   **Resolved (2026-07-23, same day)**: the shareable result card
   (`components/quiz/ShareCardFace.tsx`) briefly used emoji (👑 🔥 ⭐ 🌐) as
   a placeholder exception while matching a reference design the user
   hand-authored (`public/shareCard/`). Logged as 4 requests in `svg.md`;
   the user then supplied real commissioned artwork the same day
   (`public/crown.svg`, `flame.svg`, `star.svg`, `globe.svg`), now wired in
   via `<img>` tags — no emoji left anywhere in the app. The exception is
   fully closed, not just dormant; `svg.md`'s "Fulfilled" section has the
   per-icon detail if this file needs touching again.
10. **This is a structural-migration project with an explicitly reversed
    "don't redesign" instruction** (Section 5.5) — if any future instruction
    seems to contradict "preserve v1 UI exactly," that's not a
    contradiction to flag, it's already been explicitly superseded. Don't
    revert redesign work citing the original brief; the redesign is the
    current, standing instruction.
11. **A caught error inside a Prisma interactive transaction (`$transaction(async tx => ...)`) does NOT let you keep using that transaction.**
    Postgres aborts the *entire* transaction the instant any single
    statement errors — including an ordinary unique-constraint violation —
    and every subsequent statement on that same connection throws `25P02:
    current transaction is aborted` until a rollback, regardless of whether
    the JS-level error got caught. This bit `awardAchievements` in
    `app/api/submissions/route.ts` (Section 18/19 — real 500s in
    production-like testing, not caught by `npm run build`): a per-slug
    `try { tx.userAchievement.create() } catch (P2002) {}` loop worked fine
    for the *first* already-earned achievement but broke every query after
    it in the same transaction. Fix pattern: never rely on catching a
    constraint violation mid-transaction — pre-check with a `findMany`
    first, or use `createMany({ skipDuplicates: true })` (Postgres's native
    `ON CONFLICT DO NOTHING`, which never raises an error at all). Watch for
    this same shape (try/catch around a `create()`/unique field inside any
    `$transaction` callback) anywhere else in the codebase.

---

## 14. Git / Version Control Status

**Updated 2026-07-22 — two commits now, not one:**
- `ba107ab "Migrated to NextJS"` — everything through the original scaffold,
  Clerk auth, Prisma schema (unmigrated at the time), and the full landing
  page redesign (Sections 3–7 of this file). This is the commit that made
  the rest of this file's history "real" — before it, none of that work was
  in git at all (the state the paragraph below used to describe).
- A second commit (2026-07-22, same day) covering: the first Prisma
  migration + seed data (Section 6.2), `/dashboard` + `/quizzes`
  (Section 8.1), and the user's own manual fixes to `lib/auth.ts`/`AppNav.tsx`/
  landing CTAs (Section 15 item 1). Commit message deliberately has no
  AI co-author trailer — explicit user instruction for this project, not a
  default to assume elsewhere.

**Still uncommitted as of this writing**: the other 10 Phase 2 pages built
later in the same 2026-07-22 session (quiz-taking, results, leaderboard,
team, admin, proctor, teacher, profile, live-lobby, presenter — everything
in Section 8.1 not mentioned in the second commit above). Confirm with the
user before committing further rather than assuming every subsequent chunk
of work should be auto-committed — this project's standing behavior so far
has been "commit when asked," not "commit continuously."

**Implication for a new agent**: `git log`/`git blame` are now meaningful for
everything in the two commits above, but still tell you nothing about the
uncommitted work in progress — this MEMORY.md remains the authoritative
record for that until it's committed.

---

## 15. Open Questions For The User

Things flagged during development that were never explicitly resolved —
don't silently pick an answer, ask or flag again if they become relevant:

1. ~~Should `app/page.tsx` stop redirecting signed-in users to `/dashboard`?~~
   **Resolved by the user, 2026-07-22** (manual edit, reviewed and committed
   as-is): the redirect was removed entirely — signed-in users now still see
   the landing page. `AuthCTA.tsx`'s logged-in branch is reachable now.
   Landing CTAs that used to hardcode `/register` (`MosaicHero`, `BattleMode`,
   `SiteFooter`, `LandingNav`) were switched to a new shared
   `components/landing/SmartCTAButton.tsx`, which routes to `/dashboard` if
   signed in or `/login` otherwise — so the same buttons make sense for both
   audiences instead of always pushing toward registration.
2. **Practice-mode answer-checking consistency** (carried over from the
   original audit, Section 5.6): should the client-side practice-mode
   correctness check use the same `mapAnswerLetter`-equivalent matching
   logic as real graded submissions, or stay intentionally simpler since
   it's low-stakes? Not decided.
3. **Is Upstash Redis actually required, or truly optional?** `.env.local.example`'s
   own comment says it's optional/single-instance-only, but the
   infrastructure cost proposal (`answer_icreate.md`, Section 12 above)
   argues it becomes required once the app runs as more than one serverless
   instance, for the `Room`/`RoomParticipant` live-multiplayer state to be
   shared across instances. Worth confirming intent before building the
   live-lobby backend.
4. **`.env.local.example` appears to contain real (non-placeholder) Clerk
   test-mode keys** (Section 11) — confirm whether that's intentional before
   this file is ever committed/shared, since example files are normally
   meant to be safe to commit publicly.
5. **Should the dead `clash-display-*`/`general-sans-*` font files be
   deleted** now that no CSS token references them (Section 4.5, 9)? Low
   priority, purely a cleanup question.
6. **How should the eventual `git` history be structured** — one large
   commit for everything so far, or split into logical chunks (Section 14)?
   Not yet asked/decided.

---

## 16. How To Resume Work — Quick-Start For A New Agent

If you're picking this project up cold, in order:

1. Read this file's Section 1 (overview) and Section 10 (phase status) first
   — 2 minutes, tells you exactly what exists and what doesn't.
2. If you're about to touch anything in `components/landing/` or
   `app/page.tsx`, read Section 7 in full first (especially 7.4, the sidebar
   saga) — several non-obvious CSS bugs were already found and fixed there;
   don't reintroduce them.
3. If you're about to build a new app page or API route, read
   `../MIGRATION_AUDIT.md` for that specific feature's exact v1 behavior
   (request/response shapes, edge cases, checkboxes) — this MEMORY.md's
   Section 8 only summarizes it.
4. If you hit a framework API that doesn't behave like you expect (Next,
   Clerk, Prisma, Tailwind), read Section 4 and Section 13 first — there's a
   good chance the exact gotcha is already documented, and if not, verify
   against the actually-installed `node_modules` types/docs before assuming
   training-data knowledge is current (see Section 4's opening paragraph and
   Section 13 item 5).
5. Before running any database-touching code, read Section 6.2 — the schema
   has never been migrated to a real database. You will likely need to run
   the first migration yourself before anything that touches Prisma will
   work at runtime.
6. Check Section 11 for what environment variables/credentials already
   exist vs. still need to be supplied by the user (R2, Groq, NVIDIA NIM,
   Redis are all currently empty).
7. Default to `npm run build` for verification, not Playwright/headless
   browser automation, unless the user explicitly asks for it in the
   moment (Section 9's last bullet) — the user does their own manual visual
   checks and has revoked standing permission for automated browser
   verification after granting it temporarily once.
8. Nothing is committed to git (Section 14) — if you're asked to commit,
   confirm scope with the user rather than assuming; this working tree
   represents a large amount of unreviewed, uncommitted work.

---

## 17. Multi-Type Question System + AI Document Parser (2026-07-23)

Added per explicit user request, on top of the Phase 1-6 work above. Two
parts: (a) extended the quiz question model from single-correct-MCQ-only to
4 types, and (b) built a new AI-powered parser that classifies+extracts all
4 types from an uploaded document.

**17.1 — The 4 question types** (`types/quiz.ts`): `QuizQuestion` is now a
discriminated union — `McqSingleQuestion` (`type` optional, defaults to
`mcq_single` for every pre-existing quiz with no `type` field at all — no
data migration needed), `McqMultiQuestion` (`answers: string[]`),
`FillBlankQuestion` (`answer: string`), `MatchColumnsQuestion`
(`pairs: {left, right}[]`). `questionType(q)` is the one place that reads
`q.type ?? "mcq_single"` — every consumer uses this rather than checking
`q.type` directly. Sanitized (answer-key-stripped) equivalents exist for the
client (`SanitizedQuizQuestion` in the same file); `lib/quiz-sanitize.ts`
strips answers and, for match-columns, splits `pairs` into separately-
shufflable `leftItems`/`rightItems`.

**17.2 — Grading rules** (`lib/answer-matching.ts`'s `scoreQuestion`, the
single entry point every grading route now uses) — all 3 are explicit user
decisions made 2026-07-23, not judgment calls:
- **mcq_multi**: partial credit per option — `max(0, (correctSelected -
  incorrectSelected) / totalCorrectAnswers)`.
- **match_columns**: partial credit per pair — `correctPairsMatched /
  totalPairs`.
- **fill_blank**: exact match only, case/whitespace-insensitive — no
  fuzzy/AI grading.
- **mcq_single**: unchanged, same `isAnswerMatch` letter/text matching as v1.

`scoreQuestion` is used by `/api/submissions`, `/api/rooms/[code]/answer`,
`/api/admin/quizzes/[id]/analytics`, and `lib/dashboard-data.ts`'s
`getWeakTopics` (previously did its own flat string-equality check that
would have silently mis-scored the 3 new types — fixed as part of this
work). `lib/quiz-client-scoring.ts` has a separate, client-safe (no
`server-only`) set of correctness checks used only for practice-mode instant
feedback in `QuizClient.tsx` — deliberately not the same module as the real
grading path.

**17.3 — AI document parser** (`lib/ai-quiz-parser.ts` +
`app/api/ai/parse-quiz-doc/route.ts`, admin-only): takes the same
`.md`/`.txt`/`.docx` upload the existing regex parser (`lib/quiz-parser.ts`)
accepts, but sends the extracted text to Groq asking it to classify each
question into one of the 4 types and extract type-appropriate answers,
returning strict JSON. **Added as a new option alongside the old regex
parser, not a replacement** (explicit user decision) — `QuizUploader.tsx`
now has 3 tabs: "Upload File" (regex, mcq_single only), "AI Generate"
(topic → new questions), "AI Parse Document" (upload → AI-classified
questions). All 3 converge on the same review-before-create flow: parse/
generate → `QuestionPreview` (type-aware, shows a type badge + the correct
answer(s) per type) → `POST /api/admin/quizzes/create`.

**Model choice**: uses `GROQ_MODEL` (`llama-3.3-70b-versatile`), **not**
`NIM_MODEL` (`meta/llama-3.1-8b-instruct`), even though the user's question
was originally about which NVIDIA NIM model to use. Reasoning: this existing
codebase already splits AI work by task weight — NIM's 8B model is used
for short, low-stakes streamed responses (`/api/ai/distractors`,
`/api/ai/explain`), while Groq's 70B model is used wherever the task is
larger/harder JSON generation (`generateQuestions`, `/api/ai/format-quiz`).
Classifying a whole document's questions into 4 different JSON shapes while
staying faithful to the source text is squarely in the "harder JSON task"
category, so it follows the existing Groq-for-heavy-lifting pattern rather
than introducing a new NIM model. Both providers are free-tier for this
project's expected volume — this was a capability choice, not a cost
tradeoff. If NIM is ever preferred instead, the closest free/strong model in
its catalogue for structured extraction would be a 70B-class instruct model
(e.g. `nvidia/llama-3.1-nemotron-70b-instruct` or `meta/llama-3.1-70b-instruct`),
not the 8B model already wired up as `NIM_MODEL`.

**Not done / left as-is**: no chunking for very long documents (input is
truncated at 15,000 chars, same substring-truncation pattern as the
existing `/api/ai/format-quiz`); malformed items from the model's JSON are
silently dropped rather than surfaced to the admin (matches the existing
`generateQuestions` filtering behavior).

**Update 2026-07-23, later same day**: `NIM_MODEL` in `lib/ai-clients.ts` was
changed from `meta/llama-3.1-8b-instruct` to `openai/gpt-oss-120b` — the
user tested their real NVIDIA NIM key against this specific model and
confirmed it works, so it replaced the original 8B pick for all of NIM's
existing uses (`/api/ai/distractors`, `/api/ai/explain`). It's a
"harmony"/reasoning-format model that can emit a separate
`reasoning_content` field alongside `content` — `streamToText` in the same
file only ever accumulates `content`, so the reasoning trace is never
surfaced to end users; this was intentional, not an oversight.

---

## 18. Post-Launch Bug Fixes + Shareable Result Card (2026-07-23, later same day)

Four more things fixed/added after real end-to-end testing began (Phase 6
territory — first real bugs found by actually using the app with live
Groq/NIM keys):

1. **Comments section removed from the quiz results page**
   (`components/quiz/ResultsClient.tsx`) per explicit user judgment call
   ("seems pointless"). The backend (`QuizComment` model,
   `/api/quizzes/[id]/comments[/[commentId]]` routes) was deliberately left
   in place — deleting a real DB-backed model/table wasn't asked for and is
   a much bigger, harder-to-reverse change than removing a UI section.
   Those routes are now dead code, harmless, not wired to anything.

2. **Analytics response shape bug** (real bug, not a data/grading issue —
   verified directly against the DB that submissions and `scoreQuestion`
   were both correct). `app/api/admin/quizzes/[id]/analytics/route.ts`
   returned a bare array; `TeacherPage`'s `AnalyticsModal` always expected a
   wrapped object (`{questions, submission_count, avg_score,
   completion_rate}`), so it silently showed "No analytics data available
   yet" regardless of real submissions. Fixed by changing the route to
   return that wrapped shape, with `accuracy` as a 0..1 fraction and
   `top_wrong_answer` in snake_case (matching what the client already read).
   This also broke `components/admin/QuizManager.tsx`'s own inline
   analytics section (used on `/admin`, expected a bare array with
   different field names/units) — updated it to match the same new
   canonical shape rather than maintaining two different response
   contracts for the same endpoint.

3. **Daily-challenge seed-fallback removed** (`lib/dashboard-data.ts`'s
   `getDailyQuizForUser`). v1's original 3-tier fallback's 3rd tier
   ("seed-based pick from any live quiz" when no admin ever published a
   real daily challenge) meant any ordinary live quiz — including ones just
   created via the new AI parser — got shown as "Today's Challenge" on the
   dashboard. This was previously preserved intentionally "for v1 parity"
   (see Section 17-era comments); the user explicitly asked for this
   specific behavior to change, so it's gone now — the function returns
   `null` when no quiz actually has `is_daily: true`, and the dashboard
   simply omits the card. This is a deliberate deviation from v1 parity, not
   an oversight — don't reintroduce the 3rd tier without asking again.

4. **Shareable result card** (`components/quiz/ShareCardModal.tsx`, wired
   into `ResultsClient.tsx` via a new "Share Result Card" button).
   Strava/Duolingo-style card, offered via download or the Web Share API
   (`navigator.share`/`canShare` with a `File`, falling back to download
   when unsupported). Shows username, Clerk avatar (or an initial-letter
   fallback if the image fails to load), quiz title, score, correct/total,
   and streak. Background color + a stamp label are keyed off score
   percentage — **explicit user-specified bands, not a judgment call**:
   <30% pale red, 30-59% blue, 60-89% purple, 90-99% green, exactly 100%
   golden-orange **with a gold crown above the avatar** (the crown must
   never appear at any other percentage).

   **Rewritten same day, later**, once the user supplied a hand-built
   reference design (`public/shareCard/index.html` + `style.css` — kept in
   the repo as the source reference, not just inspiration). The first pass
   was a hand-drawn `<canvas>` renderer (`lib/share-card.ts` used to contain
   all the drawing code); this didn't match the reference's fidelity, and a
   flat PNG can't have a hover/tilt effect. Replaced with a real DOM/CSS
   component instead:
   - `components/quiz/ShareCardFace.tsx` + `ShareCard.module.css` — the
     actual card markup/styles, adapted from the reference 1:1 (same
     1200×1200 layout, wave SVG, confetti/grid backgrounds, stat boxes,
     footer), but with the background driven by `--band-from`/`--band-to`
     CSS custom properties (set inline per score band, see `paletteFor` in
     the now-much-smaller `lib/share-card.ts`) instead of the reference's
     fixed yellow gradient, the crown made conditional, and the reference's
     Google Fonts `<link>` swapped for the app's own self-hosted
     `--font-display`/`--font-accent` (this project self-hosts all fonts on
     purpose — see `lib/fonts.ts` — so a new Google Fonts CDN link would
     have broken that convention).
   - `components/core/tilt.tsx` — a small in-house pointer-tilt wrapper
     (rotateX/rotateY driven by mouse position via framer-motion, already a
     dependency). The user referenced `@/components/core/tilt` from a UI kit
     that isn't installed in this project; this reimplements the same idea
     rather than adding an unrelated package.
   - The live DOM card is what's shown and hoverable/tiltable — never just a
     static exported image. A `.shimmer-overlay` (new `app/globals.css`
     utility) sweeps over the card only while the avatar `<img>` is still
     loading; once it settles (load or error), the PNG is generated silently
     in the background via the new `html-to-image` dependency
     (`toPng(cardRef.current, {width:1200, height:1200, pixelRatio:2,
     cacheBust:true})`) so Download/Share are instant by the time the user
     clicks rather than generating on click. `crossOrigin="anonymous"` is
     set on the avatar `<img>` for canvas-capture purposes; Clerk's
     avatar host supports this, but it degrades to an initial-letter
     fallback (`avatarFailed` state) if it ever doesn't.
   - Not yet visually verified in a live browser by the agent (per Section
     9's standing note, automated browser/Playwright verification needs the
     user's in-the-moment go-ahead) — flagged to the user to check the
     actual rendered/tilting card and the downloaded PNG.

5. **Leaderboard silently showing "No scores yet" instead of "hidden" /
   "not published" / "ended" states** — real bug, found from a genuine
   server-log symptom (`GET /api/leaderboard?... 403`). Root cause:
   `app/api/leaderboard/route.ts` returned 403 for its three meaningful
   non-error states (leaderboard visibility off, quiz still draft, quiz
   archived) — carrying useful data in the body (`hidden`/`notPublished`/
   `archived` + a message) — but `lib/api-client.ts`'s `apiFetch` throws on
   *any* non-2xx status and discards the body, so `LeaderboardClient.tsx`'s
   `if (data.hidden) / else if (data.archived)` branches were dead code; the
   `catch` block just silently kept whatever was already rendered, which
   defaulted to the generic empty-state message. Fixed by changing all
   three of those responses to 200 (they're states to render specially, not
   fetch failures) — this is the same root-cause class as item 2 above
   (Section 18), just a different endpoint. Also split the previously
   mislabeled case: the route was tagging *draft* quizzes as `archived:
   true` (reusing the "this quiz has ended" copy for a quiz that was never
   published) — now `notPublished` and `archived` are distinct, correctly
   labeled states in both the route and `LeaderboardClient`. The
   leaderboard-hidden state's copy was also made more explicit per user
   request ("Leaderboard: OFF" instead of just an icon + "Leaderboard is
   hidden").

6. **Liquid-fill submit-confirmation animation** — when a user confirms
   quiz submission, the black "Submit" button in `ConfirmModal` (used via a
   new `loading`/`loadingLabel` prop) now fills green from the bottom while
   the `/api/submissions` request is in flight, instead of the modal
   closing instantly and leaving only static "Submitting…" text on the
   underlying page button. Pure CSS (`.liquid-fill-btn`/`.liquid-fill` +
   keyframes in `app/globals.css`) — rises to ~88-94% and wobbles there
   rather than claiming a false completion percentage, since there's no
   known request duration to animate against.
   **Superseded same day, later (Section 19)**: this button-level treatment
   was replaced by a full-screen liquid submission overlay per a much more
   detailed spec. `ConfirmModal`'s `loading`/`loadingLabel` props still
   exist and still work (harmless, reusable for other confirmations), but
   the quiz-submit call site in `QuizClient.tsx` no longer passes them —
   `onConfirm` now just closes the modal and hands off entirely to
   `SubmitLiquidOverlay`.

---

## 19. Share Card Polish + Full-Screen Liquid Submission Overlay (2026-07-23, later still)

**19.1 — Share card fixes**, from a screenshot showing real problems with
the Section 18 rewrite:
- **Edges/corners getting cut**: the preview wrapper clipped the card
  (`overflow: hidden`) to a box sized by CSS `aspect-ratio`, computed
  separately from the `transform: scale()` used to shrink the 1200×1200
  card down to preview size — any mismatch between those two independently-
  computed sizes clipped the rounded corners/shadow. Fixed in
  `ShareCardModal.tsx` by sizing the middle wrapper box in JS from the exact
  same `scale` value used for the transform (`CARD_SIZE * scale` for both
  width and height), and removing the clip entirely — nothing needs to be
  clipped once both boxes are guaranteed to match.
- **White/cream stat boxes looked bad** against the colorful gradient
  background — changed `.stats` in `ShareCard.module.css` to a translucent
  dark-ink glass panel (`rgba(20,18,15,0.82)`) with light text, matching the
  card's dark footer instead of clashing with it.
- **Reveal shimmer on open**: added a ~1.2s one-time shimmer sweep when the
  modal first opens (`revealShimmer` state + timer in `ShareCardModal.tsx`),
  layered on top of (not replacing) the existing avatar-loading shimmer.
- **`svg.md`** (repo root, new file) — the standing "never use emoji"
  rule's logging convention, previously a file called `svg_request.md`
  (deleted long ago, see Section 13 item 9's history) that the user
  explicitly asked be named `svg.md` this time. Logs the 4 emoji currently
  used in the share card (👑 🔥 ⭐ 🌐) as pending real-SVG commission
  requests, each with a description + suggested color palette, per the
  established convention.

**19.2 — Full-screen liquid submission overlay**
(`components/quiz/SubmitLiquidOverlay.tsx` + `.module.css`), built from a
long, detailed user spec ("I'm locking in your answers", Apple/Duolingo/
Strava/Linear-level polish). Replaces the button-level liquid-fill
(Section 18 item 6) for the actual quiz-submit flow. Key mechanics, since
none of this is obvious from a quick read of the component:

- **State machine lives in `QuizClient.tsx`, not the overlay** —
  `submitPhase: "idle" | "filling" | "waiting" | "revealing"` plus a
  separate `revealed` boolean that, once set `true` (inside
  `onRevealComplete`, alongside resetting `submitPhase` back to `"idle"` in
  the same batch), **never resets**. The overlay component itself is
  presentational, driven purely by the `phase` prop — it owns no timing
  decisions beyond its own internal 1.8s fill animation and the "waiting"
  idle-wobble.
- **Why `revealed` exists / why the two early-return gates changed**:
  `if (submitStatus === "success" && revealed)` and the equivalent for
  `"error"` (previously gated on `submitStatus` alone). This is the crux of
  making the "reveal" look seamless: the underlying success/error screen
  must NOT swap in the instant the backend responds (which can happen at
  any point during the 1.8s fill/wait) — only once the green fill is fully
  opaque (100% height) is it *safe* to invisibly swap the mounted content
  underneath, and only the "revealing" phase (fill already at 100%, now
  sliding off-screen) should ever expose that swap to the user. Gating
  early-returns on `submitStatus` alone (like Section 18) would have let
  the plain success/error screen flash in immediately on backend response,
  well before the animation finished — defeating the entire point of the
  spec ("continue animation until 1800ms" regardless of backend speed).
- **Why the overlay is rendered from a single place, not duplicated in the
  success/error branches**: an earlier design considered rendering the
  overlay in multiple early-return branches so its "revealing" slide-away
  could keep playing after the tree swapped to the success/error screen.
  Rejected — swapping branches mid-animation unmounts and remounts the
  `motion.div`, which resets its Framer Motion `initial` state and makes the
  green fill visibly snap back to 0% before re-animating, a glaring glitch.
  Instead, `revealed` flips true in the *same* batched update that resets
  `submitPhase` to `"idle"`, so the overlay only ever lives in the main
  quiz-taking return, unmounting cleanly right as (not animating a moment
  after) the tree swaps to the revealed success/error screen underneath.
- **Timing**: fixed 1.8s "filling" run every time, independent of backend
  speed (a ref — not a dependency — holds the latest `submitStatus` so the
  1.8s `setTimeout` doesn't restart if the backend responds mid-fill). If
  the backend already responded by then, skip straight to "revealing"; if
  not, hold at "waiting" (gentle wave wobble + "Calculating your results…"
  + bouncing dots) until it does.
- **Organic wave effect without canvas/WebGL** (per the spec's explicit
  technical constraint): 3 stacked SVG wave paths, each doubled
  horizontally and looped via `translateX(-50%)` at a different
  duration/direction. No physics simulation — the classic "layered waves"
  trick, where differing loop periods make the combined motion read as
  alive/non-repetitive despite each individual layer being a simple seamless
  loop.
- **Particles use a fixed, deterministic position array**, not
  `Math.random()` — new code shouldn't add another instance of the
  "impure function during render" lint violation the app already has
  pre-existing elsewhere (`ConfettiDots` in `ResultsClient.tsx`).
- **`prefers-reduced-motion`**: `useReducedMotion()` swaps the wave/particle
  visuals for a flat solid-color fill, keeping the exact same phase/timing
  state machine (still respects the 1.8s minimum, still waits for the
  backend, still reveals the same way) — only the decoration is simplified.
- **Scoped out on purpose** (spec's own "Nice Details"/optional section):
  no sound effect, no button distortion/reflection/surface-tension/splash
  embellishments. These were explicitly marked optional polish in the spec;
  cut for time, not forgotten — revisit if the user asks for more fidelity
  here.
- Not yet visually verified in a live browser by the agent (Section 9's
  standing note) — flagged to the user to check the actual animation feel,
  timing, and the reduced-motion fallback.

---

## 20. Second Round of Visual Fixes + Match-Columns Drag-Wire Rebuild (2026-07-23, later still)

Real bugs found from a screenshot of the Section 19 work, plus one larger
UX rebuild:

**20.1 — Share card, `ShareCard.module.css`:**
- **"QUIZ" label overlapping the username**: `.quiz` was `bottom: 270px`
  anchored, sized independently of how tall the username block above it
  actually rendered — no shared reference point, so they could collide
  depending on font metrics. Switched `.quiz` to `top: 800px` (anchored
  below the avatar/username block instead of up from the card's bottom
  edge) and added explicit `line-height: 1.1` to the text elements in that
  area so the vertical rhythm doesn't depend on a custom pixel font's
  unpredictable default line-height.
- **Crown not aligned over the avatar / too small**: it was a normal-flow
  child of `.avatarWrap` sized only 96×96 — small relative to how much of
  that box is just background in the source SVG illustration (see 20.3),
  and not reliably centered above the circular avatar. Made `.crown`
  `position: absolute` (avatarWrap is already a positioning context),
  centered via `left:50%; transform:translateX(-50%) rotate(-10deg)`, sized
  up to 190×190, and `top:-90px` so it visually overlaps the top of the
  avatar like it's resting on it.
- **Translucent stat boxes → solid**: `.stats` background changed from
  `rgba(20,18,15,0.82)` to solid `#14120f` per explicit request ("make them
  full black").

**20.2 — Results page**: "View Leaderboard" only filled half the button
grid's width when not in practice mode (no "Practice Again" button to fill
the other grid cell alongside it). Fixed in `ResultsClient.tsx` by
conditionally adding `sm:col-span-2` to that Link whenever `!isPractice`.

**20.3 — Real SVG artwork for the share card** (follow-up to Section 19's
`svg.md` requests): user supplied `public/crown.svg`, `flame.svg`,
`star.svg`, `globe.svg` — wired into `ShareCardFace.tsx` via `<img>` tags
in place of the emoji placeholders. `svg.md` updated to "Fulfilled"; no
emoji left anywhere in the app.

**20.4 — Liquid submission overlay waves made much bigger** — the first
pass's wave layers were only 28-60px tall bands right at the fill's surface
line, easy to miss; user asked for waves "going up and down across the
entire screen." Increased to 100-220px tall layers with proportionally
bigger amplitude in the SVG path curves (`SubmitLiquidOverlay.tsx`/
`.module.css`), so the undulation reads as the dominant motion rather than
a subtle sliver.

**20.5 — Success confetti pop**: a new `success` prop on
`SubmitLiquidOverlay` (wired from `QuizClient.tsx`'s `submitStatus ===
"success"`) gates a one-shot confetti burst (12 pieces, fixed deterministic
angle/distance/rotation/color array computed once at module scope — not
`Math.random()`, not recomputed per render) that plays only during the
`"revealing"` phase, only on success, never on error. Skipped entirely
under `prefers-reduced-motion`.

**20.6 — Match-columns: force-shuffled right column + drag-wire rebuild.**
Two separate but related fixes:
- **Real bug**: `sanitizeQuestion`'s match_columns case builds `leftItems`
  and `rightItems` from the same `pairs` array in the same order, so
  `left[i]` always correctly pairs with `right[i]` *by construction* unless
  something explicitly shuffles `rightItems`. That shuffle was previously
  gated behind the quiz's `shuffleOptions` setting (an MCQ-option cosmetic
  toggle) — meaning any match-columns question in a quiz that didn't have
  `shuffleOptions` enabled had its correct answer trivially readable by
  position. Split `shuffleSanitizedQuestion` into two functions in
  `lib/quiz-sanitize.ts`: `shuffleMcqOptions` (still gated on the setting)
  and `shuffleMatchColumnsRight` (always applied, never optional — it's a
  correctness fix, not a preference). Applied at both call sites:
  `app/api/quizzes/[id]/route.ts` (per-user seed, as before) and
  `app/api/rooms/[code]/route.ts` (previously didn't shuffle *anything* at
  all — now shuffles match-columns using a per-room, not per-user, seed
  since a live room shows one synchronized view to every participant).
- **UI rebuild**: replaced the per-left-item `<select>` dropdown in
  `QuestionCard.tsx`'s `MatchColumnsBody` with a drag-a-colored-wire
  interface (explicit user request) — each left item gets a fixed color
  from `WIRE_COLORS`, dragging its handle to a right item draws a curved
  SVG wire and records the pair; a small "×" clears an existing pair.
  Anchor coordinates for drawing wires are measured via
  `getBoundingClientRect` inside a `useLayoutEffect` (window resize also
  re-measures) and stored in state — deliberately **never** read directly
  from refs during render, to avoid the exact "ref access during render"
  lint violation (`react-hooks/refs`) already flagged as pre-existing
  elsewhere in `QuizClient.tsx` (Section 13 item 11's sibling issue — don't
  reproduce that pattern in new code). In practice mode, once the answer
  key is revealed (`question.pairs` present), wires tint green/red by
  correctness instead of by left-item color. Uses Pointer Events
  throughout (not separate mouse/touch handlers), so basic touch dragging
  works without extra code.
- Not yet visually/interactively verified in a live browser by the agent
  (Section 9's standing note) — flagged to the user to actually try
  dragging a wire, confirm the shuffled order looks right, and check the
  crown/stat-box/quiz-label fixes render correctly.

---

## 21. Submission Overlay: Gooey Bubble Surface (2026-07-23, later still)

Replaced the wave-curve surface texture (Section 19.2/20.4) with a "gooey
metaball" bubble effect, adapted from a user-supplied CodePen-style
reference (originally a decorative footer effect) — `SubmitLiquidOverlay.tsx`
+ `.module.css`.

**How it works**: 128 small circles (`.blobBubble`) rise independently
inside a thin `.bubbleField` strip pinned to the top edge of the rising
`.fillWrap`, each animating via two CSS keyframes (`blob-bubble-move`
raises it, `blob-bubble-size` shrinks it to nothing partway through its own
cycle) with randomized-looking per-bubble size/speed/position/delay — but
computed once from a **deterministic sine-hash** (`seededRandom`, module
scope, not `Math.random()` and not called during render) rather than
actual randomness, same reasoning as the existing `PARTICLES`/`CONFETTI`
arrays. The key visual trick is the `.bubbleField`'s `filter:
url(#liquid-blob)` — an SVG `feGaussianBlur` + `feColorMatrix` filter
(defined inline in the component, skipped entirely under
`prefers-reduced-motion`) that blurs the circles and re-thresholds the
alpha channel, so overlapping bubbles visually melt into one continuous
organic blob instead of reading as separate dots. Colored green
(`#22c55e`) per explicit request, replacing the reference's original red.

**What stayed the same**: the overall fill-to-100%-over-1.8s mechanic, the
"waiting"/"revealing" phases, the small ambient `PARTICLES` (renamed
nothing there — still called `.bubble`, a *different*, older, simpler
"floating dot" effect than the new `.blobBubble`s; don't confuse the two
class names when touching this file again), and the confetti burst — none
of that changed, only the surface-texture technique did.

Not yet visually verified in a live browser by the agent (Section 9's
standing note, same caveat as Section 19/20) — flagged to the user to
confirm the blob/gooey look actually renders as intended and performs
acceptably with 128 animated elements + an SVG filter.

**Superseded same day, later (Section 22)**: the gooey bubble/blob surface
was itself replaced with a tiled wave-texture-image technique per a second
reference the user supplied. The SVG blur filter, `BUBBLES` array, and
`seededRandom` helper described above no longer exist in the codebase —
don't go looking for them.

---

## 22. Answer Review + Second Wave-Effect Rework (2026-07-23, later still)

**22.1 — Answer review after quiz completion** (explicit new feature
request): users can now see their own submitted answer next to the correct
one for every question, once their submission is `completed`.
- `GET /api/quizzes/[id]/review` (new route) — requires the caller to
  already have a completed submission for that quiz (403 otherwise, "Complete
  this quiz first"), then returns `sanitizeQuestion(q, true)` for every
  question (the *practice-mode* sanitized shape, answer key populated) plus
  the submission's stored `answers`. Revealing the answer key here is safe
  specifically because the submission is already `completed` and immutable
  (see `app/api/submissions/route.ts`'s conflict check) — there's no
  remaining attempt to leak into.
- `components/quiz/AnswerReview.tsx` (new, wired into `ResultsClient.tsx`
  below the button grid as a collapsible "Review My Answers" section,
  lazy-fetched on first expand) — deliberately **reuses `QuestionCard`
  itself** rather than building a parallel read-only rendering path:
  passing `isLocked=true, isPractice=true` plus a per-question
  `computeFeedback()` (mirrors `lib/answer-matching.ts`'s `scoreQuestion`
  logic but client-side, using the existing `lib/quiz-client-scoring.ts`
  helpers) gets the "Correct!"/"Incorrect" banner and explanation for free,
  and — because the match-columns drag-wire body (Section 20.6) already
  tints wires green/red whenever `question.pairs` is present — match-columns
  review needed zero extra work.
- Fixed a real gap while wiring this up: `FillBlankBody` in
  `QuestionCard.tsx` previously ignored both `question` and `feedback`
  entirely (never showed the correct answer, even in practice mode before
  this). Now shows a green "Correct answer: …" line when `feedback ===
  "wrong"`.

**22.2 — Submission overlay surface swapped again**, per a second reference
the user supplied (a circular "today's progress" widget using a tiled,
repeating wave.svg background-image + horizontal-drift technique). Removed
Section 21's gooey-bubble/blur-filter approach entirely, replaced with two
`.waveTexture` layers using a real green wave asset
(`public/wave-green.svg`, a simple repeatable sine-crest tile) at different
sizes/opacities/speeds/directions riding the top edge of `.fillWrap`. Key
adaptation decision: the reference's actual mechanic (animating
`background-position` vertically via paired `fill-wave`/`fill-below`
keyframes to represent "how full" the circle is) was **not** ported
as-is — `.fillWrap`'s own Framer-Motion-driven `height: 0%→100%` animation
(unchanged since Section 19) already does that job for a full-screen
overlay; porting the reference's approach too would have fought with it.
Only the *decorative surface texture itself* (a real tiled wave image
instead of hand-drawn bezier curves or bubbles) and its continuous
horizontal "sloshing" once mounted were adopted — each layer's CSS
`@keyframes` shifts `background-position-x` by exactly that layer's own
tile width (`-360px`/`-240px`), not a percentage, since a percentage shift
on a *repeating* background is relative to (container size − image size),
not the tile period, and would visibly jump instead of looping seamlessly.

Not yet visually verified in a live browser by the agent (Section 9's
standing note, same recurring caveat) — flagged to the user to confirm the
review screen renders/scores correctly for all 4 question types and that
the new wave-texture surface looks right.

---

## 23. Cosmetic 0-100% Count-Up on the Submission Overlay (2026-07-23, later still)

Added a large bold percentage number to `SubmitLiquidOverlay.tsx`, per an
explicit user request with reference code (an "Animate UI"-style
`AnimatedNumber` + `useInView` demo built on the newer standalone `motion`
package). Two adaptation decisions worth knowing if this file is touched
again:

- **New `components/core/animated-number.tsx`** — same situation as
  `components/core/tilt.tsx` (Section 19): the referenced
  `@/components/core/animated-number` isn't an installed package, so this
  reimplements the idea (a `useSpring`-driven number that smoothly ticks
  from its old value to a new one whenever the `value` prop changes) using
  **`framer-motion`** (already a project dependency), not the `motion`
  package the reference imported `useInView` from. `springOptions` is a
  small locally-defined type, not imported from framer-motion — mirrors how
  `tilt.tsx` already handles the same "no exported options type" situation.
  Initial attempt spread generic `HTMLAttributes<HTMLSpanElement>` onto the
  underlying `motion.span` and failed to typecheck (motion components
  override several DOM event handler prop types, e.g. `onDrag`, with
  incompatible Framer-specific signatures) — fixed by only accepting the
  one prop actually needed (`className`), not a full HTML-attributes spread.
- **Deliberately not tied to the actual fill height** — explicit user
  instruction ("it need not be accurate but it needs to be 0-100"). A
  `targetPercent` state flips straight to `100` the instant `phase` leaves
  `"idle"` (i.e., the moment "filling" starts) and the spring
  (`{ duration: 1.6, bounce: 0 }`) is what makes the number visually take
  ~1.6s to count up — tuned to roughly track `FILL_SECONDS` (1.8s) by eye,
  not by measuring the real DOM fill percentage anywhere.
- Rendered inside `.centerText`, which changed from a single centered child
  to `flex-direction: column` with a gap, since the percent number and the
  existing "Answers Locked"/"Calculating…" line now show at the same time.

---

## 24. Real Scoring Bug Fix (AI-Generated Quizzes) + Submission-Overlay Rework #2 (2026-07-23, later still)

**24.1 — Real grading bug, found and verified against live DB data** (not
guessed): AI-generated quizzes were being scored one point lower than they
should — confirmed by fetching the actual quiz + submission rows and
manually replaying the grading logic. Root cause: `mapAnswerLetter` (in
`lib/answer-matching.ts`) is meant to resolve a *bare letter code*
("A"/"B"/"C"/"D") to an option string, for regex-parsed quizzes whose
answer field really is just a letter. It only ever checked
`letter.trim()[0]` — the first character — against `/^[A-Z]$/`, which
passes for *any* string that starts with a letter, not just actual bare
letter codes. AI-generated quizzes store the literal correct answer text
(e.g. `"Au"`, `"Jupiter"`) as `answer`, not a letter — so when that text
started with a letter, `isAnswerMatch` (used by `scoreQuestion` for every
mcq_single grade) silently misread it as a positional letter lookup and
compared the user's genuinely-correct answer against the WRONG option
(e.g. correct answer "Au" got reinterpreted as letter "A" → `options[0]`,
an unrelated option — so a user who correctly answered "Au" was graded
against "Ag" and marked wrong). Fixed by requiring the *entire* trimmed
string to be a bare letter (optionally with a trailing `)` or `.`) before
`mapAnswerLetter` treats it as a letter code at all. Verified with a
throwaway script (not committed) that recomputed every affected
submission's score with both the old and new logic — old logic exactly
reproduced the wrong stored scores, new logic produced the objectively
correct ones. **Also corrected the 3 already-stored submissions** this had
affected (scores bumped from 3→4 and 3→5; one affected user's cached
`users.score` best-score was checked too, though none needed bumping since
neither correction exceeded their existing cached best). mcq_multi/
fill_blank/match_columns were never affected — none of their scoring
functions call `mapAnswerLetter`.

**24.2 — Submission overlay reworked again**, per the user resupplying the
same wave/circle-fill reference and saying the previous port (Section 22)
"is not exact." The real gap: Sections 19-22 all represented "how full" via
an animated **container `height`** (0%→100%, bottom-anchored), with the
wave texture just riding that container's top edge. The reference's actual
technique is different and doesn't grow any container at all — a
fixed-size box reveals more of a solid-color layer via an animated
**`clip-path`**, with a separately-animated tiled wave texture's
`background-position-y` tracking the same line. `SubmitLiquidOverlay.tsx`
now matches that: `.waveStage` is always full-screen (never resizes); a
`.fillBody`/`.fillBodyFlat` layer's `clipPath` animates through
`polygon(0% 110%, 0% Y%, 110% Y%, 110% 110%)` waypoints (`CLIP_Y`, from
110% "nothing visible" down to ~8% "covers almost everything"), and the
`.waveTexture` layers' `backgroundPositionY` animates through a parallel
`WAVE_Y` waypoint set that sits ~10-13 points "ahead" (higher) of the clip
line — mirroring the gap the reference's own paired `.wave`/`.wave-below`
values have. Both use the *same* fast/steady/slow waypoint timing as
before (`[0, 62, 94, 100]` → `times: [0, 0.15, 0.85, 1]`). The "revealing"
slide-away is now cleanly decoupled: only `.waveStage`'s own `y` transform
(`0% → -100%`) ever moves anything for that phase; the fill/wave layers
just hold at their fully-filled clip/position values throughout waiting
and revealing. `fillWaveY`/`fillClipY` are always arrays (length 1 when
just "holding" at a value) specifically to avoid a `number | number[]`
union type fighting with Framer's keyframe typing.

Neither of these has been visually/functionally verified in a live browser
by the agent (Section 9's standing note) — flagged to the user to confirm
real quiz scores now compute correctly end-to-end (not just via the
verification script) and that the reworked fill now actually looks like
the reference.

## 25. Microsoft Teams Score Publishing (2026-07-24)

Full feature: a "Publish Scores" button that posts a quiz's completed
submissions (student ID + score, one line each) into a pre-linked Microsoft
Teams channel, via a **Workflows (Power Automate) webhook** — Teams retired
the old Incoming Webhook connector; the current supported path is a
Teams-side workflow built from the "Post to a channel when a webhook
request is received" template, which hands back a one-time HTTP POST URL.

**Scope decision**: there is no "Class" entity anywhere in this schema —
`Quiz.creatorId -> User` is the only teacher-owns-content relationship,
`Team` is a competitive quiz-taking group, not a class. So the webhook is
scoped **per teacher/admin account** (new `TeamsIntegration` model, 1:1 on
`ownerId`), not per class — every quiz that account creates shares its one
linked channel. `publish-scores` always uses the **quiz's creator's**
integration, not the calling user's — an admin publishing on a teacher's
behalf still posts to that teacher's channel.

**Payload format** — verified against current Microsoft docs/community
threads, not memory, because this is exactly the kind of thing that goes
stale:
- Body must be `{"type":"message","attachments":[{"contentType":
  "application/vnd.microsoft.card.adaptive","content": <AdaptiveCard>}]}`,
  `Content-Type: application/json` (wrong/missing content-type → 400).
- **Success is HTTP 202 Accepted, not 200** — the flow runs async. Every
  caller here checks `res.ok`, never a specific status code.
- Hard cap of **28KB per message**.
- Adaptive Cards gained a proper `Table` element in **schema v1.5**, but
  Teams mobile only reliably renders up to v1.2, and there are open
  rendering-bug reports of `Table` simply not rendering in Teams channels
  specifically (see microsoft/AdaptiveCards#7101). So the roster is built
  as a stack of `ColumnSet`s (3 columns: name/ID/score, explicit relative
  `width`s) instead — supported since v1.0, renders consistently as an
  aligned grid on every Teams client. `lib/teams-publish.ts` has the full
  reasoning inline.
- A single flow trigger throttles somewhere around ~4 requests/sec, so
  multi-message batches post **sequentially with a 400ms delay**, never
  concurrently.

**Size/roster-limit handling** (`lib/teams-publish.ts`): rows are packed
into chunks that fit a conservative ~22KB budget (measuring actual
`JSON.stringify` byte length per row, not guessing), each chunk = one
message, titled "(part i/n)" when there's more than one. If packing would
take more than 5 messages, it sends **one summary card instead** (student
count, average score, top 10, an `Action.OpenUrl` link back to
`/leaderboard?quizId=...`) rather than spamming the channel. Verified
against a live roster-size sweep (real HTTP calls to httpbin.org as a
Teams-webhook stand-in, run outside the Next.js process via `tsx` +
`--conditions=react-server` to satisfy the `server-only` import): 50 rows
→ 1 message, 100 → 2, 150 → 3, 200 → 4, 250 → 5, 400 → summary fallback.
Exactly the intended staircase.

**Secret handling**: the webhook URL is a bearer secret (Teams embeds a
signature in its query string) and must never reach the browser per the
spec. `lib/teams-crypto.ts` does AES-256-GCM (`TEAMS_WEBHOOK_ENCRYPTION_KEY`
env var, 32 raw bytes base64 — `openssl rand -base64 32`), storing
`iv:authTag:ciphertext` as one string. `GET /api/teacher/teams-integration`
only ever returns `{configured, label, lastTestedAt, lastTestOk}` — never
the URL, not even a masked suffix. Verified end-to-end against the real
Neon DB (not just unit-level): encrypt → store → fetch → decrypt matches
original; a tampered ciphertext throws (auth tag check working); the
GET route's own `select` shape genuinely has no `webhookUrlEnc` key.

**New routes**: `app/api/teacher/teams-integration/route.ts` (GET status /
PUT save+encrypt / DELETE unlink) and `.../test/route.ts` (send a test
card), both `requireApiTeacherOrAdmin`. `app/api/admin/quizzes/[id]/
publish-scores/route.ts` (`requireApiTeacherOrAdmin` + explicit
`quiz.creatorId === user.id` check for non-admins). `Quiz.scoresPublishedAt`
tracks last-published state, surfaced via the existing `/api/admin/quizzes`
list response (`scores_published_at`).

**New UI**: `components/admin/TeamsIntegrationSettings.tsx` (paste URL,
save, send test message, unlink — modeled on `DailyChallengePanel`'s
shared-section pattern), dropped into both `/admin` and `/teacher`. A
"Publish Scores" button added to both `QuizManager.tsx` (the component
`/admin` actually uses) and `TeacherPage`'s own separate inline quiz-row
JSX (it doesn't import `QuizManager` despite that file's stale header
comment claiming otherwise — confirmed by grep, only `/admin` imports it)
— shows "Published Xh ago" once set, and re-clicking an already-published
quiz requires confirming through the existing `ConfirmModal`, so a second
click can't silently re-fire.

**Known pre-existing gap, deliberately not expanded into**: `/api/admin/
quizzes` (the list both dashboards call) is hard `requireApiAdmin`-only
today — already flagged in this codebase's own comments as deferred
("Phase 3, not built"/"audit flags this as a real gap"). A real
`teacher`-role account therefore can't load its quiz list yet regardless
of this feature, so only admin accounts can exercise the whole flow
end-to-end today. `publish-scores` and `teams-integration` themselves are
still correctly teacher-owner-scoped from day one — they're just blocked
by that separate, pre-existing gap until it's fixed, which was out of
scope for this task.

Migration note: the `teams_score_publishing` migration had a side effect —
Prisma's diff engine doesn't track `idx_submission_events_quiz_id` (a
hand-written index from the `partial_indexes_and_seed` migration, never
expressible in the schema DSL) and dropped it as "drift". Restored via a
follow-up migration (`restore_submission_events_quiz_id_index`) with the
identical original DDL, same pattern the project already established for
un-representable indexes.

**25.1 — Webhook URL hostname is not stable, don't validate against it.**
The user's real tenant produced a webhook URL on the host
`default<guid>.<region>.environment.api.powerplatform.com` — not
`prod-XX.<region>.logic.azure.com`, which is what every blog post/doc used
for Section 25's original research and what `isPlausibleWorkflowsUrl` in
`app/api/teacher/teams-integration/route.ts` originally checked against
(would have rejected this real URL outright). Microsoft has apparently
moved these onto a Power Platform-routed host at least once already, so
the validator now checks the parts that are actually stable across both
observed formats instead: `https:` scheme, a `/triggers/manual/paths/
invoke` path segment, and a `sig=` query param — plus hostname ending in
either `.logic.azure.com` or `.powerplatform.com` (both allowed, since
either could show up depending on tenant/age of the workflow). Also: the
Teams UI's template name for this has changed too — users are now seeing
"Send webhook alerts to a channel" rather than "Post to a channel when a
webhook request is received" (confirmed both names are current/valid via
search, likely a Teams-version/tenant difference) — the in-app help text
in `TeamsIntegrationSettings.tsx` mentions both rather than asserting one.

**25.2 — Real bug found while testing: `Quiz.creatorId` was never set,
anywhere.** Publishing scores failed with "This quiz has no owning
teacher" on every quiz — turned out not to be specific to one quiz. None
of the four routes that create a `Quiz` row (`admin/quizzes/create`,
`admin/quizzes/upload`, `admin/quizzes/[id]/clone`, `admin/daily-
challenge`) ever passed `creatorId` to `prisma.quiz.create`, despite the
column and the `creator` relation existing since the initial schema port.
Confirmed against the live DB: all 6 existing quizzes had `creatorId =
null`. Fixed all four routes to set `creatorId: user.id` (destructuring
`user` from `requireApiAdmin()`, previously discarded as `{ error }`
only); for `clone` specifically, the *cloner* becomes the new copy's
owner, not the original quiz's creator. Backfilled the 6 existing quizzes
to the `Heat16` admin account per the user's explicit choice (there were
two admin accounts in the DB — asked rather than guessing which one).
