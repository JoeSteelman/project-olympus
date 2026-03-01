import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/data";

export async function GET() {
  try {
    const dashboard = await getDashboardSummary();
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to load dashboard." },
      { status: 500 }
    );
  }
}
