import { getAvatar } from "@/lib/avatars";
import { prisma } from "@/lib/prisma";
import type { DashboardSummary, GameSummary, ScoreEntrySummary, TeamSummary } from "@/lib/types";

type DashboardDb = Awaited<ReturnType<typeof loadDashboardDb>>;

export async function loadDashboardDb() {
  const [config, teams, games, entries, recentEntries] = await Promise.all([
    prisma.eventConfig.findFirst(),
    prisma.team.findMany({
      include: {
        players: {
          orderBy: {
            displayName: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.game.findMany({
      orderBy: {
        sortOrder: "asc"
      }
    }),
    prisma.scoreEntry.findMany({
      include: {
        game: true,
        user: true
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.scoreEntry.findMany({
      include: {
        game: true,
        user: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 24
    })
  ]);

  return { config, teams, games, entries, recentEntries };
}

function computeTeamSummary(
  teamId: string,
  teamName: string,
  winningScore: number,
  totalAvailablePoints: number,
  allEntries: DashboardDb["entries"],
  roster: TeamSummary["roster"]
) {
  const teamEntries = allEntries.filter((entry) => entry.teamId === teamId);
  const score = teamEntries.reduce((sum, entry) => sum + entry.teamPoints + entry.playerPoints, 0);
  const usedPoints = teamEntries.reduce((sum, entry) => sum + entry.teamPoints + entry.playerPoints, 0);
  const remainingToWin = Math.max(winningScore - score, 0);
  const potentialFinal = score + Math.max(totalAvailablePoints - usedPoints, 0);
  const denominator = Math.max(potentialFinal + remainingToWin, 1);
  const winProbability = Number(
    Math.min(Math.max(((score + Math.max(totalAvailablePoints - usedPoints, 0) * 0.45) / denominator) * 100, 1), 99).toFixed(1)
  );

  return {
    id: teamId,
    name: teamName,
    score,
    remainingToWin,
    winProbability,
    roster
  };
}

export function buildDashboardSummary(db: DashboardDb): DashboardSummary {
  const winningScore = db.config?.winningScore ?? 500;
  const eventName = db.config?.eventName ?? "Project Olympus";
  const enabledGames = db.games.filter((game) => game.enabled);
  const totalAvailablePoints = enabledGames.reduce(
    (sum, game) => sum + game.maxAvailablePoints,
    0
  );
  const totalScoredPoints = db.entries.reduce(
    (sum, entry) => sum + entry.teamPoints + entry.playerPoints,
    0
  );

  const teamSummaries = db.teams.map((team) =>
    computeTeamSummary(
      team.id,
      team.name,
      winningScore,
      totalAvailablePoints,
      db.entries,
      team.players.map((player) => ({
        id: player.id,
        name: player.displayName,
        email: player.email,
        avatarKey: player.avatarKey,
        teamId: team.id
      }))
    )
  );

  const [teamA, teamB] = teamSummaries;

  const lanes = db.teams.flatMap((team) =>
    team.players.map((player) => {
      const avatar = getAvatar(player.avatarKey);
      const points = db.entries
        .filter((entry) => entry.userId === player.id)
        .reduce((sum, entry) => sum + entry.playerPoints + entry.teamPoints, 0);

      return {
        playerId: player.id,
        playerName: player.displayName,
        avatarKey: avatar.key,
        avatarName: avatar.name,
        avatarSymbol: avatar.symbol,
        avatarColor: avatar.color,
        teamId: team.id,
        teamName: team.name,
        points,
        progressPct: Number(Math.min((points / Math.max(winningScore, 1)) * 100, 100).toFixed(1))
      };
    })
  );

  const games: GameSummary[] = db.games.map((game) => ({
    id: game.id,
    key: game.key,
    name: game.name,
    category: game.category,
    sortOrder: game.sortOrder,
    enabled: game.enabled,
    scoringConfig: JSON.stringify(game.scoringConfig),
    maxAvailablePoints: game.maxAvailablePoints
  }));

  const recentEntries: ScoreEntrySummary[] = db.recentEntries.slice(0, 10).map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    notes: entry.notes,
    teamPoints: entry.teamPoints,
    playerPoints: entry.playerPoints,
    gameName: entry.game.name,
    playerName: entry.user?.displayName ?? null
  }));

  return {
    eventName,
    updatedAt: new Date().toISOString(),
    winningScore,
    totalScoredPoints,
    remainingAvailablePoints: Math.max(totalAvailablePoints - totalScoredPoints, 0),
    teamA: teamA ?? {
      id: "team-a",
      name: "A",
      score: 0,
      remainingToWin: winningScore,
      winProbability: 50,
      roster: []
    },
    teamB: teamB ?? {
      id: "team-b",
      name: "B",
      score: 0,
      remainingToWin: winningScore,
      winProbability: 50,
      roster: []
    },
    lanes: lanes.sort((left, right) => right.points - left.points),
    games,
    recentEntries
  };
}
