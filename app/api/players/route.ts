import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, avatarKey, avatarUrl, displayName, email, teamId } = body as {
      playerId?: string;
      avatarKey?: string;
      avatarUrl?: string | null;
      displayName?: string;
      email?: string;
      teamId?: string | null;
    };

    if (!playerId) {
      return NextResponse.json({ error: "playerId is required." }, { status: 400 });
    }

    if (teamId) {
      const currentPlayer = await prisma.user.findUnique({
        where: { id: playerId },
        select: { teamId: true }
      });

      if (currentPlayer?.teamId !== teamId) {
        const memberCount = await prisma.user.count({
          where: { teamId }
        });

        if (memberCount >= 4) {
          return NextResponse.json(
            { error: "Teams are capped at 4 players." },
            { status: 400 }
          );
        }
      }
    }

    const player = await prisma.user.update({
      where: { id: playerId },
      data: {
        ...(avatarKey ? { avatarKey } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(displayName ? { displayName } : {}),
        ...(email ? { email } : {}),
        ...(teamId !== undefined ? { teamId } : {})
      }
    });

    revalidatePath("/");
    revalidatePath("/standings");
    revalidatePath("/admin");
    revalidatePath("/chairman");

    return NextResponse.json(player);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to update player." },
      { status: 500 }
    );
  }
}
