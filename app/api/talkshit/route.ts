import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fromUserId, toUserId, message, timeout } = body as {
    fromUserId?: string;
    toUserId?: string;
    message?: string;
    timeout?: boolean;
  };

  if (!fromUserId || !toUserId) {
    return NextResponse.json({ error: "fromUserId and toUserId required." }, { status: 400 });
  }

  const state = await prisma.playerState.findUnique({ where: { userId: fromUserId } });
  const now = new Date();
  if (state?.talkShitCooldownUntil && state.talkShitCooldownUntil > now) {
    return NextResponse.json({ error: "Cooldown active." }, { status: 429 });
  }

  if (timeout) {
    const cooldownUntil = new Date(Date.now() + 2 * 60 * 1000);
    await prisma.playerState.update({
      where: { userId: fromUserId },
      data: { talkShitCooldownUntil: cooldownUntil }
    });
    return NextResponse.json({ ok: true, cooldownUntil });
  }

  if (!message) {
    return NextResponse.json({ error: "message required." }, { status: 400 });
  }

  const session = await prisma.gameSession.findFirst({ where: { status: "ACTIVE" } });
  const expiresAt = new Date(Date.now() + 20 * 1000);
  const notice = await prisma.notice.create({
    data: {
      message,
      kind: "TALKSHIT",
      expiresAt,
      sessionId: session?.id,
      createdById: fromUserId
    }
  });

  return NextResponse.json(notice);
}
