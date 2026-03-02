import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventName, winningScore, teams, games } = body as {
      eventName?: string;
      winningScore?: number;
      teams?: Array<{ id: string; name: string; slug: string; color: string }>;
      games?: Array<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        maxAvailablePoints: number;
        scoringConfig: unknown;
      }>;
    };

    let persistedConfig:
      | {
          eventName: string;
          winningScore: number;
        }
      | null = null;

    if (eventName !== undefined || winningScore !== undefined) {
      const current = await prisma.eventConfig.findFirst();

      if (current) {
        persistedConfig = await prisma.eventConfig.update({
          where: { id: current.id },
          data: {
            ...(eventName !== undefined ? { eventName } : {}),
            ...(winningScore !== undefined ? { winningScore } : {})
          }
        });
      } else {
        persistedConfig = await prisma.eventConfig.create({
          data: {
            eventName: eventName ?? "Project Olympus",
            winningScore: winningScore ?? 500
          }
        });
      }

      const configPersisted =
        (eventName === undefined || persistedConfig.eventName === eventName) &&
        (winningScore === undefined || persistedConfig.winningScore === winningScore);

      if (!configPersisted) {
        console.error("[settings.patch] Event config did not persist correctly.", {
          requested: { eventName, winningScore },
          persisted: persistedConfig
        });

        return NextResponse.json(
          { error: "Event config update did not persist correctly." },
          { status: 500 }
        );
      }
    }

    if (teams?.length) {
      const updatedTeams = await Promise.all(
        teams.map((team) =>
          prisma.team.update({
            where: { id: team.id },
            data: {
              name: team.name,
              slug: team.slug,
              color: team.color
            }
          })
        )
      );

      const teamsPersisted = updatedTeams.every((team) => {
        const requested = teams.find((candidate) => candidate.id === team.id);
        return (
          requested &&
          team.name === requested.name &&
          team.slug === requested.slug &&
          team.color === requested.color
        );
      });

      if (!teamsPersisted) {
        console.error("[settings.patch] Team settings did not persist correctly.");
        return NextResponse.json(
          { error: "Team settings update did not persist correctly." },
          { status: 500 }
        );
      }
    }

    if (games?.length) {
      const updatedGames = await Promise.all(
        games.map((game) =>
          prisma.game.update({
            where: { id: game.id },
            data: {
              name: game.name,
              description: game.description,
              enabled: game.enabled,
              maxAvailablePoints: game.maxAvailablePoints,
              scoringConfig: game.scoringConfig as Prisma.InputJsonValue
            }
          })
        )
      );

      const gamesPersisted = updatedGames.every((game) => {
        const requested = games.find((candidate) => candidate.id === game.id);
        return (
          requested &&
          game.name === requested.name &&
          game.description === requested.description &&
          game.enabled === requested.enabled &&
          game.maxAvailablePoints === requested.maxAvailablePoints &&
          JSON.stringify(game.scoringConfig) === JSON.stringify(requested.scoringConfig)
        );
      });

      if (!gamesPersisted) {
        console.error("[settings.patch] Game settings did not persist correctly.");
        return NextResponse.json(
          { error: "Game settings update did not persist correctly." },
          { status: 500 }
        );
      }
    }

    revalidatePath("/");
    revalidatePath("/standings");
    revalidatePath("/admin");
    revalidatePath("/chairman");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to update settings." },
      { status: 500 }
    );
  }
}
