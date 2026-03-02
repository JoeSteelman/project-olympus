import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [players, teams, session] = await Promise.all([
    prisma.user.findMany({
      orderBy: { displayName: "asc" },
      include: { team: true }
    }),
    prisma.team.findMany({
      orderBy: { createdAt: "asc" }
    }),
    prisma.gameSession.findFirst({
      where: { status: "ACTIVE" },
      include: {
        assignments: {
          orderBy: {
            assignedAt: "desc"
          }
        }
      }
    })
  ]);

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const assignmentTeamByUser = new Map<string, string | null>();

  session?.assignments.forEach((assignment) => {
    if (!assignmentTeamByUser.has(assignment.userId)) {
      assignmentTeamByUser.set(assignment.userId, assignment.teamId ?? null);
    }
  });

  return NextResponse.json({
    teams,
    players: players.map((player) => {
      const effectiveTeamId =
        session && assignmentTeamByUser.has(player.id)
          ? assignmentTeamByUser.get(player.id) ?? null
          : player.teamId;
      const effectiveTeam = effectiveTeamId ? teamsById.get(effectiveTeamId) ?? null : null;

      return {
        id: player.id,
        displayName: player.displayName,
        avatarUrl: player.avatarUrl,
        team: effectiveTeam
          ? {
              id: effectiveTeam.id,
              name: effectiveTeam.name
            }
          : null,
        baseTeam: player.team
          ? {
              id: player.team.id,
              name: player.team.name
            }
          : null
      };
    })
  });
}
