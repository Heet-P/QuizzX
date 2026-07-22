import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateTeamCode, leaveCurrentTeam, assertNoLiveTeamQuiz, TeamActionError } from "@/lib/team-helpers";

// POST /api/teams — create a team, ported from TeamController.createTeam.
export async function POST(req: Request) {
  const { user, error } = await requireApiUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const name: string = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 2) {
    return NextResponse.json({ error: "Team name must be at least 2 characters" }, { status: 400 });
  }

  try {
    const team = await prisma.$transaction(async (tx) => {
      await assertNoLiveTeamQuiz(tx, "switch teams");
      await leaveCurrentTeam(tx, user.id);

      let teamCode = generateTeamCode();
      while (await tx.team.findUnique({ where: { teamCode } })) {
        teamCode = generateTeamCode();
      }

      const created = await tx.team.create({ data: { teamCode, name, createdBy: user.id } });
      await tx.teamMember.create({ data: { teamId: created.id, userId: user.id, role: "leader" } });
      return created;
    });

    return NextResponse.json(
      {
        success: true,
        team: {
          id: team.id,
          team_code: team.teamCode,
          name: team.name,
          created_at: team.createdAt,
          members: [{ user_id: user.id, username: user.username, role: "leader" }],
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof TeamActionError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Error creating team:", err);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
