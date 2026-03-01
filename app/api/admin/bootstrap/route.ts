import { NextResponse } from "next/server";
import { getAdminBootstrap } from "@/lib/data";

export async function GET() {
  try {
    const data = await getAdminBootstrap();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to load admin bootstrap." },
      { status: 500 }
    );
  }
}
