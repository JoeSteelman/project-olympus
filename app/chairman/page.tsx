"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Player = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  team?: { id: string; name: string } | null;
  baseTeam?: { id: string; name: string } | null;
};

type Team = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

type Session = {
  id: string;
  status: string;
  chairmanId?: string | null;
};

export default function ChairmanPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [chairmanId, setChairmanId] = useState<string>("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeDuration, setNoticeDuration] = useState(120);
  const [status, setStatus] = useState("");
  const [noticeLog, setNoticeLog] = useState<Array<{ id: string; message: string; expiresAt: string; createdAt: string }>>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const loadData = async () => {
    const [rosterRes, sessionRes, noticeRes] = await Promise.all([
      fetch("/api/roster", { cache: "no-store" }),
      fetch("/api/session", { cache: "no-store" }),
      fetch("/api/notice", { cache: "no-store" })
    ]);

    if (rosterRes.ok) {
      const roster = await rosterRes.json();
      setPlayers(roster.players ?? []);
      setTeams(roster.teams ?? []);
      setChairmanId((current) => current || roster.players?.[0]?.id || "");
    }

    if (sessionRes.ok) {
      const sess = await sessionRes.json();
      setSession(sess);
      if (sess?.chairmanId) {
        setChairmanId(sess.chairmanId);
      }
    }

    if (noticeRes.ok) {
      const notices = await noticeRes.json();
      setNoticeLog(notices);
    }
  };

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 5000);
    return () => window.clearInterval(interval);
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
    await loadData();
    setStatus("Session started. Set the roster below.");
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
    await loadData();
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

  const isSessionActive = session?.status === "ACTIVE";

  const movePlayer = async (playerId: string, teamId: string) => {
    if (!isSessionActive) {
      setStatus("Start a session before editing the session roster.");
      return;
    }

    const response = await fetch("/api/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: playerId, teamId })
    });

    if (!response.ok) {
      const data = await response.json();
      setStatus(data.error ?? "Unable to move member.");
      return;
    }

    const team = teams.find((candidate) => candidate.id === teamId);
    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId
          ? {
              ...player,
              team: team ? { id: team.id, name: team.name } : null
            }
          : player
      )
    );
    setStatus("Session roster updated.");
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="eyebrow">Chairman Console</div>
        <div className="hero-header">
          <div>
            <h1>Game Session Control</h1>
            <p>Start a session, assign the active roster, and broadcast notices.</p>
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
                    {player.displayName}
                  </option>
                ))}
              </select>
            </label>
            <div className="wizard-actions full-span">
              <button type="button" className="primary-button lightning-button" onClick={startSession}>
                Start game
              </button>
              <button type="button" className="secondary-link" onClick={resetSession}>
                Reset session
              </button>
            </div>
            {session ? <div className="mini-note">Active session: {session.id}</div> : null}
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Session Roster</h2>
            <span>{isSessionActive ? "Drag members between teams" : "Start a session to assign teams"}</span>
          </div>
          <div className={`team-builder ${isSessionActive ? "" : "locked"}`}>
            {teams.map((team) => (
              <div
                key={team.id}
                className="team-column"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggedId) return;
                  movePlayer(draggedId, team.id);
                  setDraggedId(null);
                }}
              >
                <div className="team-column-header">
                  <strong>{team.name}</strong>
                </div>
                <div className="team-column-body">
                  {players
                    .filter((player) => player.team?.id === team.id)
                    .map((player) => (
                      <div
                        key={player.id}
                        className="player-chip"
                        draggable={isSessionActive}
                        onDragStart={() => setDraggedId(player.id)}
                      >
                        {player.displayName}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          {!isSessionActive ? (
            <div className="mini-note">Roster edits only affect the active session and no longer change Admin member records.</div>
          ) : null}
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
