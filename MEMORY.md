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

### 6.2 Migration status — schema never pushed to a real database yet

**Critical fact, verified directly against the filesystem:** `prisma/migrations/`
**does not exist**. `npx prisma migrate dev` (or `db push`) has never been run
against any database, real or otherwise. The schema is fully written and
should be correct, but it is **unverified against an actual Postgres instance**.

`.env.local` does have real (non-placeholder) values populated for both
`DATABASE_URL` and `DIRECT_URL` — meaning a real Neon project has been
provisioned and its connection strings supplied — but that database has never
actually had the schema applied to it. **Before any application code that
touches the database can be tested, someone needs to run the first migration**
and also hand-write the two partial-index follow-up migration mentioned in
6.1, plus seed data: `app_settings` rows (`leaderboard_visible`,
`current_season`, `season_start`) and the 7 `achievements` catalogue rows
(audit Section 5 checklist item) — none of this seeding exists yet either.

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

### 8.1 Pages/routes — 1 of 15 built (landing only)

v1 had 15 page components (audit Section 2). Status in v2:

| Route | Built in v2? |
|---|---|
| `/` (landing) | **Yes** — extensively iterated, see Section 7 |
| `/login`, `/register` | **Yes** — Clerk catch-all routes exist |
| `/dashboard` | No |
| `/quizzes` | No |
| `/quiz/:id` | No — this is the most complex single piece of v1 frontend logic (audit Section 8, ~770 lines, 15 `useState`s); budget real time for it |
| `/quiz/:id/results` | No |
| `/leaderboard` | No — also needs the new SSE hook (Section 5.1) |
| `/team` | No |
| `/admin` | No |
| `/admin/proctor/:quizId` | No |
| `/teacher` | No |
| `/profile` | No |
| `/live`, `/live/:code` | No |
| `/live/:code/display` | No |

`app/(protected)/layout.tsx` (the auth-gate shell + `AppNav`) exists and is
ready to wrap all of the above once their `page.tsx` files are created —
this is genuine, tested-in-principle scaffolding, not a stub.

### 8.2 API endpoints — none built yet

v1 has these route groups (audit Section 4, full request/response detail
there): `/quizzes` (7 endpoints), `/admin` (14 endpoints), `/ai` (4
endpoints), `/leaderboard` (4 endpoints incl. SSE), `/proctor` (2 endpoints),
`/rooms` (5 endpoints), `/submissions` (5 endpoints, including the ~7-step
grading transaction with achievement rules), `/teams` (4 endpoints), `/users`
(8 endpoints). `/game` is explicitly dropped (Section 5.4).

**Zero of these exist in v2 yet.** No `app/api/` directory at all. When
building these, remember: drop the `/api/v1` prefix (Section 5.3), and reuse
`types/quiz.ts`'s `normalizeQuizSettings()` rather than re-deriving quiz
settings defaults/legacy-mode translation again (Section 5.6).

The auth-sync logic that v1 ran as middleware before every protected request
(`authMiddleware.js`: look up by `clerk_id` → fall back to lookup-by-email +
backfill → else create a new user with a generated username/user_code,
collision-retried) **has already been ported** — see `lib/auth.ts`'s
`getCurrentUser()`. This is done and matches the audit's checklist for that
piece.

### 8.3 Cross-cutting shared logic — status

- Quiz settings type + normalization: **done** (`types/quiz.ts`).
- Answer matching / letter resolution: **not ported** (no
  `lib/answer-matching.ts` yet).
- Seeded shuffle: **not ported**.
- CSV export helper: **not built** (no export routes exist yet).

---

## 9. Known Issues / Things Actively NOT Working

- **No application pages exist beyond the landing page and auth.** This is
  the single biggest gap — see Section 8.1.
- **No API routes exist at all.** See Section 8.2.
- **Database schema has never been migrated to a real database.** See
  Section 6.2 — `prisma/migrations/` doesn't exist. Nothing that touches the
  DB has been runtime-tested against real data.
- **No seed data** — `app_settings` defaults and the 7 `achievements`
  catalogue rows don't exist anywhere yet (need to be created as part of the
  first migration).
- **`AuthCTA.tsx`'s signed-in branch is currently unreachable** — `app/page.tsx`
  redirects any signed-in `userId` to `/dashboard` (which doesn't exist yet
  either, so this redirect would currently 404) before the landing page ever
  renders for a logged-in user. Flagged to the user, not resolved (Section 15).
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
- **Nothing is committed to git except the original scaffold** — see Section
  14. Do not assume any git history reflects the current state; the working
  tree is authoritative.
- **The user has explicitly said not to use Playwright/headless-browser
  tooling for self-initiated UI verification** (memory: `feedback_no_playwright_visual_checks`)
  — default to `npm run build` + code review; the user does their own manual
  visual checks. (There was a temporary exception granted mid-project after a
  build-passing-but-visually-broken incident, then explicitly revoked again
  — treat "don't use it" as the standing default unless the user says
  otherwise in the moment.)

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
- **Phase 2 — Frontend**: **Partially done, landing-page-only.** The landing
  page is fully built and heavily iterated (Section 7). **None of the 12
  application pages exist** (dashboard, quizzes, quiz-taking, results,
  leaderboard, team, profile, admin, teacher, proctor, live-lobby, presenter)
  — see Section 8.1.
- **Phase 3 — Backend**: **Not started.** Zero Route Handlers exist. See
  Section 8.2 for the full endpoint list to build.
- **Phase 4 — Auth**: **Mostly done for the "is anyone signed in" layer**
  (`lib/auth.ts`, `app/(protected)/layout.tsx`). **Not done**: per-role
  authorization matrix (admin/teacher gating) matching v1's exact behavior —
  `AppNav.tsx` has role-conditional nav links built already
  (`isAdmin`-gated `/live`/`/admin` links) but there's no actual `/admin` or
  `/teacher` page yet to enforce anything on.
- **Phase 5 — Database/Storage**: **Schema written, not migrated** (Section
  6.2). **R2 storage: not started** (Section 5.2, 9).
- **Phase 6 — Verification**: **Not started** — can't meaningfully verify
  parity against `MIGRATION_AUDIT.md`'s checklists until Phases 2–5 are
  substantially further along. The audit's per-endpoint/per-page checkboxes
  are all still unchecked.

**Bottom line for a new agent**: if asked "what should I work on next" with
no other context, the honest answer is Phase 3 (backend endpoints) and Phase
2 (the 12 missing app pages) are where all the actual product-feature work
remains — the landing page, while extensively polished, is marketing surface
area, not the app itself.

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
   description + color palette) to a `svg_request.md` file for the user to
   commission real artwork, rather than falling back to an emoji or a
   vague/wrong icon.
10. **This is a structural-migration project with an explicitly reversed
    "don't redesign" instruction** (Section 5.5) — if any future instruction
    seems to contradict "preserve v1 UI exactly," that's not a
    contradiction to flag, it's already been explicitly superseded. Don't
    revert redesign work citing the original brief; the redesign is the
    current, standing instruction.

---

## 14. Git / Version Control Status

**Critical, easy to miss**: `git log` shows exactly **one commit** —
`d1af297 "Initial commit from Create Next App"`. Every single change
described in this entire file — the full landing page, the design system
swap, the auth wiring, the Prisma schema, all of it — is currently
**uncommitted working-tree state**. `git status --short` shows the working
tree has substantial modifications and many untracked new files/directories
(`.agents/`, `.claude/`, `.env.local.example`, `answer_icreate.md`,
`app/(protected)/`, `app/fonts/`, `app/login/`, `app/register/`, and more).

Also notable in `git status`: `package.json`/`package-lock.json` show
uncommitted changes that **predate any work in this file's history** — it
looks like several real dependencies (Clerk, Prisma, framer-motion, etc.)
were installed at some point but `package.json` itself was never
re-committed to reflect them until an unrelated `npm install` incidentally
triggered npm to reconcile it. This diff has been left alone (not part of
any single feature's scope) but is worth committing along with everything
else.

The default template's placeholder SVGs (`public/file.svg`, `globe.svg`,
`next.svg`, `vercel.svg`, `window.svg`) were deleted at some point (shown as
`D` in git status) — intentional cleanup, not an accident.

**Implication for a new agent**: don't assume `git log`/`git blame` tell you
anything useful about *when* or *why* a piece of this project was built —
almost the entire history lives only in this MEMORY.md and in prior
conversation context, not in git. If you're asked to commit, the user has
not yet done so themselves despite extensive work existing — confirm scope
with them (staging everything at once vs. splitting into logical commits)
rather than assuming a single big commit is wanted, since a project this
size might warrant being broken into a few logical commits (e.g., scaffold +
auth + schema as one, landing page redesign as another) rather than one
giant one.

---

## 15. Open Questions For The User

Things flagged during development that were never explicitly resolved —
don't silently pick an answer, ask or flag again if they become relevant:

1. **Should `app/page.tsx` stop redirecting signed-in users to `/dashboard`?**
   `AuthCTA.tsx`'s logged-in UI (real avatar via `UserButton`, "Start a
   Quiz" link) is built correctly but currently unreachable because of this
   redirect (Section 7.1 point 14, Section 9). Also somewhat moot until
   `/dashboard` actually exists (Section 8.1) — redirecting there today would
   404.
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
