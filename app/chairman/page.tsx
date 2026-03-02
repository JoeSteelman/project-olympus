"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Player = {
  id: string;
  displayName: string;
  team?: { name: string } | null;
};

type Session = {
  id: string;
  status: string;
  chairmanId?: string | null;
};

export default function ChairmanPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [chairmanId, setChairmanId] = useState<string>("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeDuration, setNoticeDuration] = useState(120);
  const [status, setStatus] = useState("");
  const [noticeLog, setNoticeLog] = useState<Array<{ id: string; message: string; expiresAt: string; createdAt: string }>>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [rosterRes, sessionRes, noticeRes] = await Promise.all([
        fetch("/api/roster", { cache: "no-store" }),
        fetch("/api/session", { cache: "no-store" }),
        fetch("/api/notice", { cache: "no-store" })
      ]);
      if (rosterRes.ok) {
        const roster = await rosterRes.json();
        setPlayers(roster);
        setChairmanId(roster[0]?.id ?? "");
      }
      if (sessionRes.ok) {
        const sess = await sessionRes.json();
        setSession(sess);
      }
      if (noticeRes.ok) {
        const notices = await noticeRes.json();
        setNoticeLog(notices);
      }
    };
    load();
  }, []);

  const startSession = async () => {
    setStatus("Starting...");
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", chairmanId })
    });
    if (!response.ok) {
      const data = await response.json();
      setStatus(data.error ?? "Unable to start.");
      return;
    }
    setSession(await response.json());
    setStatus("Session started.");
  };

  const resetSession = async () => {
    setStatus("Resetting...");
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" })
    });
    if (!response.ok) {
      const data = await response.json();
      setStatus(data.error ?? "Unable to reset.");
      return;
    }
    setSession(null);
    setStatus("Session reset.");
  };

  const sendNotice = async () => {
    if (!noticeMessage.trim()) return;
    setStatus("Broadcasting...");
    const response = await fetch("/api/notice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: noticeMessage,
        durationSeconds: noticeDuration,
        createdById: chairmanId,
        kind: "NOTICE"
      })
    });
    if (!response.ok) {
      const data = await response.json();
      setStatus(data.error ?? "Unable to broadcast.");
      return;
    }
    const newNotice = await response.json();
    setNoticeLog((current) => [newNotice, ...current]);
    setNoticeMessage("");
    setStatus("Notice sent.");
  };

  const isLocked = session?.status === "ACTIVE";
  const spartans = players.filter((player) => player.team?.name === "Spartans");
  const titans = players.filter((player) => player.team?.name === "Titans");

  const movePlayer = async (playerId: string, teamName: "Spartans" | "Titans") => {
    const teamId = players.find((player) => player.team?.name === teamName)?.team?.id;
    if (!teamId) return;
    await fetch("/api/players", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, teamId })
    });
    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId ? { ...player, team: { ...(player.team ?? {}), name: teamName, id: teamId } } : player
      )
    );
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="eyebrow">Chairman Console</div>
        <div className="hero-header">
          <div>
            <h1>Game Session Control</h1>
            <p>Lock a chairman and broadcast notices during an active session.</p>
          </div>
          <div className="action-row">
            <Link href="/" className="secondary-link">
              Back to board
            </Link>
          </div>
        </div>
      </section>

      <section className="stack">
        <div className="card">
          <div className="section-heading">
            <h2>Session</h2>
            <span>{status}</span>
          </div>
          <div className="entry-form">
            <label>
              <span>Chairman</span>
              <select value={chairmanId} onChange={(event) => setChairmanId(event.target.value)}>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.displayName} {player.team?.name ? `(${player.team.name})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="wizard-actions full-span">
              <button type="button" className="primary-button lightning-button" onClick={startSession}>
                ⚡ Start game
              </button>
              <button type="button" className="secondary-link" onClick={resetSession}>
                Reset session
              </button>
            </div>
            {session ? (
              <div className="mini-note">
                Active session: {session.id}
              </div>
            ) : null}
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Team Builder</h2>
            <span>{isLocked ? "Locked during active session" : "Drag players between teams"}</span>
          </div>
          <div className={`team-builder ${isLocked ? "locked" : ""}`}>
            {[
              { name: "Spartans" as const, players: spartans },
              { name: "Titans" as const, players: titans }
            ].map((team) => (
              <div
                key={team.name}
                className="team-column"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (isLocked || !draggedId) return;
                  movePlayer(draggedId, team.name);
                  setDraggedId(null);
                }}
              >
                <div className="team-column-header">
                  <strong>{team.name}</strong>
                </div>
                <div className="team-column-body">
                  {team.players.map((player) => (
                    <div
                      key={player.id}
                      className="player-chip"
                      draggable={!isLocked}
                      onDragStart={() => setDraggedId(player.id)}
                    >
                      {player.displayName}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Broadcast Notice</h2>
          </div>
          <div className="entry-form">
            <label>
              <span>Message</span>
              <textarea
                rows={3}
                value={noticeMessage}
                onChange={(event) => setNoticeMessage(event.target.value)}
              />
            </label>
            <label>
              <span>Duration</span>
              <select value={noticeDuration} onChange={(event) => setNoticeDuration(Number(event.target.value))}>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
            </label>
            <button type="button" className="primary-button" onClick={sendNotice}>
              Broadcast
            </button>
          </div>
          <div className="mini-log">
            {noticeLog.length ? (
              noticeLog.map((notice) => (
                <div key={notice.id} className="mini-log-row">
                  <strong>{notice.message}</strong>
                  <span>
                    Expires {new Date(notice.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              ))
            ) : (
              <div className="mini-note">No broadcasts yet.</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
