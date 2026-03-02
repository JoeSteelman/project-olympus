import Link from "next/link";
import { OlympusStandings } from "@/components/olympus-standings";
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
      <OlympusStandings
        participants={dashboard.lanes}
        winningScore={dashboard.winningScore}
        remainingAvailablePoints={dashboard.remainingAvailablePoints}
        updatedAt={dashboard.updatedAt}
        showTrack={false}
        ladderLimit={8}
        ladderExpandable={false}
        ladderExpandedByDefault
        showActions
      />
    </main>
  );
}
