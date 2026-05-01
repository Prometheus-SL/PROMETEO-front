import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IndeterminateBar } from "@/components/ui/indeterminate-bar";
import type {
  FootballMatch,
  FootballStandings,
  FootballTeam,
} from "./football-service";

export function Crest({
  team,
  size = 18,
  className,
}: {
  team: Pick<FootballTeam, "id" | "code" | "shortName" | "name" | "crest">;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const fallback = (team.code || team.shortName || team.name || "").slice(0, 3).toUpperCase();
  const fallbackFontSize = Math.max(8, Math.round(size * 0.45));

  if (!errored && team.crest) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
        style={{ width: size, height: size }}
        aria-label={team.name}
      >
        <img
          src={team.crest}
          alt={team.name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border/40 bg-background/60 font-semibold text-foreground/80",
        className,
      )}
      style={{ width: size, height: size, fontSize: fallbackFontSize }}
      aria-label={team.name}
    >
      {fallback || "?"}
    </span>
  );
}

export function ScoreLine({
  match,
  compact = false,
  centerSlot,
}: {
  match: FootballMatch;
  compact?: boolean;
  centerSlot?: ReactNode;
}) {
  const homeScore = match.home.score ?? 0;
  const awayScore = match.away.score ?? 0;
  return (
    <div
      className={cn(
        "flex items-center gap-2 tabular-nums font-semibold text-foreground",
        compact ? "text-base" : "text-2xl",
      )}
    >
      <span>{homeScore}</span>
      {centerSlot ?? <span className="text-muted-foreground">-</span>}
      <span>{awayScore}</span>
    </div>
  );
}

// FotMob's `liveTime.short` uses formats like "37'", "45+2'", "HT", "FT".
// We extract the displayed game minute (45+2 → 47) so the local seconds
// counter has a stable anchor; non-numeric tokens (HT/FT) are surfaced as-is.
function parseGameMinute(raw: string): {
  minute: number | null;
  isHalftime: boolean;
  fallback: string;
} {
  const text = (raw || "").trim();
  if (!text) return { minute: null, isHalftime: false, fallback: "" };
  if (/^(half[- ]?time|ht|descanso)$/i.test(text)) {
    return { minute: null, isHalftime: true, fallback: "HT" };
  }
  const match = text.match(/^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?\s*'?$/);
  if (match) {
    const base = parseInt(match[1], 10);
    const added = match[2] ? parseInt(match[2], 10) : 0;
    return { minute: base + added, isHalftime: false, fallback: text };
  }
  return { minute: null, isHalftime: false, fallback: text };
}

// Live clock shown between scores. The MINUTE is the backend's (FotMob's),
// which already accounts for halftime / stoppage / extra time. SECONDS are
// counted locally from the moment the minute last advanced — they are an
// estimate but tick smoothly.
//
// If FotMob doesn't provide a parseable minute (e.g. status comes back as
// just "In progress"), we render the bare "LIVE" label rather than guessing
// the minute from kickoff: a wall-clock estimate would drift by ~15 min after
// halftime and would mislead the user about the actual game time.
export function LiveClock({
  statusDescription,
  size = "md",
}: {
  statusDescription: string;
  size?: "sm" | "md";
}) {
  const parsed = parseGameMinute(statusDescription);
  const [, setTick] = useState(0);
  const minuteRef = useRef<number | null>(null);
  const anchorRef = useRef<number>(Date.now());

  if (parsed.minute !== null && parsed.minute !== minuteRef.current) {
    minuteRef.current = parsed.minute;
    anchorRef.current = Date.now();
  }

  useEffect(() => {
    if (parsed.isHalftime || parsed.minute === null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [parsed.isHalftime, parsed.minute]);

  const textCls = size === "sm" ? "text-[11px]" : "text-xs";
  const wrapCls = size === "sm" ? "w-16" : "w-20";

  let label: ReactNode;
  if (parsed.isHalftime) {
    label = "HT";
  } else if (parsed.minute === null) {
    label = "LIVE";
  } else {
    const seconds = Math.min(
      59,
      Math.max(0, Math.floor((Date.now() - anchorRef.current) / 1000)),
    );
    label = `${String(parsed.minute).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col items-center gap-1.5 leading-none">
      <span className={cn("font-semibold tabular-nums text-emerald-400", textCls)}>
        {label}
      </span>
      <div className={wrapCls}>
        <IndeterminateBar />
      </div>
    </div>
  );
}

function isFavorite(team: { name: string; shortName: string }, favoriteTeamName: string): boolean {
  if (!favoriteTeamName) return false;
  const target = favoriteTeamName.toLowerCase();
  return team.name.toLowerCase() === target || team.shortName.toLowerCase() === target;
}

export function MatchHeader({
  match,
  favoriteTeamName,
}: {
  match: FootballMatch;
  favoriteTeamName: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <Crest team={match.home.team} size={26} />
        <span
          className={cn(
            "truncate font-semibold",
            isFavorite(match.home.team, favoriteTeamName) && "text-blue-200",
          )}
        >
          {match.home.team.shortName}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center">
        <ScoreLine
          match={match}
          centerSlot={
            match.status === "inprogress" ? (
              <LiveClock statusDescription={match.statusDescription} />
            ) : undefined
          }
        />
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <span
          className={cn(
            "truncate font-semibold",
            isFavorite(match.away.team, favoriteTeamName) && "text-blue-200",
          )}
        >
          {match.away.team.shortName}
        </span>
        <Crest team={match.away.team} size={26} />
      </div>
    </div>
  );
}

function ZoneStripe({ position, totalRows }: { position: number; totalRows: number }) {
  // LaLiga zones (top of league sees CL + EL + Conf League; bottom sees relegation playoff + drop).
  let color: string | null = null;
  if (position >= 1 && position <= 4) color = "bg-emerald-500"; // Champions League
  else if (position === 5) color = "bg-orange-400";              // Europa League
  else if (position === 6) color = "bg-sky-500";                 // Conference League playoff (LaLiga uses 6th for Conference)
  else if (position === totalRows - 2) color = "bg-amber-500";   // 18th — relegation playoff (varies by league)
  else if (position >= totalRows - 1) color = "bg-rose-500";     // 19-20 — relegated
  if (!color) return <span className="block h-full w-[3px]" />;
  return <span className={cn("block h-full w-[3px] rounded-r-sm", color)} />;
}

export function StandingsTable({
  standings,
  favoriteTeamName,
}: {
  standings: FootballStandings;
  favoriteTeamName: string;
}) {
  const totalRows = standings.rows.length;
  // The native scrollbar is hidden via .football-standings-scroll. A custom
  // indicator (rendered after the scroll container, absolutely positioned)
  // gives us a clean thumb with zero browser chrome — no arrow buttons, no
  // engine quirks across Chrome / Firefox / Opera / Edge.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [thumb, setThumb] = useState({ visible: false, top: 0, height: 0 });
  const [thumbHover, setThumbHover] = useState(false);
  const dragStateRef = useRef<{ startY: number; startScroll: number } | null>(null);

  const recompute = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    if (scrollHeight <= clientHeight + 1) {
      setThumb((t) => (t.visible ? { ...t, visible: false } : t));
      return;
    }
    const trackHeight = track.clientHeight;
    const ratio = clientHeight / scrollHeight;
    const height = Math.max(28, Math.round(trackHeight * ratio));
    const maxScroll = scrollHeight - clientHeight;
    const maxTop = trackHeight - height;
    const top = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * maxTop) : 0;
    setThumb({ visible: true, top, height });
  }, []);

  useEffect(() => {
    recompute();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute, standings.rows.length]);

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { startY: e.clientY, startScroll: el.scrollTop };
  };

  const onThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!drag || !el || !track) return;
    const dy = e.clientY - drag.startY;
    const trackHeight = track.clientHeight;
    const maxTop = trackHeight - thumb.height;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxTop <= 0 || maxScroll <= 0) return;
    const scrollDelta = (dy / maxTop) * maxScroll;
    el.scrollTop = drag.startScroll + scrollDelta;
  };

  const onThumbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Header lives INSIDE the scrollable container as a sticky element so
  // both header and rows share the same horizontal coordinate system.
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-lg border border-border/40 bg-background/40">
      <div
        ref={scrollRef}
        onScroll={recompute}
        className="football-standings-scroll flex-1 overflow-y-auto pr-2.5"
      >
        <div className="sticky top-0 z-10 grid grid-cols-[3px_14px_20px_minmax(0,1fr)_24px_24px_24px_24px_24px_24px_32px_28px] items-center gap-1.5 border-b border-border/40 bg-background/95 px-2 py-1.5 text-[9px] uppercase tracking-[0.08em] text-muted-foreground backdrop-blur-sm">
          <span />
          <span>#</span>
          <span />
          <span>Team</span>
          <span className="text-right">PJ</span>
          <span className="text-right">V</span>
          <span className="text-right">E</span>
          <span className="text-right">D</span>
          <span className="text-right">GF</span>
          <span className="text-right">GC</span>
          <span className="text-right">DG</span>
          <span className="text-right">Pt</span>
        </div>
        {standings.rows.map((row) => {
          const isFav = isFavorite(row.team, favoriteTeamName);
          return (
            <div
              key={row.team.id}
              data-favorite={isFav || undefined}
              className={cn(
                "grid grid-cols-[3px_14px_20px_minmax(0,1fr)_24px_24px_24px_24px_24px_24px_32px_28px] items-center gap-1.5 border-b border-border/30 px-2 py-1.5 text-xs tabular-nums transition-colors",
                isFav
                  ? "bg-blue-500/15 font-semibold text-foreground"
                  : "hover:bg-foreground/5",
              )}
            >
              <ZoneStripe position={row.position} totalRows={totalRows} />
              <span className={cn("text-muted-foreground", isFav && "text-foreground")}>{row.position}</span>
              <Crest team={row.team} size={18} />
              <span className="truncate">{row.team.shortName}</span>
              <span className="text-right">{row.matches}</span>
              <span className="text-right">{row.wins}</span>
              <span className="text-right">{row.draws}</span>
              <span className="text-right">{row.losses}</span>
              <span className="text-right">{row.goalsFor}</span>
              <span className="text-right">{row.goalsAgainst}</span>
              <span className="text-right">
                {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
              </span>
              <span className="text-right font-bold">{row.points}</span>
            </div>
          );
        })}
      </div>
      {/* Custom scroll indicator — track + draggable thumb, no native chrome. */}
      <div
        ref={trackRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-1 top-1.5 bottom-1.5 w-1.5 transition-opacity",
          thumb.visible ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          onPointerDown={onThumbPointerDown}
          onPointerMove={onThumbPointerMove}
          onPointerUp={onThumbPointerUp}
          onPointerCancel={onThumbPointerUp}
          onMouseEnter={() => setThumbHover(true)}
          onMouseLeave={() => setThumbHover(false)}
          className={cn(
            "pointer-events-auto absolute left-0 right-0 cursor-grab rounded-full transition-colors active:cursor-grabbing",
            thumbHover || dragStateRef.current
              ? "bg-foreground/45"
              : "bg-foreground/22",
          )}
          style={{ top: thumb.top, height: thumb.height }}
        />
      </div>
    </div>
  );
}


export function HighlightVideo({
  videoId,
  channelUrl,
  channelLabel,
}: {
  videoId: string | null;
  channelUrl: string | null;
  channelLabel: string;
}) {
  if (videoId) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border/40 bg-background/40">
        <div className="border-b border-border/40 px-2 py-1.5 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
          Match highlights
        </div>
        <iframe
          title="Match highlights"
          src={`https://www.youtube.com/embed/${videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full flex-1 border-0"
        />
      </div>
    );
  }

  if (channelUrl) {
    return (
      <a
        href={channelUrl}
        target="_blank"
        rel="noreferrer"
        className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border/40 bg-gradient-to-br from-rose-600/30 via-rose-700/20 to-zinc-900 transition-colors hover:border-rose-400/60"
      >
        <div className="border-b border-border/40 px-2 py-1.5 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
          Latest highlights
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-3 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-rose-600/90 shadow-lg shadow-rose-900/40 transition-transform group-hover:scale-110">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-6 text-white" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <p className="text-sm font-semibold text-foreground">{channelLabel}</p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Watch on YouTube
          </p>
        </div>
      </a>
    );
  }

  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/40 bg-background/30 p-3 text-center text-xs text-muted-foreground">
      Highlights unavailable.
    </div>
  );
}
