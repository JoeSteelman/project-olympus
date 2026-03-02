"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  const [wizardState, setWizardState] = useState({
    gameId: initialData.games[0]?.id ?? "",
    teamId: initialData.teamA.id,
    playerId: initialData.teamA.roster[0]?.id ?? "",
    notes: "",
    targetShots: Array.from({ length: 5 }, () => 0),
    silhouetteCounts: { center: 0, torso: 0, edge: 0 },
    matchPlay: { holesWon: 0, holesRemaining: 0 },
    matchPlayHoles: Array.from({ length: 9 }, () => null) as Array<"Spartans" | "Titans" | null>,
    placement: 1,
    pokerOrder: [...initialData.teamA.roster, ...initialData.teamB.roster].map((p) => p.id),
    pokerChips: Object.fromEntries(
      [...initialData.teamA.roster, ...initialData.teamB.roster].map((p) => [p.id, 200])
    ) as Record<string, number>
  });
  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
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

  const wizardGame = useMemo(
    () => data.games.find((game) => game.id === wizardState.gameId) ?? data.games[0],
    [data.games, wizardState.gameId]
  );
  const wizardConfig = useMemo(() => {
    if (!wizardGame?.scoringConfig) return {} as Record<string, any>;
    try {
      return JSON.parse(wizardGame.scoringConfig) as Record<string, any>;
    } catch {
      return {} as Record<string, any>;
    }
  }, [wizardGame]);

  const wizardTeam = wizardState.teamId === data.teamB.id ? data.teamB : data.teamA;
  const wizardPlayers = wizardTeam.roster;
  const allPlayers = [...data.teamA.roster, ...data.teamB.roster];
  const playerLookup = useMemo(
    () => Object.fromEntries(allPlayers.map((player) => [player.id, player])),
    [allPlayers]
  );

  const wizardComputed = useMemo(() => {
    const style = wizardConfig.style;
    let teamPoints = 0;
    let playerPoints = 0;
    let detailLines: string[] = [];

    if (style === "target-pips") {
      const tiers = (wizardConfig.tiers ?? []) as number[];
      const shots = wizardState.targetShots.slice(0, wizardConfig.shots ?? tiers.length);
      playerPoints = shots.reduce((sum, value) => sum + Number(value || 0), 0);
      teamPoints = playerPoints;
      detailLines = [`shots: ${shots.join(" · ")}`];
    }

    if (style === "silhouette") {
      const rings = wizardConfig.adjustableRings ?? {};
      const center = Number(wizardState.silhouetteCounts.center || 0);
      const torso = Number(wizardState.silhouetteCounts.torso || 0);
      const edge = Number(wizardState.silhouetteCounts.edge || 0);
      playerPoints =
        center * Number(rings.center ?? 0) +
        torso * Number(rings.torso ?? 0) +
        edge * Number(rings.edge ?? 0);
      teamPoints = playerPoints;
      detailLines = [`center ${center}, torso ${torso}, edge ${edge}`];
    }

    if (style === "match-play") {
      const teamHole = Number(wizardConfig.adjustableHoleValue ?? 0);
      const individualHole = Number(wizardConfig.individualHoleValue ?? teamHole / 2);
      const holes = wizardState.matchPlayHoles;
      const spartansWon = holes.filter((hole) => hole === "Spartans").length;
      const titansWon = holes.filter((hole) => hole === "Titans").length;
      const remaining = holes.filter((hole) => hole === null).length;
      teamPoints = spartansWon * teamHole;
      playerPoints = spartansWon * individualHole;
      detailLines = [
        `Spartans won ${spartansWon}`,
        `Titans won ${titansWon}`,
        `Remaining ${remaining}`
      ];
    }

    if (style === "placements") {
      const payouts = (wizardConfig.payouts ?? []) as Array<{ place: number; team: number; player: number }>;
      const topOrder = wizardState.pokerOrder.filter(Boolean);
      const topLine = topOrder.slice(0, 3).map((id, index) => {
        const player = playerLookup[id];
        return `#${index + 1} ${player?.name ?? id}`;
      });
      detailLines = topLine;
      const firstPayout = payouts.find((row) => row.place === 1);
      teamPoints = firstPayout?.team ?? 0;
      playerPoints = firstPayout?.player ?? 0;
    }

    return {
      teamPoints,
      playerPoints,
      detailLines
    };
  }, [wizardConfig, wizardState]);

  const resetWizard = () => {
    setWizardState((current) => ({
      ...current,
      gameId: data.games[0]?.id ?? "",
      teamId: data.teamA.id,
      playerId: data.teamA.roster[0]?.id ?? "",
      notes: "",
      targetShots: Array.from({ length: wizardConfig.shots ?? 5 }, () => 0),
      silhouetteCounts: { center: 0, torso: 0, edge: 0 },
      matchPlay: { holesWon: 0, holesRemaining: 0 },
      placement: 1
    }));
  };

  const submitWizard = async () => {
    setStatus("Saving...");

    if (wizardConfig.style === "placements") {
      const payouts = (wizardConfig.payouts ?? []) as Array<{ place: number; team: number; player: number }>;
      const order = wizardState.pokerOrder;
      for (let index = 0; index < order.length; index += 1) {
        const playerId = order[index];
        const payout = payouts.find((row) => row.place === index + 1);
        const player = playerLookup[playerId];
        const teamId = player?.teamId ?? wizardState.teamId;
        await fetch("/api/score-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: wizardState.gameId,
            teamId,
            playerId,
            teamPoints: payout?.team ?? 0,
            playerPoints: payout?.player ?? 0,
            notes: wizardState.notes ? `Poker: ${wizardState.notes}` : `Poker place #${index + 1}`
          })
        });
      }
    } else if (wizardConfig.style === "match-play") {
      const teamHole = Number(wizardConfig.adjustableHoleValue ?? 0);
      const holes = wizardState.matchPlayHoles;
      const spartansWon = holes.filter((hole) => hole === "Spartans").length;
      const titansWon = holes.filter((hole) => hole === "Titans").length;
      const spartansPoints = spartansWon * teamHole;
      const titansPoints = titansWon * teamHole;
      await fetch("/api/score-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: wizardState.gameId,
          teamId: data.teamA.id,
          playerId: null,
          teamPoints: spartansPoints,
          playerPoints: 0,
          notes: "Match play holes awarded"
        })
      });
      await fetch("/api/score-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: wizardState.gameId,
          teamId: data.teamB.id,
          playerId: null,
          teamPoints: titansPoints,
          playerPoints: 0,
          notes: "Match play holes awarded"
        })
      });
    } else {
      const response = await fetch("/api/score-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: wizardState.gameId,
          teamId: wizardState.teamId,
          playerId: wizardState.playerId || null,
          teamPoints: wizardComputed.teamPoints,
          playerPoints: wizardComputed.playerPoints,
          notes: wizardState.notes
        })
      });

      if (!response.ok) {
        setStatus("Save failed.");
        return;
      }
    }

    const dashboardResponse = await fetch("/api/dashboard", { cache: "no-store" });
    if (dashboardResponse.ok) {
      setData(await dashboardResponse.json());
    }

    setStatus("Saved.");
    resetWizard();
  };

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
            <Link href="/chairman" className="secondary-link">
              Chairman
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
        showActions
      />

      <section className="stack">
        <div className="card">
          <div className="section-heading">
            <h2>Score Wizard</h2>
            <span>{status}</span>
          </div>

          <div className="game-swipe">
            {data.games.map((game) => {
              const config = (() => {
                try {
                  return JSON.parse(game.scoringConfig ?? "{}") as Record<string, any>;
                } catch {
                  return {} as Record<string, any>;
                }
              })();
              const isActive = wizardState.gameId === game.id;

              return (
                <button
                  key={game.id}
                  type="button"
                  className={`game-card ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setWizardState((current) => ({
                      ...current,
                      gameId: game.id,
                      targetShots: Array.from({ length: config.shots ?? 5 }, () => 0),
                      silhouetteCounts: { center: 0, torso: 0, edge: 0 },
                      matchPlay: { holesWon: 0, holesRemaining: 0 },
                      placement: 1,
                      pokerOrder: allPlayers.map((player) => player.id),
                      pokerChips: Object.fromEntries(allPlayers.map((player) => [player.id, 200])) as Record<string, number>
                    }));
                  }}
                >
                  <strong>{game.name}</strong>
                  <span>{game.category}</span>
                  <span className="game-card-max">team {getMaxPoints(game, config).maxTeam}</span>
                </button>
              );
            })}
          </div>

          <div className="team-toggle">
            {[data.teamA, data.teamB].map((team) => (
              <button
                key={team.id}
                type="button"
                className={`toggle-pill ${wizardState.teamId === team.id ? "active" : ""}`}
                onClick={() => {
                  const roster = team.id === data.teamB.id ? data.teamB.roster : data.teamA.roster;
                  setWizardState((current) => ({
                    ...current,
                    teamId: team.id,
                    playerId: roster[0]?.id ?? ""
                  }));
                }}
              >
                {team.name}
              </button>
            ))}
          </div>

          <div className="player-drawer">
            <button
              type="button"
              className="drawer-toggle"
              onClick={() => setPlayerDrawerOpen((current) => !current)}
            >
              Choose player
            </button>
            {playerDrawerOpen ? (
              <div className="avatar-row">
                {wizardPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    className={`avatar-button ${wizardState.playerId === player.id ? "active" : ""}`}
                    onClick={() => setWizardState((current) => ({ ...current, playerId: player.id }))}
                  >
                    {player.name.split(" ")[0][0]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="wizard-inline">
            {wizardConfig.style === "target-pips" ? (
              <div className="wizard-block full-span">
                <span className="eyebrow">Shots</span>
                <div className="wizard-shots">
                  {wizardState.targetShots.map((value, index) => (
                    <label key={`shot-${index}`}>
                      <span>Shot {index + 1}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={value}
                        onChange={(event) => {
                          const next = [...wizardState.targetShots];
                          next[index] = Number(event.target.value);
                          setWizardState((current) => ({ ...current, targetShots: next }));
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {wizardConfig.style === "silhouette" ? (
              <div className="wizard-block full-span">
                <span className="eyebrow">Ring counts</span>
                <div className="wizard-shots">
                  {(["center", "torso", "edge"] as const).map((ring) => (
                    <label key={ring}>
                      <span>{ring}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={wizardState.silhouetteCounts[ring]}
                        onChange={(event) =>
                          setWizardState((current) => ({
                            ...current,
                            silhouetteCounts: {
                              ...current.silhouetteCounts,
                              [ring]: Number(event.target.value)
                            }
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {wizardConfig.style === "match-play" ? (
              <div className="wizard-block full-span">
                <span className="eyebrow">Match play holes</span>
                <div className="hole-grid">
                  <div className="hole-row">
                    <span className="hole-team">Spartans</span>
                    <div className="hole-buttons">
                      {wizardState.matchPlayHoles.map((winner, index) => (
                        <button
                          key={`s-${index}`}
                          type="button"
                          className={`hole-button ${winner === "Spartans" ? "active" : ""}`}
                          onClick={() => {
                            const next = [...wizardState.matchPlayHoles];
                            next[index] = winner === "Spartans" ? null : "Spartans";
                            setWizardState((current) => ({ ...current, matchPlayHoles: next }));
                          }}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="hole-row">
                    <span className="hole-team">Titans</span>
                    <div className="hole-buttons">
                      {wizardState.matchPlayHoles.map((winner, index) => (
                        <button
                          key={`t-${index}`}
                          type="button"
                          className={`hole-button ${winner === "Titans" ? "active" : ""}`}
                          onClick={() => {
                            const next = [...wizardState.matchPlayHoles];
                            next[index] = winner === "Titans" ? null : "Titans";
                            setWizardState((current) => ({ ...current, matchPlayHoles: next }));
                          }}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {wizardConfig.style === "placements" ? (
              <div className="wizard-block full-span">
                <span className="eyebrow">Poker order</span>
                <div className="poker-list">
                  {wizardState.pokerOrder.map((playerId, index) => {
                    const player = playerLookup[playerId];
                    return (
                      <div
                        key={playerId}
                        className={`poker-item ${draggedPlayerId === playerId ? "dragging" : ""}`}
                        draggable
                        onTouchStart={() => setDraggedPlayerId(playerId)}
                        onDragStart={(event) => {
                          setDraggedPlayerId(playerId);
                          event.dataTransfer?.setData("text/plain", playerId);
                        }}
                        onDragEnd={() => setDraggedPlayerId(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (!draggedPlayerId || draggedPlayerId === playerId) return;
                          const order = [...wizardState.pokerOrder];
                          const from = order.indexOf(draggedPlayerId);
                          const to = order.indexOf(playerId);
                          order.splice(from, 1);
                          order.splice(to, 0, draggedPlayerId);
                          setWizardState((current) => ({ ...current, pokerOrder: order }));
                          setDraggedPlayerId(null);
                        }}
                      >
                        <span className="poker-handle">≡≡</span>
                        <span className="poker-rank">#{index + 1}</span>
                        <span className="poker-name">{player?.name ?? playerId}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          className="poker-chips"
                          value={wizardState.pokerChips[playerId] ?? 200}
                          onChange={(event) =>
                            setWizardState((current) => ({
                              ...current,
                              pokerChips: {
                                ...current.pokerChips,
                                [playerId]: Number(event.target.value)
                              }
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <label className="full-span">
              <span>Notes</span>
              <textarea
                rows={2}
                value={wizardState.notes}
                onChange={(event) =>
                  setWizardState((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>

            <div className="wizard-summary full-span">
              <div>
                <strong>Team points:</strong> {wizardComputed.teamPoints}
              </div>
              <div>
                <strong>Individual points:</strong> {wizardComputed.playerPoints}
              </div>
              {wizardComputed.detailLines.length ? (
                <div className="wizard-summary-lines">
                  {wizardComputed.detailLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="wizard-actions full-span">
              <button type="button" className="secondary-link" onClick={resetWizard}>
                Reset
              </button>
              <button type="button" className="primary-button" onClick={submitWizard}>
                Submit
              </button>
            </div>
          </div>

          <details className="advanced-panel">
            <summary>Advanced manual entry</summary>
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
          </details>
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
                        {lines.map((line: string) => (
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
