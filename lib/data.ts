import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { GREEK_AVATARS } from "@/lib/avatars";
import { buildDashboardSummary, loadDashboardDb } from "@/lib/scoring";
import { mockAdmin, mockDashboard } from "@/lib/mock-data";

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export async function getDashboardSummary() {
  noStore();

  if (!hasDatabase()) {
    return mockDashboard;
  }

  const db = await loadDashboardDb();
  return buildDashboardSummary(db);
}

export async function getAdminBootstrap() {
  noStore();

  if (!hasDatabase()) {
    return mockAdmin;
  }

  const [dashboard, players, teams, games, config] = await Promise.all([
    getDashboardSummary(),
    prisma.user.findMany({
      orderBy: {
        displayName: "asc"
      }
    }),
    prisma.team.findMany({
      include: {
        players: true
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
    prisma.eventConfig.findFirst()
  ]);

  return {
    dashboard,
    players,
    teams,
    games,
    config,
    avatars: GREEK_AVATARS
  };
}
