import { useCallback, useEffect, useRef, useState } from "react";

import { useSharedContext } from "@/hooks/useSharedContext";

import {
  footballApi,
  type FootballFeatured,
  type FootballLeague,
  type FootballSnapshot,
  type FootballStandings,
} from "./football-service";

const POLL_MS = {
  live: 30_000,
  upcomingClose: 60_000,
  upcoming: 5 * 60_000,
  finished: 5 * 60_000,
};

const STANDINGS_POLL_MS = 5 * 60_000;

function pollIntervalForSnapshot(snapshot: FootballSnapshot | null): number {
  if (!snapshot) return POLL_MS.finished;
  if (snapshot.state === "live") return POLL_MS.live;
  if (snapshot.state === "upcoming") {
    const start = (snapshot.nextMatch?.startTimestamp ?? 0) * 1000;
    const minutesToKickoff = (start - Date.now()) / 60_000;
    if (minutesToKickoff <= 30 && minutesToKickoff > 0) return POLL_MS.upcomingClose;
    return POLL_MS.upcoming;
  }
  return POLL_MS.finished;
}

export function useFootballState({
  leagueId,
  teamName,
  includeStandings,
}: {
  leagueId: string;
  teamName: string;
  includeStandings: boolean;
}) {
  const [snapshot, setSnapshot] = useState<FootballSnapshot | null>(null);
  const [featured, setFeatured] = useState<FootballFeatured | null>(null);
  const [standings, setStandings] = useState<FootballStandings | null>(null);
  const [leagues, setLeagues] = useState<FootballLeague[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const snapshotRef = useRef<FootballSnapshot | null>(null);
  const featuredRef = useRef<FootballFeatured | null>(null);
  const standingsRef = useRef<FootballStandings | null>(null);
  const leaguesRef = useRef<FootballLeague[] | null>(null);
  const inFlightRef = useRef(false);
  const { registerAction, unregisterAction } = useSharedContext();

  const loadAll = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setError(null);
      const tasks: Promise<void>[] = [];
      const trimmedName = teamName.trim();
      if (trimmedName) {
        tasks.push(
          (async () => {
            const next = await footballApi.getSnapshotByName(leagueId, trimmedName);
            snapshotRef.current = next;
            setSnapshot(next);
          })(),
        );
      } else {
        tasks.push(
          (async () => {
            const next = await footballApi.getFeatured(leagueId);
            featuredRef.current = next;
            setFeatured(next);
          })(),
        );
      }
      if (includeStandings) {
        tasks.push(
          (async () => {
            const next = await footballApi.getStandings(leagueId);
            standingsRef.current = next;
            setStandings(next);
          })(),
        );
      }
      await Promise.all(tasks);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [leagueId, teamName, includeStandings]);

  useEffect(() => {
    snapshotRef.current = null;
    featuredRef.current = null;
    standingsRef.current = null;
    setSnapshot(null);
    setFeatured(null);
    setStandings(null);
    setLoading(true);
    setError(null);
  }, [leagueId, teamName, includeStandings]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    let cancelled = false;
    void footballApi
      .listLeagues()
      .then((data) => {
        if (cancelled) return;
        leaguesRef.current = data;
        setLeagues(data);
      })
      .catch(() => {
        // ignore — leagues metadata is optional
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const intervalMs = pollIntervalForSnapshot(snapshot);
    const id = window.setInterval(() => void loadAll(), intervalMs);
    return () => clearInterval(id);
  }, [loadAll, snapshot]);

  useEffect(() => {
    if (!includeStandings) return;
    const id = window.setInterval(() => {
      void footballApi
        .getStandings(leagueId)
        .then((next) => {
          standingsRef.current = next;
          setStandings(next);
        })
        .catch(() => {
          /* keep last known on error */
        });
    }, STANDINGS_POLL_MS);
    return () => clearInterval(id);
  }, [leagueId, includeStandings]);

  useEffect(() => {
    const ids = [
      "football-widget:result",
      "football-widget:upcoming",
      "football-widget:standings",
      "football-widget:refresh",
    ];

    registerAction({
      id: ids[0],
      widgetId: "football-widget",
      title: "Last football result",
      description: "Read the favorite team's last result.",
      intentTags: ["football last result", "soccer last result"],
      run: async () => {
        const trimmed = teamName.trim();
        const s = snapshotRef.current ?? (trimmed ? await footballApi.getSnapshotByName(leagueId, trimmed).catch(() => null) : null);
        if (!s || !s.lastMatch) return { success: false, message: "No recent match found." };
        const m = s.lastMatch;
        return {
          success: true,
          message: `${m.home.team.shortName} ${m.home.score ?? 0} - ${m.away.score ?? 0} ${m.away.team.shortName}.`,
        };
      },
    });

    registerAction({
      id: ids[1],
      widgetId: "football-widget",
      title: "Next football match",
      description: "Read the favorite team's next match.",
      intentTags: ["next football match", "next soccer match"],
      run: async () => {
        const trimmed = teamName.trim();
        const s = snapshotRef.current ?? (trimmed ? await footballApi.getSnapshotByName(leagueId, trimmed).catch(() => null) : null);
        if (!s || !s.nextMatch) return { success: false, message: "No upcoming match scheduled." };
        const n = s.nextMatch;
        const date = new Date(n.startTimestamp * 1000).toISOString();
        return {
          success: true,
          message: `Next: ${n.home.team.shortName} vs ${n.away.team.shortName} at ${date}.`,
        };
      },
    });

    registerAction({
      id: ids[2],
      widgetId: "football-widget",
      title: "League standings",
      description: "Read the top of the league standings.",
      intentTags: ["league standings", "football table"],
      run: async () => {
        const t = standingsRef.current ?? (await footballApi.getStandings(leagueId).catch(() => null));
        if (!t || t.rows.length === 0) return { success: false, message: "Standings unavailable." };
        const top = t.rows.slice(0, 3).map((r) => `${r.position}. ${r.team.shortName} (${r.points})`).join("; ");
        return { success: true, message: `Top of ${leagueId}: ${top}.` };
      },
    });

    registerAction({
      id: ids[3],
      widgetId: "football-widget",
      title: "Refresh football",
      description: "Reload all football data.",
      intentTags: ["refresh football", "reload football"],
      run: async () => {
        await loadAll();
        return { success: true, message: "Football data refreshed." };
      },
    });

    return () => {
      for (const id of ids) unregisterAction(id);
    };
  }, [registerAction, unregisterAction, leagueId, teamName, loadAll]);

  return {
    snapshot,
    featured,
    standings,
    leagues,
    error,
    loading,
    refresh: loadAll,
  };
}
