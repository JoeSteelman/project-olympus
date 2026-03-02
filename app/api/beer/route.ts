import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fromUserId, toUserId, count, reason } = body as {
    fromUserId?: string;
    toUserId?: string;
    count?: number;
    reason?: string;
  };

  if (!fromUserId || !toUserId) {
    return NextResponse.json({ error: "fromUserId and toUserId required." }, { status: 400 });
  }

  const amount = Math.max(1, Number(count ?? 1));
  const session = await prisma.gameSession.findFirst({ where: { status: "ACTIVE" } });

  const [fromState, toState] = await prisma.$transaction([
    prisma.playerState.update({
      where: { userId: fromUserId },
      data: { beerBalance: { decrement: amount } }
    }),
    prisma.playerState.update({
      where: { userId: toUserId },
      data: { beersReceived: { increment: amount } }
    })
  ]);

  await prisma.beerTransaction.create({
    data: {
      sessionId: session?.id,
      fromUserId,
      toUserId,
      count: amount,
      reason: reason ?? "buy"
    }
  });

  return NextResponse.json({ fromState, toState });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { userId, add } = body as { userId?: string; add?: number };

  if (!userId) {
    return NextResponse.json({ error: "userId required." }, { status: 400 });
  }

  const amount = Math.max(1, Number(add ?? 0));
  const updated = await prisma.playerState.update({
    where: { userId },
    data: { beerBalance: { increment: amount } }
  });

  return NextResponse.json(updated);
}
