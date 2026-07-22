import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

interface FeaturedRow {
  id: string;
  title: string;
  settings: unknown;
}

// POST /api/admin/quizzes/:id/feature — ported from AdminService.featureQuiz.
// Un-features every live quiz first (single-featured invariant), then
// features this one. Raw SQL to match v1's jsonb merge (`settings || '{...}'`)
// exactly — not cleanly expressible via Prisma's query builder.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiAdmin();
  if (error) return error;
  const { id } = await params;

  const rows = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE quizzes SET settings = settings::jsonb - 'featured' || '{"featured": false}'::jsonb WHERE status='live'
    `;
    return tx.$queryRaw<FeaturedRow[]>`
      UPDATE quizzes SET settings = settings::jsonb || '{"featured": true}'::jsonb WHERE id=${id}::uuid
      RETURNING id, title, settings
    `;
  });

  const quiz = rows[0];
  if (!quiz) return NextResponse.json({ error: "Quiz not found or not live" }, { status: 404 });

  return NextResponse.json({ success: true, quiz, message: "Quiz is now featured" });
}
