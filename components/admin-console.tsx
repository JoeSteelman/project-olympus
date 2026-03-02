"use client";

import { useMemo, useState } from "react";
import type { GreekAvatar } from "@/lib/avatars";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AdminBootstrap = {
  dashboard: {
    eventName: string;
    winningScore: number;
  };
  players: Array<{
    id: string;
    displayName: string;
    email: string;
    avatarKey: string;
    avatarUrl?: string | null;
    teamId: string | null;
  }>;
  teams: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
    players: Array<{ id: string; displayName: string }>;
  }>;
  games: Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    maxAvailablePoints: number;
    scoringConfig: unknown;
  }>;
  avatars: GreekAvatar[];
};

type AdminConsoleProps = {
  initialData: AdminBootstrap;
};

export function AdminConsole({ initialData }: AdminConsoleProps) {
  const [eventName, setEventName] = useState(initialData.dashboard.eventName);
  const [winningScore, setWinningScore] = useState(initialData.dashboard.winningScore);
  const [games, setGames] = useState(initialData.games);
  const [players, setPlayers] = useState(initialData.players);
  const [message, setMessage] = useState("");
  const [uploadingPlayerId, setUploadingPlayerId] = useState<string | null>(null);
  const uploadsEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const teamLookup = useMemo(
    () => new Map(initialData.teams.map((team) => [team.id, team])),
    [initialData.teams]
  );

  async function saveSettings() {
    setMessage("Saving settings...");

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ eventName, winningScore, games })
    });

    setMessage(response.ok ? "Settings saved." : "Settings failed.");
  }

  async function updatePlayer(
    playerId: string,
    payload: {
      avatarKey?: string;
      avatarUrl?: string | null;
      displayName?: string;
      email?: string;
    }
  ) {
    const response = await fetch("/api/players", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ playerId, ...payload })
    });

    if (!response.ok) {
      setMessage("Member update failed.");
      return;
    }

    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId ? { ...player, ...payload } : player
      )
    );
    setMessage("Member updated.");
  }

  async function uploadAvatar(playerId: string, file: File | null) {
    if (!file) {
      return;
    }

    if (!uploadsEnabled) {
      setMessage("Avatar upload requires Supabase browser keys.");
      return;
    }

    const supabase = (() => {
      try {
        return createSupabaseBrowserClient();
      } catch (error) {
        console.error(error);
        setMessage("Avatar upload is not configured.");
        return null;
      }
    })();

    if (!supabase) {
      return;
    }

    try {
      const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
      const filePath = `members/${playerId}-${Date.now()}.${extension ?? "png"}`;
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || "member-avatars";

      setUploadingPlayerId(playerId);
      setMessage("Uploading avatar...");

      const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
        upsert: true,
        contentType: file.type || undefined
      });

      if (error) {
        console.error(error);
        setMessage("Avatar upload failed.");
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      await updatePlayer(playerId, { avatarUrl: data.publicUrl });
    } catch (error) {
      console.error(error);
      setMessage("Avatar upload failed.");
    } finally {
      setUploadingPlayerId(null);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="eyebrow">Admin Console</div>
        <div className="hero-header">
          <div>
            <h1>Olympus controls</h1>
            <p>Manage members and teams here. Session roster assignments now happen in Chairman.</p>
          </div>
          <span className="score-pill">{message}</span>
        </div>
      </section>

      <section className="stack">
        <div className="card">
          <div className="section-heading">
            <h2>Event Settings</h2>
          </div>
          <div className="entry-form">
            <label>
              <span>Event name</span>
              <input value={eventName} onChange={(event) => setEventName(event.target.value)} />
            </label>
            <label>
              <span>Winning score</span>
              <input
                type="number"
                inputMode="numeric"
                value={winningScore}
                onChange={(event) => setWinningScore(Number(event.target.value))}
              />
            </label>
            <button type="button" className="primary-button full-span" onClick={saveSettings}>
              Save event settings
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Members</h2>
          </div>
          <div className="roster-grid">
            {players.map((player) => (
              <div key={player.id} className="roster-card">
                <div className="member-avatar-shell">
                  <div className="member-avatar-preview">
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt={`${player.displayName} avatar`} />
                    ) : (
                      <span>{player.displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <strong>{player.displayName}</strong>
                    <p>{player.email}</p>
                  </div>
                </div>
                <label>
                  <span>Name</span>
                  <input
                    value={player.displayName}
                    onChange={(event) =>
                      setPlayers((current) =>
                        current.map((row) =>
                          row.id === player.id
                            ? { ...row, displayName: event.target.value }
                            : row
                        )
                      )
                    }
                    onBlur={() =>
                      updatePlayer(player.id, { displayName: player.displayName })
                    }
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={player.email}
                    onChange={(event) =>
                      setPlayers((current) =>
                        current.map((row) =>
                          row.id === player.id ? { ...row, email: event.target.value } : row
                        )
                      )
                    }
                    onBlur={() => updatePlayer(player.id, { email: player.email })}
                  />
                </label>
                <label>
                  <span>Greek avatar</span>
                  <select
                    value={player.avatarKey}
                    onChange={(event) =>
                      updatePlayer(player.id, { avatarKey: event.target.value })
                    }
                  >
                    {initialData.avatars.map((avatar) => (
                      <option key={avatar.key} value={avatar.key}>
                        {avatar.symbol} {avatar.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Avatar image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => uploadAvatar(player.id, event.target.files?.[0] ?? null)}
                  />
                </label>
                <span className="mini-note">
                  {player.teamId ? `Saved home team: ${teamLookup.get(player.teamId)?.name ?? "Unknown"}` : "No saved home team"}
                </span>
                {uploadingPlayerId === player.id ? <span className="mini-note">Uploading image...</span> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Teams</h2>
          </div>
          <div className="roster-grid">
            {initialData.teams.map((team) => (
              <div key={team.id} className="roster-card">
                <div className="member-avatar-shell">
                  <span className="team-color-swatch" style={{ background: team.color }} />
                  <div>
                    <strong>{team.name}</strong>
                    <p>{team.slug}</p>
                  </div>
                </div>
                <span className="mini-note">
                  Saved home members: {players.filter((player) => player.teamId === team.id).length}
                </span>
                <span className="mini-note">Use Chairman to assign the active session roster.</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Games & Scoring</h2>
          </div>
          <div className="roster-grid">
            {games.map((game) => (
              <div key={game.id} className="roster-card">
                <label>
                  <span>Name</span>
                  <input
                    value={game.name}
                    onChange={(event) =>
                      setGames((current) =>
                        current.map((row) =>
                          row.id === game.id ? { ...row, name: event.target.value } : row
                        )
                      )
                    }
                  />
                </label>
                <label>
                  <span>Max available points</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={game.maxAvailablePoints}
                    onChange={(event) =>
                      setGames((current) =>
                        current.map((row) =>
                          row.id === game.id
                            ? { ...row, maxAvailablePoints: Number(event.target.value) }
                            : row
                        )
                      )
                    }
                  />
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={game.enabled}
                    onChange={(event) =>
                      setGames((current) =>
                        current.map((row) =>
                          row.id === game.id ? { ...row, enabled: event.target.checked } : row
                        )
                      )
                    }
                  />
                  <span>Enabled</span>
                </label>
                <label>
                  <span>Scoring JSON</span>
                  <textarea
                    rows={6}
                    value={JSON.stringify(game.scoringConfig, null, 2)}
                    onChange={(event) =>
                      setGames((current) =>
                        current.map((row) =>
                          row.id === game.id
                            ? { ...row, scoringConfig: safeJson(event.target.value, row.scoringConfig) }
                            : row
                        )
                      )
                    }
                  />
                </label>
              </div>
            ))}
          </div>
          <button type="button" className="primary-button" onClick={saveSettings}>
            Save games
          </button>
        </div>
      </section>
    </main>
  );
}

function safeJson(value: string, fallback: unknown) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
