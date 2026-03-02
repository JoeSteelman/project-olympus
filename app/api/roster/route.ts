import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const players = await prisma.user.findMany({
    orderBy: { displayName: "asc" },
    include: { team: true }
  });
  return NextResponse.json(players);
}
