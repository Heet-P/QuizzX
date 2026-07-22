import "server-only";
import { prisma } from "./prisma";

// Ported from v1's UserController.getStreakCalendar — last 91 days of
// completed-submission counts per UTC day, as a day -> count map.
export async function getStreakCalendar(userId: string): Promise<Record<string, number>> {
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT DATE(submitted_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS count
    FROM submissions
    WHERE user_id = ${userId}::uuid
      AND status = 'completed'
      AND submitted_at >= NOW() - INTERVAL '91 days'
    GROUP BY day
  `;

  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.day.toISOString().split("T")[0]] = Number(row.count);
  }
  return map;
}

export interface ProfileTeam {
  name: string;
  team_code: string;
  your_role: string;
  member_count: number;
}

export async function getMyTeam(userId: string): Promise<ProfileTeam | null> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    include: { team: { include: { _count: { select: { members: true } } } } },
  });
  if (!membership) return null;

  return {
    name: membership.team.name,
    team_code: membership.team.teamCode,
    your_role: membership.role,
    member_count: membership.team._count.members,
  };
}
