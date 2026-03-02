"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import type { Engine } from "tsparticles-engine";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { DashboardLane } from "@/lib/types";

type OlympusStandingsProps = {
  participants: DashboardLane[];
  winningScore: number;
  remainingAvailablePoints: number;
  updatedAt: string;
  showTrack?: boolean;
  ladderLimit?: number;
  ladderExpandable?: boolean;
  ladderExpandedByDefault?: boolean;
  showActions?: boolean;
};

type Participant = DashboardLane & {
  rank: number;
  progressPct: number;
};

type TimeTheme = {
  name: "morning" | "midday" | "golden" | "night";
  glow: string;
  bg: string;
  track: string;
  accent: string;
};

const THEMES: Record<TimeTheme["name"], TimeTheme> = {
  morning: {
    name: "morning",
    glow: "rgba(156, 210, 255, 0.32)",
    bg: "radial-gradient(circle at top left, rgba(152, 213, 255, 0.16), transparent 38%), linear-gradient(160deg, #0b1a2f, #0a1220)",
    track: "rgba(220, 230, 245, 0.25)",
    accent: "#a7d7ff"
  },
  midday: {
    name: "midday",
    glow: "rgba(255, 239, 170, 0.38)",
    bg: "radial-gradient(circle at top right, rgba(255, 239, 170, 0.22), transparent 40%), linear-gradient(160deg, #0d1726, #0a111d)",
    track: "rgba(245, 223, 160, 0.28)",
    accent: "#ffe6a0"
  },
  golden: {
    name: "golden",
    glow: "rgba(246, 195, 92, 0.35)",
    bg: "radial-gradient(circle at 30% 20%, rgba(246, 195, 92, 0.26), transparent 45%), linear-gradient(160deg, #140c0f, #0c141f)",
    track: "rgba(246, 195, 92, 0.22)",
    accent: "#f6c35c"
  },
  night: {
    name: "night",
    glow: "rgba(120, 160, 255, 0.35)",
    bg: "radial-gradient(circle at 80% 10%, rgba(82, 130, 255, 0.18), transparent 40%), linear-gradient(160deg, #050611, #090e1b)",
    track: "rgba(90, 150, 255, 0.18)",
    accent: "#7aa6ff"
  }
};

function getThemeByTime(date = new Date()): TimeTheme {
  const hour = date.getHours();
  if (hour >= 9 && hour < 12) return THEMES.morning;
  if (hour >= 17 && hour < 19) return THEMES.golden;
  if (hour >= 20 || hour < 6) return THEMES.night;
  return THEMES.midday;
}

export function useTimeCycle(total: number) {
  const [theme, setTheme] = useState<TimeTheme>(() => getThemeByTime());
  const [phase, setPhase] = useState<"charge" | "strike">("charge");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTheme(getThemeByTime());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (total <= 1) {
      setActiveIndex(0);
      return;
    }

    const cycle = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % total);
    }, 3200);

    return () => window.clearInterval(cycle);
  }, [total]);

  useEffect(() => {
    const pulse = window.setInterval(() => {
      setPhase((prev) => (prev === "charge" ? "strike" : "charge"));
    }, 1800);

    return () => window.clearInterval(pulse);
  }, []);

  return { theme, phase, activeIndex } as const;
}

function GodAvatar({ participant, active }: { participant: Participant; active: boolean }) {
  return (
    <motion.div
      layout
      className="flex items-center gap-3"
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <motion.div
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-lg shadow-lg sm:h-12 sm:w-12 sm:text-xl"
        style={{
          background: active
            ? `radial-gradient(circle at 30% 30%, #fff8df, ${participant.avatarColor})`
            : participant.avatarColor,
          color: "#09111f"
        }}
        animate={{
          scale: active ? 1.08 : 1,
          boxShadow: active
            ? `0 0 24px ${participant.avatarColor}`
            : "0 8px 20px rgba(0,0,0,0.22)"
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        {participant.avatarSymbol}
      </motion.div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80 sm:text-sm">
          {participant.teamName}
        </p>
        <p className="truncate text-sm font-semibold text-white sm:text-base">
          {participant.playerName}
        </p>
      </div>
    </motion.div>
  );
}

function LightningBeam({
  color,
  toX,
  toY,
  active
}: {
  color: string;
  toX: number;
  toY: number;
  active: boolean;
}) {
  const filterId = useId().replace(/:/g, "");
  const fromX = 6;
  const fromY = toY;
  const midX = (fromX + toX) / 2;
  const path = `M ${fromX} ${fromY} C ${midX} ${fromY - 18}, ${midX - 10} ${toY + 12}, ${toX} ${toY}`;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
        filter={`url(#${filterId})`}
        initial={{ pathLength: 0, opacity: 0.2 }}
        animate={{ pathLength: active ? 1 : 0.82, opacity: active ? 1 : 0.45 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke="#fff7db"
        strokeWidth="0.35"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.2 }}
        animate={{ pathLength: active ? 1 : 0.82, opacity: active ? 0.95 : 0.35 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />
    </svg>
  );
}

function LiveStandings({
  participants,
  activeIndex,
  rankDeltas,
  limit,
  expandable,
  expandedByDefault,
  showActions,
  currentUserId,
  onTalk,
  onBeer,
  onTokenClear,
  tapToken,
  cooldownSeconds,
  playerStates
}: {
  participants: Participant[];
  activeIndex: number;
  rankDeltas: Map<string, number>;
  limit?: number;
  expandable?: boolean;
  expandedByDefault?: boolean;
  showActions?: boolean;
  currentUserId?: string;
  onTalk?: (targetId: string) => void;
  onBeer?: (targetId: string) => void;
  onTokenClear?: () => void;
  tapToken?: "beer" | "poop" | null;
  cooldownSeconds?: (userId: string) => number;
  playerStates?: Record<string, any>;
}) {
  const leaderId = participants[0]?.playerId;
  const [expanded, setExpanded] = useState(expandedByDefault ?? false);
  const visibleCount = expanded || !expandable ? participants.length : limit ?? participants.length;

  const renderTally = (count: number) => {
    if (!count) return "";
    const groups = Math.floor(count / 5);
    const remainder = count % 5;
    const rows: string[] = [];
    for (let g = 0; g < groups; g += 1) {
      rows.push("||||/");
    }
    if (remainder) {
      rows.push("|".repeat(remainder));
    }
    return rows.join(" ");
  };

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-xl sm:rounded-[28px] sm:p-4">
      <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-sky-200/70 sm:text-xs">Live Standings</p>
          <h3
            className="text-lg font-semibold text-white sm:text-2xl"
            style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif' }}
          >
            Thunder Ladder
          </h3>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-white/70 sm:px-3 sm:text-xs">
          rotating focus
        </div>
      </div>

      <LayoutGroup>
        <div className="space-y-1.5 sm:space-y-2">
          <AnimatePresence mode="popLayout">
            {participants.slice(0, visibleCount).map((participant, index) => {
              const active = index === activeIndex;
              const leader = participant.playerId === leaderId;

              return (
                <motion.div
                  key={participant.playerId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className={`rounded-xl border p-1.5 sm:rounded-2xl sm:p-2 ${
                    active ? "border-amber-200/40 bg-white/12" : "border-white/8 bg-black/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <GodAvatar participant={participant} active={active} />
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/55">#{participant.rank}</p>
                      <div className="flex items-center justify-end gap-2">
                        <p className="text-base font-semibold text-white sm:text-lg">
                          {participant.points}
                        </p>
                        {rankDeltas.get(participant.playerId) ? (
                          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                            +{rankDeltas.get(participant.playerId)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8 sm:mt-2">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${participant.avatarColor}, #fff1b8)`
                      }}
                      animate={{ width: `${participant.progressPct}%` }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    />
                  </div>
                  {showActions ? (
                    <button
                      type="button"
                      className="ladder-actions drop-zone"
                      onClick={() => {
                        if (!tapToken) return;
                        if (tapToken === "beer") {
                          onBeer?.(participant.playerId);
                        }
                        if (tapToken === "poop") {
                          onTalk?.(participant.playerId);
                        }
                        onTokenClear?.();
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const token = event.dataTransfer?.getData("text/plain") as "beer" | "poop" | "";
                        if (!token) return;
                        if (token === "beer") {
                          onBeer?.(participant.playerId);
                        }
                        if (token === "poop") {
                          onTalk?.(participant.playerId);
                        }
                      }}
                    >
                      <span className="drop-label">
                        {tapToken ? `Tap to send ${tapToken === "beer" ? "🍺" : "💩"}` : "Drop or tap"}
                      </span>
                      <span className="beer-tally">
                        {renderTally(playerStates?.[participant.playerId]?.beersReceived ?? 0)}
                      </span>
                    </button>
                  ) : null}
                  {leader ? (
                    <div className="mt-1 text-[9px] uppercase tracking-[0.26em] text-amber-200/75 sm:mt-1.5 sm:text-[10px]">
                      current leader
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </LayoutGroup>

      {expandable ? (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80"
            onClick={() => setExpanded((current) => !current)}
            aria-label={expanded ? "Show fewer" : "Show all"}
          >
            {expanded ? "-" : "+"}
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function RaceTrack({
  participants,
  activeIndex,
  phase,
  glow,
  particlesInit
}: {
  participants: Participant[];
  activeIndex: number;
  phase: "charge" | "strike";
  glow: string;
  particlesInit?: (engine: Engine) => Promise<void>;
}) {
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const focused = participants[activeIndex] ?? participants[0];

  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const marble = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      marble.addColorStop(0, "#0b1627");
      marble.addColorStop(0.5, "#13233d");
      marble.addColorStop(1, "#0a1220");
      ctx.fillStyle = marble;
      ctx.fillRect(0, 0, rect.width, rect.height);

      for (let i = 0; i < 10; i += 1) {
        const y = (rect.height / 10) * i;
        ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(215,207,191,0.05)";
        ctx.fillRect(0, y, rect.width, rect.height / 10);
      }

      const laneHeight = rect.height / Math.max(participants.length, 1);
      participants.forEach((participant, index) => {
        const top = laneHeight * index + 6;
        const height = Math.max(laneHeight - 12, 14);

        const lane = ctx.createLinearGradient(0, top, rect.width, top);
        lane.addColorStop(0, "rgba(228, 220, 202, 0.14)");
        lane.addColorStop(0.4, "rgba(214, 206, 187, 0.24)");
        lane.addColorStop(1, "rgba(126, 155, 193, 0.08)");
        ctx.fillStyle = lane;
        ctx.fillRect(18, top, rect.width - 36, height);

        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(18, top, rect.width - 36, height);

        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.font = "600 11px 'Trebuchet MS', sans-serif";
        ctx.fillText(String(index + 1).padStart(2, "0"), 24, top + height / 2 + 4);

        ctx.fillStyle = participant.avatarColor;
        ctx.fillRect(rect.width - 24, top, 2, height);
      });

      [0.25, 0.5, 0.75, 1].forEach((mark) => {
        const x = rect.width * mark;
        ctx.strokeStyle = mark < 1 ? "rgba(255,255,255,0.09)" : "rgba(246,195,92,0.18)";
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(x, 14);
        ctx.lineTo(x, rect.height - 14);
        ctx.stroke();
      });

      ctx.setLineDash([]);
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [participants]);

  useEffect(() => {
    const canvas = fxCanvasRef.current;
    if (!canvas || !participants[0]) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      [0.25, 0.5, 0.75].forEach((mark, index) => {
        const x = rect.width * mark;
        ctx.strokeStyle = index === 2 ? "rgba(246,195,92,0.6)" : "rgba(141, 193, 255, 0.42)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 12);
        ctx.lineTo(x - 8, 28);
        ctx.lineTo(x + 4, 28);
        ctx.lineTo(x - 6, 48);
        ctx.stroke();
      });
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [participants]);

  if (!focused) return null;

  const strikeX = Math.max(8, Math.min(96, focused.progressPct));
  const focusedLane = Math.max(12, Math.min(86, ((activeIndex + 0.5) / participants.length) * 100));

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-[#08111e] shadow-olympus sm:rounded-[28px]">
      <canvas ref={baseCanvasRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={fxCanvasRef} className="absolute inset-0 h-full w-full" />

      <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 120px ${glow}` }} />

      <div className="absolute inset-x-4 top-4 flex items-center justify-between sm:inset-x-6 sm:top-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-sky-200/70 sm:text-[11px]">Olympus Standings</p>
          <h3
            className="text-xl font-semibold text-white sm:text-3xl"
            style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif' }}
          >
            Storm Circuit
          </h3>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-white/65 sm:px-3 sm:py-2 sm:text-xs">
          milestone lightning
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-4 top-20 sm:inset-x-6 sm:bottom-8 sm:top-24">
        <div className="relative h-full">
          {participants.map((participant, index) => {
            const top = `${(index / participants.length) * 100}%`;
            const active = index === activeIndex;

            return (
              <motion.div
                key={participant.playerId}
                className="absolute left-0 right-0"
                style={{ top, height: `${100 / participants.length}%` }}
              >
                <motion.div
                  className="absolute top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-full border border-white/10 px-2 py-1.5 sm:px-3 sm:py-2"
                  style={{
                    background: active ? "rgba(255,255,255,0.16)" : "rgba(6,12,21,0.45)"
                  }}
                  animate={{
                    left: `calc(${participant.progressPct}% - 14px)`,
                    scale: active ? 1.03 : 1
                  }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm sm:h-10 sm:w-10 sm:text-lg"
                    style={{
                      background: participant.avatarColor,
                      color: "#09111f"
                    }}
                  >
                    {participant.avatarSymbol}
                  </div>
                  <div className="hidden pr-2 sm:block">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">{participant.teamName}</p>
                    <p className="text-sm font-semibold text-white">{participant.playerName}</p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <LightningBeam color={focused.avatarColor} toX={strikeX} toY={focusedLane} active={phase === "strike"} />

      <div
        className="pointer-events-none absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 sm:h-24 sm:w-24"
        style={{ left: `${strikeX}%`, top: `${focusedLane}%` }}
      >
        <Particles
          id={`olympus-sparks-${focused.playerId}`}
          init={particlesInit}
          options={{
            fullScreen: { enable: false },
            background: { color: "transparent" },
            fpsLimit: 60,
            particles: {
              number: { value: phase === "strike" ? 18 : 8 },
              color: { value: [focused.avatarColor, "#fff2c7", "#8bd3ff"] },
              size: { value: { min: 1, max: 3 } },
              opacity: { value: { min: 0.25, max: 0.9 } },
              move: {
                enable: true,
                speed: { min: 0.6, max: 1.8 },
                direction: "none",
                outModes: { default: "destroy" }
              },
              life: { duration: { sync: false, value: 0.9 } }
            },
            emitters: {
              direction: "none",
              rate: { delay: 0.12, quantity: phase === "strike" ? 12 : 4 },
              size: { width: 6, height: 6 },
              position: { x: 50, y: 50 }
            },
            detectRetina: true
          }}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

export function OlympusStandings({
  participants,
  winningScore,
  remainingAvailablePoints,
  updatedAt,
  showTrack = true,
  ladderLimit = 4,
  ladderExpandable = true,
  ladderExpandedByDefault = false,
  showActions = false
}: OlympusStandingsProps) {
  const ranked = useMemo(
    () =>
      [...participants]
        .sort((left, right) => right.points - left.points)
        .map((participant, index) => ({
          ...participant,
          rank: index + 1,
          progressPct: Math.min(100, (participant.points / Math.max(winningScore, 1)) * 100)
        })),
    [participants, winningScore]
  );

  const previousRanks = useRef(new Map<string, number>());
  const rankDeltas = useMemo(() => {
    const deltas = new Map<string, number>();
    ranked.forEach((participant) => {
      const previous = previousRanks.current.get(participant.playerId);
      if (previous && previous > participant.rank) {
        deltas.set(participant.playerId, previous - participant.rank);
      }
    });
    previousRanks.current = new Map(ranked.map((participant) => [participant.playerId, participant.rank]));
    return deltas;
  }, [ranked]);

  const { theme, phase, activeIndex } = useTimeCycle(ranked.length);
  const updatedLabel = new Date(updatedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [playerStates, setPlayerStates] = useState<Record<string, any>>({});
  const [notices, setNotices] = useState<Array<{ id: string; message: string; kind: string }>>([]);
  const [talkOpen, setTalkOpen] = useState(false);
  const [talkTargetId, setTalkTargetId] = useState<string | null>(null);
  const [talkMessage, setTalkMessage] = useState("");
  const [talkSecondsLeft, setTalkSecondsLeft] = useState(7);
  const [dragToken, setDragToken] = useState<"beer" | "poop" | null>(null);
  const [tapToken, setTapToken] = useState<"beer" | "poop" | null>(null);

  useEffect(() => {
    if (!showActions) return;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("olympus-current-user") : null;
    const fallback = participants[0]?.playerId ?? "";
    setCurrentUserId(stored || fallback);
  }, [showActions, participants]);

  useEffect(() => {
    if (!showActions || !currentUserId) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("olympus-current-user", currentUserId);
    }
  }, [showActions, currentUserId]);

  useEffect(() => {
    if (!showActions) return;

    const fetchData = async () => {
      const [statesRes, noticesRes] = await Promise.all([
        fetch("/api/player-state", { cache: "no-store" }),
        fetch("/api/notice", { cache: "no-store" })
      ]);

      if (statesRes.ok) {
        const states = await statesRes.json();
        const mapped: Record<string, any> = {};
        states.forEach((state: any) => {
          mapped[state.userId] = state;
        });
        setPlayerStates(mapped);
      }

      if (noticesRes.ok) {
        const noticeItems = await noticesRes.json();
        setNotices(noticeItems);
      }
    };

    fetchData();
    const interval = window.setInterval(fetchData, 5000);
    return () => window.clearInterval(interval);
  }, [showActions]);

  useEffect(() => {
    if (!talkOpen) return;
    setTalkSecondsLeft(7);
    const tick = window.setInterval(() => {
      setTalkSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(tick);
          setTalkOpen(false);
          if (currentUserId && talkTargetId) {
            fetch("/api/talkshit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fromUserId: currentUserId, toUserId: talkTargetId, timeout: true })
            });
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [talkOpen, currentUserId, talkTargetId]);

  const cooldownSeconds = (userId: string) => {
    const state = playerStates[userId];
    if (!state?.talkShitCooldownUntil) return 0;
    const remaining = new Date(state.talkShitCooldownUntil).getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  };

  const sendTalk = async () => {
    if (!currentUserId || !talkTargetId || !talkMessage.trim()) return;
    await fetch("/api/talkshit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUserId: currentUserId, toUserId: talkTargetId, message: talkMessage })
    });
    setTalkOpen(false);
    setTalkMessage("");
  };

  const buyBeer = async (toUserId: string) => {
    if (!currentUserId) return;
    await fetch("/api/beer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUserId: currentUserId, toUserId, count: 1, reason: "buy" })
    });
  };

  const shotgunBeer = async () => {
    if (!currentUserId) return;
    await fetch("/api/beer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, add: 3 })
    });
  };

  const openTalk = (targetId: string) => {
    setTalkTargetId(targetId);
    setTalkMessage("");
    setTalkOpen(true);
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/10 p-3 shadow-olympus sm:rounded-[32px] sm:p-6"
      style={{ background: theme.bg }}
    >
      {showActions ? (
        <div className="action-bar">
          <div className="action-row-inline">
            <span className="eyebrow">You are</span>
            <select
              value={currentUserId}
              onChange={(event) => setCurrentUserId(event.target.value)}
            >
              {participants.map((participant) => (
                <option key={participant.playerId} value={participant.playerId}>
                  {participant.playerName}
                </option>
              ))}
            </select>
            <div className="beer-bank">
              <span className="beer-count">
                {Array.from({ length: Math.max(0, playerStates[currentUserId]?.beerBalance ?? 0) }).map((_, index) => (
                  <span
                    key={`beer-${index}`}
                    className={`beer-token ${tapToken === "beer" ? "selected" : ""}`}
                    draggable
                    onClick={() => setTapToken("beer")}
                    onDragStart={(event) => {
                      setDragToken("beer");
                      event.dataTransfer?.setData("text/plain", "beer");
                    }}
                  >
                    🍺
                  </span>
                ))}
              </span>
              <span
                className={`beer-token ${tapToken === "poop" ? "selected" : ""}`}
                draggable
                onClick={() => setTapToken("poop")}
                onDragStart={(event) => {
                  setDragToken("poop");
                  event.dataTransfer?.setData("text/plain", "poop");
                }}
              >
                💩
              </span>
            </div>
            <button type="button" className="secondary-link" onClick={shotgunBeer}>
              Shotgun +3
            </button>
          </div>
          {notices.length ? (
            <div className="notice-strip">
              {notices.slice(0, 2).map((notice) => (
                <span key={notice.id} className={`notice-pill ${notice.kind === "TALKSHIT" ? "talk" : ""}`}>
                  {notice.message}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 sm:mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.34em] text-amber-200/75 sm:text-xs">Project Olympus</p>
          <h2
            className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl"
            style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif' }}
          >
            Standings Dashboard
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-white/65 sm:text-xs">
          <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 sm:px-3 sm:py-2">
            updated {updatedLabel}
          </div>
        </div>
      </div>

      <div
        className={`grid gap-3 sm:gap-4 ${showTrack ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}
      >
        {showTrack ? (
          <div className="relative order-2 xl:order-1">
            <RaceTrack
              participants={ranked}
              activeIndex={activeIndex}
              phase={phase}
              glow={theme.glow}
              particlesInit={particlesInit}
            />
            <Particles
              id="olympus-field"
              init={particlesInit}
              options={{
                fullScreen: { enable: false },
                background: { color: "transparent" },
                fpsLimit: 60,
                particles: {
                  number: { value: 16 },
                  color: { value: theme.accent },
                  size: { value: { min: 0.8, max: 2.4 } },
                  opacity: { value: { min: 0.1, max: 0.4 } },
                  move: { enable: true, speed: { min: 0.2, max: 0.6 }, direction: "none" }
                },
                detectRetina: true
              }}
              className="pointer-events-none absolute inset-0"
            />
          </div>
        ) : null}
        <div className={showTrack ? "order-1 xl:order-2" : "order-1"}>
          <LiveStandings
            participants={ranked}
            activeIndex={activeIndex}
            rankDeltas={rankDeltas}
            limit={ladderLimit}
            expandable={ladderExpandable}
            expandedByDefault={ladderExpandedByDefault}
            showActions={showActions}
            currentUserId={currentUserId}
            onTalk={openTalk}
            onBeer={buyBeer}
            onTokenClear={() => setTapToken(null)}
            tapToken={tapToken}
            cooldownSeconds={cooldownSeconds}
            playerStates={playerStates}
          />
        </div>
      </div>

      {showActions && talkOpen ? (
        <div className="talk-backdrop" onClick={() => setTalkOpen(false)}>
          <div className="talk-panel" onClick={(event) => event.stopPropagation()}>
            <div className="talk-header">
              <span className="eyebrow">Talk shit</span>
              <span className="talk-timer">{talkSecondsLeft}s</span>
            </div>
            <textarea
              rows={3}
              value={talkMessage}
              onChange={(event) => setTalkMessage(event.target.value)}
              placeholder="Say it."
            />
            <div className="talk-actions">
              <button type="button" className="secondary-link" onClick={() => setTalkOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={sendTalk}>
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
