import type { DashboardSummary } from "@/lib/types";
import { GREEK_AVATARS } from "@/lib/avatars";

const [teamAAvatar, teamBAvatar] = GREEK_AVATARS;

export const mockDashboard: DashboardSummary = {
  eventName: "Project Olympus",
  updatedAt: new Date().toISOString(),
  winningScore: 500,
  totalScoredPoints: 95,
  remainingAvailablePoints: 600,
  integrityWarnings: [],
  teamA: {
    id: "team-a",
    name: "Spartans",
    score: 55,
    remainingToWin: 445,
    winProbability: 58.4,
    roster: [
      { id: "p1", name: "Joe Steelman", email: "joe@olympus.local", avatarKey: "zeus", teamId: "team-a" },
      { id: "p2", name: "Charlie Arthur", email: "charlie@olympus.local", avatarKey: "athena", teamId: "team-a" },
      { id: "p3", name: "Tanner Dinsdale", email: "tanner@olympus.local", avatarKey: "apollo", teamId: "team-a" },
      { id: "p4", name: "Stephen Moorkamp", email: "stephen@olympus.local", avatarKey: "poseidon", teamId: "team-a" }
    ]
  },
  teamB: {
    id: "team-b",
    name: "Titans",
    score: 40,
    remainingToWin: 460,
    winProbability: 41.6,
    roster: [
      { id: "p5", name: "Jason Falcone", email: "jason@olympus.local", avatarKey: "ares", teamId: "team-b" },
      { id: "p6", name: "Player 6", email: "player6@olympus.local", avatarKey: "artemis", teamId: "team-b" },
      { id: "p7", name: "Player 7", email: "player7@olympus.local", avatarKey: "hera", teamId: "team-b" },
      { id: "p8", name: "Player 8", email: "player8@olympus.local", avatarKey: "hermes", teamId: "team-b" }
    ]
  },
  lanes: [
    {
      playerId: "p1",
      playerName: "Joe Steelman",
      avatarKey: "zeus",
      avatarName: "Zeus",
      avatarSymbol: "⚡",
      avatarColor: "#d8b44b",
      teamId: "team-a",
      teamName: "Spartans",
      points: 38,
      progressPct: 7.6
    },
    {
      playerId: "p2",
      playerName: "Charlie Arthur",
      avatarKey: "athena",
      avatarName: "Athena",
      avatarSymbol: "🦉",
      avatarColor: "#7da2d6",
      teamId: "team-a",
      teamName: "Spartans",
      points: 34,
      progressPct: 6.8
    },
    {
      playerId: "p3",
      playerName: "Tanner Dinsdale",
      avatarKey: "apollo",
      avatarName: "Apollo",
      avatarSymbol: "☀",
      avatarColor: "#edbf61",
      teamId: "team-a",
      teamName: "Spartans",
      points: 29,
      progressPct: 5.8
    },
    {
      playerId: "p4",
      playerName: "Stephen Moorkamp",
      avatarKey: "poseidon",
      avatarName: "Poseidon",
      avatarSymbol: "🔱",
      avatarColor: "#4e89b7",
      teamId: "team-a",
      teamName: "Spartans",
      points: 26,
      progressPct: 5.2
    },
    {
      playerId: "p5",
      playerName: "Jason Falcone",
      avatarKey: "ares",
      avatarName: "Ares",
      avatarSymbol: "🛡",
      avatarColor: "#c86a4f",
      teamId: "team-b",
      teamName: "Titans",
      points: 31,
      progressPct: 6.2
    },
    {
      playerId: "p6",
      playerName: "Player 6",
      avatarKey: "artemis",
      avatarName: "Artemis",
      avatarSymbol: "🌙",
      avatarColor: "#7bc0c7",
      teamId: "team-b",
      teamName: "Titans",
      points: 24,
      progressPct: 4.8
    },
    {
      playerId: "p7",
      playerName: "Player 7",
      avatarKey: "hera",
      avatarName: "Hera",
      avatarSymbol: "👑",
      avatarColor: "#f6e2a8",
      teamId: "team-b",
      teamName: "Titans",
      points: 21,
      progressPct: 4.2
    },
    {
      playerId: "p8",
      playerName: "Player 8",
      avatarKey: "hermes",
      avatarName: "Hermes",
      avatarSymbol: "🪽",
      avatarColor: "#8eb28f",
      teamId: "team-b",
      teamName: "Titans",
      points: 19,
      progressPct: 3.8
    }
  ],
  games: [
    {
      id: "g1",
      key: "shooting-targets",
      name: "Shooting: .22 Targets",
      category: "Shooting",
      description: "",
      sortOrder: 1,
      enabled: true,
      scoringConfig: JSON.stringify({ style: "target-pips", shots: 5, tiers: [5, 3, 1] }),
      maxAvailablePoints: 120
    },
    {
      id: "g2",
      key: "shooting-silhouette",
      name: "Shooting: Silhouette",
      category: "Shooting",
      description: "",
      sortOrder: 2,
      enabled: true,
      scoringConfig: JSON.stringify({ style: "silhouette", shots: 9, adjustableRings: { center: 5, torso: 3.5, edge: 2 } }),
      maxAvailablePoints: 90
    },
    {
      id: "g3",
      key: "golf-match-a",
      name: "Golf Match A",
      category: "Golf",
      description: "",
      sortOrder: 3,
      enabled: true,
      scoringConfig: JSON.stringify({
        style: "match-play",
        teamsPerMatch: 2,
        adjustableHoleValue: 20,
        individualHoleValue: 10,
        maxTeamPoints: 80,
        maxIndividualPoints: 40
      }),
      maxAvailablePoints: 80
    },
    {
      id: "g4",
      key: "golf-match-b",
      name: "Golf Match B",
      category: "Golf",
      description: "",
      sortOrder: 4,
      enabled: true,
      scoringConfig: JSON.stringify({
        style: "match-play",
        teamsPerMatch: 2,
        adjustableHoleValue: 20,
        individualHoleValue: 10,
        maxTeamPoints: 80,
        maxIndividualPoints: 40
      }),
      maxAvailablePoints: 80
    },
    {
      id: "g5",
      key: "poker",
      name: "Poker",
      category: "Poker",
      description: "",
      sortOrder: 5,
      enabled: true,
      scoringConfig: JSON.stringify({
        style: "placements",
        payouts: [
          { place: 1, team: 100, player: 30 },
          { place: 2, team: 50, player: 25 },
          { place: 3, team: 25, player: 20 },
          { place: 4, team: 15, player: 15 },
          { place: 5, team: 10, player: 10 },
          { place: 6, team: 5, player: 8 },
          { place: 7, team: 2, player: 5 },
          { place: 8, team: 0, player: 0 }
        ]
      }),
      maxAvailablePoints: 294
    }
  ],
  recentEntries: [
    {
      id: "se1",
      createdAt: new Date().toISOString(),
      notes: "Strong opening target run.",
      teamPoints: 12,
      playerPoints: 18,
      gameName: "Shooting: .22 Targets",
      playerName: "Alex Stone"
    }
  ]
};

export const mockAdmin = {
  dashboard: mockDashboard,
  players: mockDashboard.teamA.roster.concat(mockDashboard.teamB.roster).map((player) => ({
    id: player.id,
    displayName: player.name,
    email: player.email,
    teamId: player.id.startsWith("p1") || player.id.startsWith("p2") || player.id.startsWith("p3") || player.id.startsWith("p4") ? "team-a" : "team-b",
    avatarKey: player.avatarKey,
    avatarUrl: null
  })),
  teams: [
    { id: "team-a", name: "Spartans", slug: "spartans", color: "#d8b44b", players: [] },
    { id: "team-b", name: "Titans", slug: "titans", color: "#1d3557", players: [] }
  ],
  games: mockDashboard.games.map((game) => ({
    id: game.id,
    key: game.key,
    name: game.name,
    category: game.category,
    description: game.description ?? "",
    sortOrder: game.sortOrder,
    enabled: game.enabled,
    scoringConfig: JSON.parse(game.scoringConfig),
    maxAvailablePoints: game.maxAvailablePoints
  })), 
  config: { eventName: "Project Olympus", winningScore: 500 },
  avatars: GREEK_AVATARS
};
