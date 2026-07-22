import "server-only";
import crypto from "crypto";
import type { Prisma } from "@/lib/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Thrown inside a team transaction to bail out with a specific HTTP status + message. */
export class TeamActionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TeamActionError";
    this.status = status;
  }
}

/** Ported from TeamController.js's generateTeamCode. */
export function generateTeamCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase().substring(0, 6);
}

/**
 * Ported from TeamController.js's leaveCurrentTeam: removes the user from
 * their current team (if any), promotes the next-joined member to leader if
 * the leaver was one, or deletes the team if they were the last member.
 */
export async function leaveCurrentTeam(tx: Tx, userId: string): Promise<void> {
  const membership = await tx.teamMember.findFirst({ where: { userId }, select: { teamId: true, role: true } });
  if (!membership) return;

  const { teamId, role } = membership;
  await tx.teamMember.deleteMany({ where: { userId, teamId } });

  if (role === "leader") {
    const nextMember = await tx.teamMember.findFirst({
      where: { teamId },
      orderBy: { joinedAt: "asc" },
    });
    if (nextMember) {
      await tx.teamMember.update({ where: { id: nextMember.id }, data: { role: "leader" } });
    } else {
      await tx.team.delete({ where: { id: teamId } });
    }
  }
}

/** Throws TeamActionError(403) if a live team-mode quiz is currently running. */
export async function assertNoLiveTeamQuiz(tx: Tx, action: "switch teams" | "leave your team"): Promise<void> {
  const live = await tx.quiz.findFirst({
    where: { status: "live", settings: { path: ["quiz_mode"], equals: "team" } },
    select: { id: true },
  });
  if (live) {
    throw new TeamActionError(`A team quiz is currently live. You cannot ${action} during an active quiz.`, 403);
  }
}
