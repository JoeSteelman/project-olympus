import { NextRequest, NextResponse } from "next/server";
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

    if (eventName !== undefined || winningScore !== undefined) {
      const current = await prisma.eventConfig.findFirst();

      if (current) {
        await prisma.eventConfig.update({
          where: { id: current.id },
          data: {
            ...(eventName !== undefined ? { eventName } : {}),
            ...(winningScore !== undefined ? { winningScore } : {})
          }
        });
      } else {
        await prisma.eventConfig.create({
          data: {
            eventName: eventName ?? "Project Olympus",
            winningScore: winningScore ?? 500
          }
        });
      }
    }

    if (teams?.length) {
      await Promise.all(
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
    }

    if (games?.length) {
      await Promise.all(
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
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to update settings." },
      { status: 500 }
    );
  }
}
