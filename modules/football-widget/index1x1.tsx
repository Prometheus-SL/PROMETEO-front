import { useEffect, useState } from "react";

import {
  WidgetContent,
  WidgetShell,
  WidgetState,
} from "@/modules/ui/WidgetShell";

import { Crest, LiveClock, ScoreLine } from "./widget-ui";
import type { FootballMatch } from "./football-service";
import { useFootballState } from "./useFootballState";

function formatCountdown(startTimestamp: number, nowMs: number): string {
  const diff = startTimestamp * 1000 - nowMs;
  if (diff <= 0) return "Now";
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff - hours * 60 * 60 * 1000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function pickMatchForCompact(snapshot: NonNullable<ReturnType<typeof useFootballState>["snapshot"]>): {
  match: FootballMatch | null;
  state: "live" | "upcoming" | "finished";
} {
  if (snapshot.state === "live" && snapshot.liveMatch) {
    return { match: snapshot.liveMatch, state: "live" };
  }
  if (snapshot.state === "upcoming" && snapshot.nextMatch) {
    return { match: snapshot.nextMatch, state: "upcoming" };
  }
  return { match: snapshot.lastMatch, state: "finished" };
}

export default function FootballWidget1x1({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const leagueId = String(config["leagueId"] ?? "laliga");
  const teamName = String(config["teamName"] ?? "").trim();

  const { snapshot, error, loading } = useFootballState({
    leagueId,
    teamName,
    includeStandings: false,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!teamName) {
    return (
      <WidgetShell accent="amber">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="amber"
            title="Football"
            message="Pick a favorite team for this competition."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (loading && !snapshot) {
    return (
      <WidgetShell accent="sky">
        <WidgetContent className="flex items-center">
          <WidgetState accent="sky" tone="info" title="Football" message="Loading match..." />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (error && !snapshot) {
    return (
      <WidgetShell accent="rose">
        <WidgetContent className="flex items-center">
          <WidgetState accent="rose" tone="danger" title="Football" message={error} />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (!snapshot) {
    return (
      <WidgetShell accent="slate">
        <WidgetContent className="flex items-center">
          <WidgetState accent="slate" title="Football" message="No data yet." />
        </WidgetContent>
      </WidgetShell>
    );
  }

  const { match, state } = pickMatchForCompact(snapshot);
  if (!match) {
    const resolvedName = snapshot.team.name || snapshot.team.shortName || teamName;
    return (
      <WidgetShell accent="slate">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="slate"
            title={resolvedName || "Football"}
            message="No matches in the next 30 days."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  const accent = state === "live" ? "rose" : state === "upcoming" ? "amber" : "sky";

  return (
    <WidgetShell accent={accent}>
      <WidgetContent className="flex h-full flex-col items-center justify-center gap-1 p-2">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <Crest team={match.home.team} size={28} />
            <span className="truncate text-[10px] font-semibold">
              {match.home.team.code || match.home.team.shortName}
            </span>
          </div>
          <div className="flex flex-col items-center">
            {state === "upcoming" ? (
              <span className="text-lg font-semibold text-muted-foreground">vs</span>
            ) : (
              <ScoreLine
                match={match}
                compact
                centerSlot={
                  state === "live" ? (
                    <LiveClock statusDescription={match.statusDescription} size="sm" />
                  ) : undefined
                }
              />
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <Crest team={match.away.team} size={28} />
            <span className="truncate text-[10px] font-semibold">
              {match.away.team.code || match.away.team.shortName}
            </span>
          </div>
        </div>
        {state === "upcoming" && (
          <div className="flex items-center justify-center text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
            {formatCountdown(match.startTimestamp, now)}
          </div>
        )}
      </WidgetContent>
    </WidgetShell>
  );
}
