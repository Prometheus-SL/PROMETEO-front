import { useEffect, useRef } from "react";

import {
  WidgetContent,
  WidgetShell,
  WidgetState,
} from "@/modules/ui/WidgetShell";

import {
  HighlightVideo,
  MatchHeader,
  StandingsTable,
} from "./widget-ui";
import { useFootballState } from "./useFootballState";

export default function FootballWidget5x3({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const leagueId = String(config["leagueId"] ?? "laliga");
  const teamName = String(config["teamName"] ?? "").trim();

  const { snapshot, featured, standings, leagues, error, loading } = useFootballState({
    leagueId,
    teamName,
    includeStandings: true,
  });

  const currentLeague = leagues?.find((l) => l.id === leagueId) ?? null;
  const channelUrl = currentLeague?.highlightsChannelUrl ?? null;
  const channelLabel = currentLeague?.highlightsChannelLabel ?? "Watch on YouTube";

  const tableRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!tableRef.current || !teamName) return;
    const el = tableRef.current.querySelector<HTMLElement>(`[data-favorite="true"]`);
    if (el && "scrollIntoView" in el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [standings, teamName]);

  if (loading && !standings) {
    return (
      <WidgetShell accent="sky">
        <WidgetContent className="flex items-center">
          <WidgetState accent="sky" tone="info" title="Football" message="Loading data..." />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (error && !standings) {
    return (
      <WidgetShell accent="rose">
        <WidgetContent className="flex items-center">
          <WidgetState accent="rose" tone="danger" title="Football" message={error} />
        </WidgetContent>
      </WidgetShell>
    );
  }

  // Pick the same match the 1x1 picks: respects snapshot.state.
  const headerMatch =
    snapshot?.state === "live" ? snapshot.liveMatch
      : snapshot?.state === "upcoming" ? snapshot.nextMatch
        : snapshot?.lastMatch ?? featured?.match ?? null;
  const videoId = snapshot?.highlights?.videoId ?? featured?.highlights?.videoId ?? null;

  return (
    <WidgetShell accent="sky">
      <WidgetContent className="grid h-full grid-rows-[auto_1fr] gap-2 p-2">
        {headerMatch ? (
          <MatchHeader match={headerMatch} favoriteTeamName={teamName} />
        ) : (
          <div className="rounded-lg border border-dashed border-border/40 bg-background/40 p-2 text-center text-xs text-muted-foreground">
            No featured match yet.
          </div>
        )}
        <div className="grid min-h-0 grid-cols-[1.6fr_1fr] gap-2">
          <div ref={tableRef} className="min-h-0">
            {standings ? (
              <StandingsTable standings={standings} favoriteTeamName={teamName} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/40 bg-background/40 text-xs text-muted-foreground">
                Standings unavailable.
              </div>
            )}
          </div>
          <div className="min-h-0">
            <HighlightVideo
              videoId={videoId}
              channelUrl={channelUrl}
              channelLabel={channelLabel}
            />
          </div>
        </div>
      </WidgetContent>
    </WidgetShell>
  );
}
