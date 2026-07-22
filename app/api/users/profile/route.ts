import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET/PUT /api/users/profile — ported from UserController.getProfile/updateProfile.
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    user_code: user.userCode,
    score: user.score,
    xp: user.xp,
    streak_count: user.streakCount,
    last_quiz_at: user.lastQuizAt,
    created_at: user.createdAt,
  });
}

export async function PUT(req: Request) {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  if (username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
  }

  const taken = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, id: { not: user.id } },
  });
  if (taken) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { username },
  });

  return NextResponse.json({
    message: "Profile updated",
    user: {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      user_code: updated.userCode,
      xp: updated.xp,
      streak_count: updated.streakCount,
    },
  });
}
