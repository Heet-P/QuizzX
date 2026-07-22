import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import type { QuizSettings } from "@/types/quiz";

// POST /api/quizzes/:id/verify-pin — ported from QuizController.verifyPin.
// Bcrypt-compares if the stored code is a hash ($2a$/$2b$ prefix), else falls
// back to plain-text compare for legacy PINs.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiUser();
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const pin: string = body?.pin ?? "";

  const quiz = await prisma.quiz.findUnique({ where: { id }, select: { settings: true } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const settings = (quiz.settings ?? {}) as unknown as QuizSettings;
  if (!settings.accessCode) return NextResponse.json({ valid: true });

  const stored = settings.accessCode;
  const valid = stored.startsWith("$2b$") || stored.startsWith("$2a$") ? await bcrypt.compare(pin, stored) : pin === stored;

  return NextResponse.json({ valid });
}
