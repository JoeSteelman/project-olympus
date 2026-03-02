import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await prisma.gameSession.findFirst({
    where: { status: "ACTIVE" },
    include: { chairman: true, assignments: true }
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
    const players = await prisma.user.findMany({
      select: {
        id: true,
        teamId: true
      }
    });
    if (players.length) {
      await prisma.chairmanAssignment.createMany({
        data: players.map((player) => ({
          sessionId: session.id,
          userId: player.id,
          teamId: player.teamId
        }))
      });
    }
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, teamId } = body as {
      userId?: string;
      teamId?: string | null;
    };

    if (!userId || !teamId) {
      return NextResponse.json({ error: "userId and teamId are required." }, { status: 400 });
    }

    const [session, team] = await Promise.all([
      prisma.gameSession.findFirst({
        where: { status: "ACTIVE" }
      }),
      prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true }
      })
    ]);

    if (!session) {
      return NextResponse.json({ error: "Start a session before editing the session roster." }, { status: 400 });
    }

    if (!team) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    const currentAssignment = await prisma.chairmanAssignment.findFirst({
      where: {
        sessionId: session.id,
        userId
      },
      orderBy: {
        assignedAt: "desc"
      }
    });

    if (currentAssignment?.teamId !== teamId) {
      const memberCount = await prisma.chairmanAssignment.count({
        where: {
          sessionId: session.id,
          teamId
        }
      });

      if (memberCount >= 4) {
        return NextResponse.json({ error: "Teams are capped at 4 players per session." }, { status: 400 });
      }
    }

    if (currentAssignment) {
      await prisma.chairmanAssignment.updateMany({
        where: {
          sessionId: session.id,
          userId
        },
        data: {
          teamId
        }
      });
    } else {
      await prisma.chairmanAssignment.create({
        data: {
          sessionId: session.id,
          userId,
          teamId
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update the session roster." }, { status: 500 });
  }
}
