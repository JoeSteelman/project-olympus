"use client";

import { useEffect, useState } from "react";
import type { DashboardSummary } from "@/lib/types";
import { OlympusStandings } from "@/components/olympus-standings";

type StandingsShellProps = {
  initialData: DashboardSummary;
};

export function StandingsShell({ initialData }: StandingsShellProps) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const refresh = async () => {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      setData(await response.json());
    };

    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <OlympusStandings
      participants={data.lanes}
      winningScore={data.winningScore}
      remainingAvailablePoints={data.remainingAvailablePoints}
      updatedAt={data.updatedAt}
      showTrack={false}
      ladderLimit={8}
      ladderExpandable={false}
      ladderExpandedByDefault
      showActions
    />
  );
}
