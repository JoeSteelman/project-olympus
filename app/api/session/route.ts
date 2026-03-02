import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await prisma.gameSession.findFirst({
    where: { status: "ACTIVE" },
    include: { chairman: true }
  });
  return NextResponse.json(session);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, chairmanId } = body as { action?: string; chairmanId?: string };

  if (action === "start") {
    const existing = await prisma.gameSession.findFirst({ where: { status: "ACTIVE" } });
    if (existing) {
      return NextResponse.json({ error: "Session already active." }, { status: 400 });
    }
    if (!chairmanId) {
      return NextResponse.json({ error: "chairmanId required." }, { status: 400 });
    }
    const session = await prisma.gameSession.create({
      data: {
        status: "ACTIVE",
        chairmanId,
        chairmanLocked: true
      }
    });
    await prisma.chairmanAssignment.create({
      data: { sessionId: session.id, userId: chairmanId }
    });
    return NextResponse.json(session);
  }

  if (action === "reset") {
    const session = await prisma.gameSession.findFirst({ where: { status: "ACTIVE" } });
    if (!session) {
      return NextResponse.json({ error: "No active session." }, { status: 400 });
    }
    await prisma.gameSession.update({
      where: { id: session.id },
      data: { status: "ENDED", endedAt: new Date(), chairmanLocked: false }
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
