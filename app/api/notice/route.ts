import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const notices = await prisma.notice.findMany({
    where: { expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(notices);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, durationSeconds, createdById, kind } = body as {
    message?: string;
    durationSeconds?: number;
    createdById?: string;
    kind?: "NOTICE" | "TALKSHIT";
  };

  if (!message) {
    return NextResponse.json({ error: "message required." }, { status: 400 });
  }

  const session = await prisma.gameSession.findFirst({ where: { status: "ACTIVE" } });
  const duration = Math.max(10, Number(durationSeconds ?? 120));
  const expiresAt = new Date(Date.now() + duration * 1000);

  const notice = await prisma.notice.create({
    data: {
      message,
      kind: kind ?? "NOTICE",
      expiresAt,
      sessionId: session?.id,
      createdById: createdById ?? null
    }
  });

  return NextResponse.json(notice);
}
