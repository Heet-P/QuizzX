import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { getStreakCalendar } from "@/lib/profile-data";

// GET /api/users/me/streak-calendar — ported from UserController.getStreakCalendar.
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const map = await getStreakCalendar(user.id);
  return NextResponse.json(map);
}
