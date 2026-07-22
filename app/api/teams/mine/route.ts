import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { leaveCurrentTeam, assertNoLiveTeamQuiz, TeamActionError } from "@/lib/team-helpers";

// GET /api/teams/mine — ported from TeamController.getMyTeam.
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const membership = await prisma.teamMember.findFirst({ where: { userId: user.id }, select: { teamId: true, role: true } });
  if (!membership) return NextResponse.json({ team: null });

  const team = await prisma.team.findUnique({ where: { id: membership.teamId } });
  if (!team) return NextResponse.json({ team: null });

  const members = await prisma.teamMember.findMany({
    where: { teamId: membership.teamId },
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { username: true, userCode: true } } },
  });

  return NextResponse.json({
    team: {
      id: team.id,
      team_code: team.teamCode,
      name: team.name,
      created_at: team.createdAt,
      your_role: membership.role,
      members: members.map((m) => ({
        user_id: m.userId,
        username: m.user.username,
        user_code: m.user.userCode,
        role: m.role,
        joined_at: m.joinedAt,
      })),
    },
  });
}

// DELETE /api/teams/mine — ported from TeamController.leaveTeam.
export async function DELETE() {
  const { user, error } = await requireApiUser();
  if (error) return error;

  try {
    await prisma.$transaction(async (tx) => {
      await assertNoLiveTeamQuiz(tx, "leave your team");

      const membership = await tx.teamMember.findFirst({ where: { userId: user.id } });
      if (!membership) throw new TeamActionError("You are not in a team", 400);

      await leaveCurrentTeam(tx, user.id);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof TeamActionError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Error leaving team:", err);
    return NextResponse.json({ error: "Failed to leave team" }, { status: 500 });
  }
}
