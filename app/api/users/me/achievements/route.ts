import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { getMyAchievements } from "@/lib/dashboard-data";

// GET /api/users/me/achievements — ported from UserController.getMyAchievements.
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const rows = await getMyAchievements(user.id);
  return NextResponse.json(
    rows.map((r) => ({
      achievement: r.achievement,
      earned_at: r.earnedAt,
      name: r.name,
      description: r.description,
      icon: r.icon,
      xp_reward: r.xpReward,
    }))
  );
}
