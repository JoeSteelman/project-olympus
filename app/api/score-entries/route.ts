import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gameId,
      teamId,
      playerId,
      teamPoints,
      playerPoints,
      notes,
      metadata
    } = body as {
      gameId?: string;
      teamId?: string;
      playerId?: string | null;
      teamPoints?: number;
      playerPoints?: number;
      notes?: string;
      metadata?: unknown;
    };

    if (!gameId || !teamId) {
      return NextResponse.json(
        { error: "gameId and teamId are required." },
        { status: 400 }
      );
    }

    const created = await prisma.scoreEntry.create({
      data: {
        gameId,
        teamId,
        userId: playerId ?? null,
        teamPoints: teamPoints ?? 0,
        playerPoints: playerPoints ?? 0,
        notes: notes ?? null,
        metadata: metadata ?? undefined
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to create score entry." },
      { status: 500 }
    );
  }
}
