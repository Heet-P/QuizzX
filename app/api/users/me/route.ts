import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";

// GET /api/users/me — lightweight session identity, used by AppNav-equivalent
// clients for role gating. Ported from UserController.getMe.
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    user_code: user.userCode,
  });
}
