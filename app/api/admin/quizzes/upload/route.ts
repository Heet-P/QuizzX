import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mammoth from "mammoth";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { parseMarkdown } from "@/lib/quiz-parser";
import { normalizeQuizSettings } from "@/types/quiz";

// POST /api/admin/quizzes/upload — ported from AdminController.uploadQuiz.
// Parses a .docx/.txt/.md quiz document (multipart form) into questions,
// builds settings from the other form fields, creates a draft quiz.
export async function POST(req: Request) {
  const { user, error } = await requireApiAdmin();
  if (error) return error;

  const form = await req.formData();
  const file = form.get("quizFile");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  try {
    const origName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let markdown: string;
    if (origName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      markdown = result.value;
    } else {
      markdown = buffer.toString("utf8");
    }

    const questions = parseMarkdown(markdown);
    const title = (form.get("title") as string) || "Untitled Quiz";

    const accessCodeRaw = form.get("accessCode") as string | null;
    const settings = normalizeQuizSettings({
      timer: (form.get("timer") as never) || "global",
      duration: parseInt(form.get("duration") as string) || 60,
      secondsPerQuestion: parseInt(form.get("secondsPerQuestion") as string) || 30,
      visibility: (form.get("visibility") as never) || "single",
      navigation: (form.get("navigation") as never) || "free",
      answerLock: (form.get("answerLock") as never) || "changeable",
      shuffleQuestions: form.get("shuffleQuestions") === "true",
      shuffleOptions: form.get("shuffleOptions") === "true",
      pointsPerCorrect: parseInt(form.get("pointsPerCorrect") as string) || 1,
      negativeMarking: parseFloat(form.get("negativeMarking") as string) || 0,
      tabSwitch: (form.get("tabSwitch") as never) || "auto_submit",
      copyProtection: form.get("copyProtection") !== "false",
      quiz_mode: (form.get("quiz_mode") as never) || "individual",
      max_team_size: parseInt(form.get("max_team_size") as string) || 4,
      startAt: (form.get("startAt") as string) || null,
      endAt: (form.get("endAt") as string) || null,
      accessCode: accessCodeRaw ? await bcrypt.hash(accessCodeRaw, 10) : null,
      poolSize: parseInt(form.get("poolSize") as string) || null,
      showCount: parseInt(form.get("showCount") as string) || null,
      mode: (form.get("mode") as never) || undefined,
    });

    const quiz = await prisma.quiz.create({
      data: {
        title,
        questions: questions as unknown as object,
        settings: settings as unknown as object,
        isActive: false,
        status: "draft",
        creatorId: user.id,
      },
    });

    return NextResponse.json(
      { success: true, quizId: quiz.id, questionCount: questions.length, message: "Quiz uploaded. Activate to go live." },
      { status: 201 }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to process quiz" }, { status: 500 });
  }
}
