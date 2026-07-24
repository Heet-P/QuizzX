# Gradebook CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a teacher download a per-quiz CSV of student scores shaped for LMS gradebook import (Canvas, Moodle, Schoology all accept a name/email identity column plus a score column for bulk grade import).

**Architecture:** One new GET route returning a CSV built from existing `Submission`/`User` data (no schema changes), plus one new download button in the existing `QuizManager` quiz-row UI, both following patterns already established by the neighboring `integrity` and `publish-scores` routes in this codebase.

**Tech Stack:** Next.js Route Handlers, Prisma, existing `lib/csv-response.ts` helper, `lucide-react` icons, `apiFetchBlob` client helper.

## Global Constraints

- No Prisma schema changes — `User.username`/`User.email` and `Submission.score` already cover every column needed.
- No new dependencies — reuse `lib/csv-response.ts` (`csvResponse`, `csvField`).
- Auth/ownership must mirror `app/api/admin/quizzes/[id]/publish-scores/route.ts`: `requireApiTeacherOrAdmin()`, then 403 unless `user.role === "admin"` or `quiz.creatorId === user.id`. (Deliberately not `requireApiAdmin()` like the older `integrity` route — this feature is for teachers exporting their own quizzes.)
- CSV columns are `Student,Email,<Quiz Title>` — **not** the Canvas-legacy `Student,ID,SIS User ID,SIS Login ID,Section,<Assignment>` shape floated in `lms_integration.md`. This repo has no SIS ID or Section data anywhere in the schema, so those columns would just be permanently blank. Email is the real, universal identity column Canvas/Moodle/Schoology all match students on for CSV grade import — that's what actually makes the file usable, not a longer header row.
- This repo has zero test framework (no vitest/jest/playwright, no `test` script) and no existing route in it has automated tests. Adding one now for a single small route would be new infrastructure disproportionate to the feature (violates the project's YAGNI stance). Verification steps below are manual (dev server + `curl` + browser), matching how every other feature in this codebase has been verified.

---

### Task 1: Gradebook CSV export route

**Files:**
- Create: `app/api/admin/quizzes/[id]/gradebook/route.ts`

**Interfaces:**
- Consumes: `requireApiTeacherOrAdmin` from `@/lib/api-auth`, `prisma` from `@/lib/prisma`, `csvResponse`/`csvField` from `@/lib/csv-response`.
- Produces: `GET /api/admin/quizzes/:id/gradebook` → `200` with `Content-Type: text/csv` body `Student,Email,<Quiz Title>\n...` on success; `401`/`403`/`404` JSON errors otherwise. Consumed by Task 2's frontend button via `apiFetchBlob`.

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { requireApiTeacherOrAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { csvResponse, csvField } from "@/lib/csv-response";

// GET /api/admin/quizzes/:id/gradebook — CSV of completed submissions shaped
// for LMS gradebook import (Canvas/Moodle/Schoology all match students by a
// name/email column when bulk-importing grades). Same ownership rule as
// publish-scores: the quiz's owning teacher, or an admin.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiTeacherOrAdmin();
  if (error) return error;
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    select: { id: true, title: true, creatorId: true },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  if (user.role !== "admin" && quiz.creatorId !== user.id) {
    return NextResponse.json({ error: "You can only export the gradebook for quizzes you created" }, { status: 403 });
  }

  const submissions = await prisma.submission.findMany({
    where: { quizId: id, status: "completed" },
    select: { score: true, user: { select: { username: true, email: true } } },
    orderBy: { user: { username: "asc" } },
  });

  const csv = [
    `Student,Email,${csvField(quiz.title)}`,
    ...submissions.filter((s) => s.user).map((s) => `${csvField(s.user!.username)},${csvField(s.user!.email)},${s.score}`),
  ];

  const filename = `gradebook_${quiz.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
  return csvResponse(csv, filename);
}
```

- [ ] **Step 2: Verify auth gating manually**

Start the dev server (`npm run dev`), then from another terminal:

```bash
curl -i http://localhost:3000/api/admin/quizzes/00000000-0000-0000-0000-000000000000/gradebook
```

Expected: `HTTP/1.1 401` (no session cookie) — confirms the route is reachable and gated. (Testing the 403-for-non-owner and 404-for-missing-quiz branches requires a logged-in session with real IDs — cover those in Task 2's browser walkthrough instead, where a real session already exists.)

- [ ] **Step 3: Verify a real export as the owning teacher**

Log into the app as a teacher who owns at least one quiz with completed submissions (or as an admin), then in the browser:

```
http://localhost:3000/api/admin/quizzes/<real-quiz-id>/gradebook
```

Expected: browser downloads/displays a CSV starting with `Student,Email,"<Quiz Title>"` followed by one row per completed submission, scores matching what's shown in that quiz's leaderboard/analytics.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/quizzes/\[id\]/gradebook/route.ts
git commit -m "Add per-quiz gradebook CSV export for LMS grade import"
```

---

### Task 2: "Download Gradebook CSV" button in QuizManager

**Files:**
- Modify: `components/admin/QuizManager.tsx`

**Interfaces:**
- Consumes: `apiFetchBlob`, `errorMessage` from `@/lib/api-client` (already imported in this file); `GET /api/admin/quizzes/:id/gradebook` from Task 1.
- Produces: nothing new consumed elsewhere — this is the final, user-facing piece.

- [ ] **Step 1: Add the `Download` icon import**

In `components/admin/QuizManager.tsx`, add `Download` to the existing `lucide-react` import block (currently `Zap, Trash2, Rocket, Archive, Users, User, BarChart2, FileText, Shield, ChevronDown, ChevronUp, Star, Circle, CircleDot, Square, Key, Shuffle, MessagesSquare`):

```ts
  Download,
```

- [ ] **Step 2: Add the download handler**

Immediately after the existing `handleDownloadIntegrity` function (which ends with the `catch` block calling `toast.error(errorMessage(err, "Failed to download integrity report"))`), add:

```ts
  const handleDownloadGradebook = async (quizId: string, title: string) => {
    try {
      const blob = await apiFetchBlob(`/api/admin/quizzes/${quizId}/gradebook`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `gradebook_${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to download gradebook CSV"));
    }
  };
```

- [ ] **Step 3: Add the button next to the existing integrity-download button**

Find this existing button in the quiz row actions:

```tsx
                      <button
                        onClick={() => handleDownloadIntegrity(quiz.id, quiz.title)}
                        className="btn-tactile text-xs bg-white py-2 px-3"
                        title="Download integrity CSV"
                      >
                        <FileText size={14} />
                      </button>
```

Add immediately after it:

```tsx
                      <button
                        onClick={() => handleDownloadGradebook(quiz.id, quiz.title)}
                        className="btn-tactile text-xs bg-white py-2 px-3"
                        title="Download gradebook CSV (Canvas/Moodle/Schoology import)"
                      >
                        <Download size={14} />
                      </button>
```

- [ ] **Step 4: Verify in the browser**

With the dev server running, go to `/teacher` (or `/admin`) logged in as a quiz's owning teacher (or an admin), find a quiz with completed submissions, and click the new download-icon button next to the integrity-report button. Expected: a `gradebook_<title>_<date>.csv` file downloads with `Student,Email,<Quiz Title>` header and one row per completed submission — same student list/scores as Task 1's manual check.

Also click it on a quiz you don't own (as a non-admin teacher, if a second teacher account is available) and confirm the toast shows "Failed to download gradebook CSV" rather than a silent failure or crash.

- [ ] **Step 5: Commit**

```bash
git add components/admin/QuizManager.tsx
git commit -m "Add Download Gradebook CSV button to quiz control center"
```
