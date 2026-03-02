import Link from "next/link";
import { StandingsShell } from "@/components/standings-shell";
import { getDashboardSummary } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const dashboard = await getDashboardSummary();

  return (
    <main className="standings-shell">
      <div className="standings-back">
        <Link href="/" className="secondary-link">
          Back to scoreboard
        </Link>
      </div>
      <StandingsShell initialData={dashboard} />
    </main>
  );
}
