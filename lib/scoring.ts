import { getAvatar } from "@/lib/avatars";
import { prisma } from "@/lib/prisma";
import type { DashboardSummary, GameSummary, ScoreEntrySummary, TeamSummary } from "@/lib/types";

type DashboardDb = Awaited<ReturnType<typeof loadDashboardDb>>;

export async function loadDashboardDb() {
  const [config, teams, users, games, entries, recentEntries, activeSession] = await Promise.all([
    prisma.eventConfig.findFirst(),
    prisma.team.findMany({
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.user.findMany({
      orderBy: {
        displayName: "asc"
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
    }),
    prisma.gameSession.findFirst({
      where: {
        status: "ACTIVE"
      },
      include: {
        assignments: {
          orderBy: {
            assignedAt: "desc"
          }
        }
      }
    })
  ]);

  return { config, teams, users, games, entries, recentEntries, activeSession };
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
  const knownTeamIds = new Set(db.teams.map((team) => team.id));
  const knownGameIds = new Set(db.games.map((game) => game.id));
  const knownUserIds = new Set(db.users.map((user) => user.id));
  const integrityWarnings: string[] = [];
  const addWarning = (message: string) => {
    if (!integrityWarnings.includes(message)) {
      integrityWarnings.push(message);
    }
  };
  const assignmentTeamByUser = new Map<string, string | null>();

  if (db.activeSession) {
    db.activeSession.assignments.forEach((assignment) => {
      if (assignmentTeamByUser.has(assignment.userId)) {
        addWarning(`Duplicate session roster assignment for member ${assignment.userId}; using the most recent row.`);
        return;
      }

      if (!knownUserIds.has(assignment.userId)) {
        addWarning(`Session roster assignment references missing member ${assignment.userId}.`);
        return;
      }

      if (assignment.teamId && !knownTeamIds.has(assignment.teamId)) {
        addWarning(
          `Session roster assignment for member ${assignment.userId} references missing team ${assignment.teamId}.`
        );
        assignmentTeamByUser.set(assignment.userId, null);
        return;
      }

      assignmentTeamByUser.set(assignment.userId, assignment.teamId ?? null);
    });
  }

  const effectiveTeamByUser = new Map<string, string | null>();
  const rosterByTeam = new Map<string, TeamSummary["roster"]>(
    db.teams.map((team) => [team.id, []])
  );

  db.users.forEach((user) => {
    if (user.teamId && !knownTeamIds.has(user.teamId)) {
      addWarning(`Member ${user.displayName} references missing home team ${user.teamId}.`);
    }

    const sessionTeamId =
      db.activeSession && assignmentTeamByUser.has(user.id)
        ? assignmentTeamByUser.get(user.id) ?? null
        : null;

    if (db.activeSession && !assignmentTeamByUser.has(user.id)) {
      addWarning(
        `Active session is missing a roster assignment for ${user.displayName}; falling back to their saved team.`
      );
    }

    const effectiveTeamId =
      db.activeSession && assignmentTeamByUser.has(user.id)
        ? sessionTeamId
        : user.teamId ?? null;

    if (effectiveTeamId && !knownTeamIds.has(effectiveTeamId)) {
      addWarning(`Member ${user.displayName} resolves to unknown team ${effectiveTeamId}.`);
      effectiveTeamByUser.set(user.id, null);
      return;
    }

    effectiveTeamByUser.set(user.id, effectiveTeamId);

    if (!effectiveTeamId) {
      return;
    }

    const roster = rosterByTeam.get(effectiveTeamId);
    if (!roster) {
      addWarning(`Member ${user.displayName} resolved to unavailable team ${effectiveTeamId}.`);
      return;
    }

    roster.push({
      id: user.id,
      name: user.displayName,
      email: user.email,
      avatarKey: user.avatarKey,
      avatarUrl: user.avatarUrl,
      teamId: effectiveTeamId
    });
  });

  db.entries.forEach((entry) => {
    if (!knownGameIds.has(entry.gameId)) {
      addWarning(`Score entry ${entry.id} references missing game ${entry.gameId}.`);
    }

    if (!knownTeamIds.has(entry.teamId)) {
      addWarning(`Score entry ${entry.id} references missing team ${entry.teamId}.`);
    }

    if (entry.userId && !knownUserIds.has(entry.userId)) {
      addWarning(`Score entry ${entry.id} references missing member ${entry.userId}.`);
    }

    if (entry.userId && knownUserIds.has(entry.userId)) {
      const playerTeamId = effectiveTeamByUser.get(entry.userId);
      if (playerTeamId && playerTeamId !== entry.teamId) {
        addWarning(
          `Score entry ${entry.id} assigns ${entry.user?.displayName ?? entry.userId} to team ${entry.teamId}, but their displayed roster team is ${playerTeamId}.`
        );
      }
    }
  });

  if (integrityWarnings.length) {
    console.warn("[DashboardSummary] Referential integrity mismatches detected.", integrityWarnings);
  }

  const teamSummaries = db.teams.map((team) =>
    computeTeamSummary(
      team.id,
      team.name,
      winningScore,
      totalAvailablePoints,
      db.entries,
      [...(rosterByTeam.get(team.id) ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name)
      )
    )
  );

  const [teamA, teamB] = teamSummaries;

  const lanes = teamSummaries.flatMap((team) =>
    team.roster.map((player) => {
      const avatar = getAvatar(player.avatarKey);
      const points = db.entries
        .filter((entry) => entry.userId === player.id)
        .reduce((sum, entry) => sum + entry.playerPoints + entry.teamPoints, 0);

      return {
        playerId: player.id,
        playerName: player.name,
        avatarKey: avatar.key,
        avatarUrl: player.avatarUrl,
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
    description: game.description ?? "",
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
    recentEntries,
    integrityWarnings
  };
}
