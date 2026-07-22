import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { leaveCurrentTeam, assertNoLiveTeamQuiz, TeamActionError } from "@/lib/team-helpers";

// POST /api/teams/join — ported from TeamController.joinTeam.
export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const teamCode: string = typeof body?.teamCode === "string" ? body.teamCode.trim().toUpperCase() : "";
  if (teamCode.length !== 6) {
    return NextResponse.json({ error: "Team code must be 6 characters" }, { status: 400 });
  }

  try {
    const team = await prisma.$transaction(async (tx) => {
      await assertNoLiveTeamQuiz(tx, "switch teams");
      await leaveCurrentTeam(tx, user.id);

      const found = await tx.team.findUnique({ where: { teamCode } });
      if (!found) {
        throw new TeamActionError("Team not found. Check the code and try again.", 404);
      }

      await tx.teamMember.create({ data: { teamId: found.id, userId: user.id, role: "member" } });

      const members = await tx.teamMember.findMany({
        where: { teamId: found.id },
        orderBy: { joinedAt: "asc" },
        include: { user: { select: { username: true } } },
      });

      return { found, members };
    });

    return NextResponse.json({
      success: true,
      team: {
        id: team.found.id,
        team_code: team.found.teamCode,
        name: team.found.name,
        members: team.members.map((m) => ({
          user_id: m.userId,
          username: m.user.username,
          role: m.role,
          joined_at: m.joinedAt,
        })),
      },
    });
  } catch (err) {
    if (err instanceof TeamActionError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Error joining team:", err);
    return NextResponse.json({ error: "Failed to join team" }, { status: 500 });
  }
}
