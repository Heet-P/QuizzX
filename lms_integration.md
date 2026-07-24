# LMS Integration — Decision Record

**Date:** 2026-07-23
**Trigger:** [competitor_analysis.md](competitor_analysis.md) flagged LMS/gradebook integration as a gap — Moodle has it natively, Wayground/Kahoot sync rosters with Canvas/Schoology/Clever/ClassLink.
**Status:** Decision made, nothing built yet.

## Current state

Zero LMS-related code exists in the repo today (no OAuth, no LTI, no roster sync). The closest thing is an existing admin-only CSV export (`app/api/leaderboard/export/route.ts`) that dumps per-quiz or per-team scores — a manual download/upload workflow, not an integration.

## Approaches considered

### A — Gradebook-compatible CSV export (recommended, build when ready)
Reshape the existing CSV export's columns to match what Canvas, Moodle, Schoology, and Blackboard each expect for bulk grade import (student name/email/ID + a score column named to match an assignment). No new dependencies, no OAuth, no ongoing API surface to maintain. Doesn't help Google Classroom (its teacher UI has no bulk CSV import), but covers four major LMSes for near-zero cost. Stays a manual admin action, not real-time passback.

### B — Google Classroom integration
OAuth (reusable via Clerk's existing Google sign-in) + Classroom API for roster import and grade push. Blocked by Google's sensitive-scope app-verification review (privacy policy, scope-justification video, days-to-weeks turnaround) before it can ship to real users — an externally-gated cost, not just a coding cost. Also has no manual-CSV fallback since Classroom's UI doesn't support bulk grade import at all, so this path requires the API to work at all.

### C — Full LTI 1.3 provider
LMS-agnostic SSO launch + roster sync (NRPS) + automated grade passback (AGS), the standard Canvas/Moodle/Schoology/Blackboard all speak, and what Wayground/Kahoot actually built. Genuinely weeks of work: JWT/OAuth2 key rotation, per-LMS tool registration, sandbox testing against real LMS instances.

## Decision

**Build A when there's time; defer B and C.** Reasoning: B and C both solve for *automated* integration, which isn't yet a problem QuizzX has — there's no pilot classroom or LMS partnership asking for it, and the product itself is still early (per the same-session over-engineering audit, some existing routes are built but unwired). Spending weeks on LTI, or fighting Google's app-review process, before a single real user needs it is exactly the kind of premature engineering worth skipping.

**Revisit trigger:** a specific classroom/instructor commits to piloting QuizzX and asks for automated grade sync or roster import. At that point, re-run this decision with a real target LMS named (Canvas vs. Google Classroom have very different integration paths) rather than building speculatively for "LMS integration" in the abstract.

## What "build A" concretely looks like, when it's time

- Add a `?format=gradebook` (or similar) mode to the existing export route, or a small sibling route, reusing `lib/csv-response.ts`.
- Canvas format: `Student,ID,SIS User ID,SIS Login ID,Section,<Assignment Name>` — the assignment name must match an existing Canvas assignment exactly for import to attach scores to it.
- Moodle/Schoology accept looser CSV shapes (name/email + score column) — the Canvas-shaped file works for those too with the extra ID columns ignored.
- No schema changes needed — `User.username`/`User.email` and existing `Submission.score` cover it.
