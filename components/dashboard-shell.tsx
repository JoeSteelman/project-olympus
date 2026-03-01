"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { DashboardSummary } from "@/lib/types";
import { OlympusStandings } from "@/components/olympus-standings";

type DashboardShellProps = {
  initialData: DashboardSummary;
};

export function DashboardShell({ initialData }: DashboardShellProps) {
  const [data, setData] = useState(initialData);
  const [entryForm, setEntryForm] = useState({
    gameId: initialData.games[0]?.id ?? "",
    teamId: initialData.teamA.id,
    playerId: initialData.teamA.roster[0]?.id ?? "",
    teamPoints: 0,
    playerPoints: 0,
    notes: ""
  });
  const [status, setStatus] = useState("");
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const activeTeam =
    entryForm.teamId === data.teamB.id ? data.teamB : data.teamA;
  const availablePlayers = activeTeam.roster;
  const teamSize = data.teamA.roster.length;

  useEffect(() => {
    const refresh = async () => {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (response.ok) {
        setData(await response.json());
      }
    };

    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
  }, []);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");

    const response = await fetch("/api/score-entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(entryForm)
    });

    if (!response.ok) {
      setStatus("Save failed.");
      return;
    }

    const dashboardResponse = await fetch("/api/dashboard", { cache: "no-store" });
    if (dashboardResponse.ok) {
      setData(await dashboardResponse.json());
    }

    setStatus("Saved.");
    setEntryForm((current) => ({
      ...current,
      teamPoints: 0,
      playerPoints: 0,
      notes: ""
    }));
  }

  const describeScoring = (config: Record<string, any>) => {
    if (!config?.style) {
      return { title: "Scoring", lines: ["No scoring config available."] };
    }

    if (config.style === "target-pips") {
      const tiers = (config.tiers ?? []) as number[];
      const maxShot = tiers.length ? Math.max(...tiers) : 0;
      const shots = Number(config.shots ?? 0);
      const maxIndividual = shots * maxShot;
      const maxTeam = maxIndividual * teamSize;
      return {
        title: "Target Pips",
        lines: [
          `${shots} shots`,
          `tiers: ${tiers.join(" / ")}`,
          `max individual: ${maxIndividual}`,
          `max team: ${maxTeam}`
        ]
      };
    }

    if (config.style === "silhouette") {
      const rings = config.adjustableRings ?? {};
      const ringValues = [rings.center, rings.torso, rings.edge].map((value) => Number(value ?? 0));
      const maxShot = ringValues.length ? Math.max(...ringValues) : 0;
      const shots = Number(config.shots ?? 0);
      const maxIndividual = shots * maxShot;
      const maxTeam = maxIndividual * teamSize;
      return {
        title: "Silhouette",
        lines: [
          `${shots} shots`,
          `ring values: center ${rings.center ?? "-"}, torso ${rings.torso ?? "-"}, edge ${rings.edge ?? "-"}`,
          `max individual: ${maxIndividual}`,
          `max team: ${maxTeam}`
        ]
      };
    }

    if (config.style === "match-play") {
      const maxTeam = config.maxTeamPoints ?? config.maxPoints ?? config.maxAvailablePoints;
      const maxIndividual = config.maxIndividualPoints ?? config.maxPoints ?? config.maxAvailablePoints;
      const teamHole = config.adjustableHoleValue ?? "-";
      const individualHole = config.individualHoleValue ?? (typeof teamHole === "number" ? teamHole / 2 : "-");
      return {
        title: "Match Play",
        lines: [
          `${config.teamsPerMatch ?? 2} teams per match`,
          `team per-hole: ${teamHole}`,
          `individual per-hole: ${individualHole}`,
          maxTeam ? `max team: ${maxTeam}` : null,
          maxIndividual ? `max individual: ${maxIndividual}` : null
        ].filter(Boolean) as string[]
      };
    }

    if (config.style === "placements") {
      const payouts = (config.payouts ?? [])
        .slice(0, 8)
        .map((p: any) => `#${p.place}: team ${p.team}, player ${p.player}`);
      return { title: "Placements", lines: payouts.length ? payouts : ["No payout table."] };
    }

    return { title: "Scoring", lines: [JSON.stringify(config)] };
  };

  const getMaxPoints = (game: { maxAvailablePoints: number }, config: Record<string, any>) => {
    if (config.style === "placements") {
      const payouts = config.payouts ?? [];
      const maxTeam = Math.max(0, ...payouts.map((p: any) => Number(p.team ?? 0)));
      const maxIndividual = Math.max(0, ...payouts.map((p: any) => Number(p.player ?? 0)));
      return { maxTeam, maxIndividual };
    }

    if (config.style === "target-pips") {
      const tiers = (config.tiers ?? []) as number[];
      const maxShot = tiers.length ? Math.max(...tiers) : 0;
      const shots = Number(config.shots ?? 0);
      const maxIndividual = shots * maxShot;
      const maxTeam = maxIndividual * teamSize;
      return { maxTeam, maxIndividual };
    }

    if (config.style === "silhouette") {
      const rings = config.adjustableRings ?? {};
      const ringValues = [rings.center, rings.torso, rings.edge].map((value) => Number(value ?? 0));
      const maxShot = ringValues.length ? Math.max(...ringValues) : 0;
      const shots = Number(config.shots ?? 0);
      const maxIndividual = shots * maxShot;
      const maxTeam = maxIndividual * teamSize;
      return { maxTeam, maxIndividual };
    }

    const maxTeam = config.maxTeamPoints ?? game.maxAvailablePoints;
    const maxIndividual = config.maxIndividualPoints ?? game.maxAvailablePoints;
    return { maxTeam, maxIndividual };
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="eyebrow">Project Olympus</div>
        <div className="hero-header">
          <div>
            <h1>{data.eventName}</h1>
            <p>Mobile-first score entry with live team race tracking.</p>
          </div>
          <div className="action-row">
            <Link href="/standings" className="secondary-link">
              Standings
            </Link>
            <Link href={"/login" as never} className="secondary-link">
              Login
            </Link>
            <Link href="/admin" className="secondary-link">
              Admin
            </Link>
          </div>
        </div>

        <div className="team-score-grid">
          {[data.teamA, data.teamB].map((team) => {
            const scorePct = Math.min((team.score / Math.max(data.winningScore, 1)) * 100, 100);

            return (
              <div key={team.id} className="team-panel">
                <div className="team-panel-top">
                  <span className="eyebrow">{team.name}</span>
                  <span className="score-pill">{team.score} pts</span>
                </div>
                <div className="score-bar-track">
                  <div className="score-bar-fill" style={{ width: `${scorePct}%` }} />
                </div>
                <div className="team-panel-metrics">
                  <span>{team.remainingToWin} to win</span>
                  <span>{team.winProbability}% win chance</span>
                </div>
                <div className="gauge">
                  <div className="gauge-fill" style={{ width: `${team.winProbability}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <OlympusStandings
        participants={data.lanes}
        winningScore={data.winningScore}
        remainingAvailablePoints={data.remainingAvailablePoints}
        updatedAt={data.updatedAt}
        showTrack={false}
        ladderLimit={4}
        ladderExpandable
        ladderExpandedByDefault={false}
      />

      <section className="stack">
        <div className="card">
          <div className="section-heading">
            <h2>Quick Entry</h2>
            <span>{status}</span>
          </div>
          <form className="entry-form" onSubmit={submitEntry}>
            <label>
              <span>Game</span>
              <select
                value={entryForm.gameId}
                onChange={(event) =>
                  setEntryForm((current) => ({ ...current, gameId: event.target.value }))
                }
              >
                {data.games
                  .filter((game) => game.enabled)
                  .map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Team</span>
              <select
                value={entryForm.teamId}
                onChange={(event) => {
                  const teamId = event.target.value;
                  const teamRoster =
                    teamId === data.teamB.id ? data.teamB.roster : data.teamA.roster;

                  setEntryForm((current) => ({
                    ...current,
                    teamId,
                    playerId: teamRoster[0]?.id ?? ""
                  }));
                }}
              >
                {[data.teamA, data.teamB].map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Player</span>
              <select
                value={entryForm.playerId}
                onChange={(event) =>
                  setEntryForm((current) => ({ ...current, playerId: event.target.value }))
                }
              >
                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Team points</span>
              <input
                type="number"
                inputMode="numeric"
                value={entryForm.teamPoints}
                onChange={(event) =>
                  setEntryForm((current) => ({
                    ...current,
                    teamPoints: Number(event.target.value)
                  }))
                }
              />
            </label>
            <label>
              <span>Player points</span>
              <input
                type="number"
                inputMode="numeric"
                value={entryForm.playerPoints}
                onChange={(event) =>
                  setEntryForm((current) => ({
                    ...current,
                    playerPoints: Number(event.target.value)
                  }))
                }
              />
            </label>
            <label className="full-span">
              <span>Notes</span>
              <textarea
                rows={3}
                value={entryForm.notes}
                onChange={(event) =>
                  setEntryForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
            <button type="submit" className="primary-button full-span">
              Add score entry
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-heading">
            <div>
              <h2>Games</h2>
              <div className="section-subline">
                <span>Team potential {data.games.reduce((sum, game) => sum + getMaxPoints(game, (() => { try { return JSON.parse(game.scoringConfig ?? "{}") as Record<string, any>; } catch { return {} as Record<string, any>; } })()).maxTeam, 0)} pts</span>
                <span>Individual potential {data.games.reduce((sum, game) => sum + getMaxPoints(game, (() => { try { return JSON.parse(game.scoringConfig ?? "{}") as Record<string, any>; } catch { return {} as Record<string, any>; } })()).maxIndividual, 0)} pts</span>
              </div>
            </div>
            <span>{data.totalScoredPoints} points awarded</span>
          </div>
          <div className="game-list">
            {data.games.map((game) => {
              const config = (() => {
                try {
                  return JSON.parse(game.scoringConfig ?? "{}") as Record<string, any>;
                } catch {
                  return {} as Record<string, any>;
                }
              })();
              const { title, lines } = describeScoring(config);
              const isOpen = openGameId === game.id;

              return (
                <button
                  key={game.id}
                  type="button"
                  className="game-row game-row-button"
                  onClick={() => setOpenGameId((current) => (current === game.id ? null : game.id))}
                >
                  <div>
                    <strong>{game.name}</strong>
                    <p>{game.category}</p>
                  </div>
                  <span className="game-max">
                    team {getMaxPoints(game, config).maxTeam} · ind {getMaxPoints(game, config).maxIndividual}
                  </span>
                  {isOpen ? (
                    <div className="game-details">
                      <div className="game-details-title">{title}</div>
                      <ul>
                        {lines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Recent Entries</h2>
          </div>
          <div className="recent-list">
            {data.recentEntries.map((entry) => (
              <div key={entry.id} className="recent-row">
                <div>
                  <strong>{entry.gameName}</strong>
                  <p>{entry.playerName ?? "Team-only score"}</p>
                </div>
                <span>+{entry.teamPoints + entry.playerPoints}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
