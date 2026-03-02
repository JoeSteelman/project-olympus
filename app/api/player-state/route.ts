import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const states = await prisma.playerState.findMany({ include: { user: true } });
  return NextResponse.json(states);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { userId, beerBalance, beersReceived, talkShitCooldownUntil } = body as {
    userId?: string;
    beerBalance?: number;
    beersReceived?: number;
    talkShitCooldownUntil?: string | null;
  };

  if (!userId) {
    return NextResponse.json({ error: "userId required." }, { status: 400 });
  }

  const updated = await prisma.playerState.update({
    where: { userId },
    data: {
      beerBalance: beerBalance ?? undefined,
      beersReceived: beersReceived ?? undefined,
      talkShitCooldownUntil: talkShitCooldownUntil ? new Date(talkShitCooldownUntil) : undefined
    }
  });

  return NextResponse.json(updated);
}
