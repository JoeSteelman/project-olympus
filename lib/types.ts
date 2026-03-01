export type DashboardLane = {
  playerId: string;
  playerName: string;
  avatarKey: string;
  avatarName: string;
  avatarSymbol: string;
  avatarColor: string;
  teamId: string;
  teamName: string;
  points: number;
  progressPct: number;
};

export type DashboardSummary = {
  eventName: string;
  updatedAt: string;
  winningScore: number;
  totalScoredPoints: number;
  remainingAvailablePoints: number;
  teamA: TeamSummary;
  teamB: TeamSummary;
  lanes: DashboardLane[];
  games: GameSummary[];
  recentEntries: ScoreEntrySummary[];
};

export type TeamSummary = {
  id: string;
  name: string;
  score: number;
  remainingToWin: number;
  winProbability: number;
  roster: {
    id: string;
    name: string;
    email: string;
    avatarKey: string;
  }[];
};

export type GameSummary = {
  id: string;
  key: string;
  name: string;
  category: string;
  sortOrder: number;
  enabled: boolean;
  scoringConfig: string;
  maxAvailablePoints: number;
};

export type ScoreEntrySummary = {
  id: string;
  createdAt: string;
  notes: string | null;
  teamPoints: number;
  playerPoints: number;
  gameName: string;
  playerName: string | null;
};
