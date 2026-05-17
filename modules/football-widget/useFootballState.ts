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
  // Live scores need to feel near real-time. With a 10s frontend poll and the
  // backend's FotMob cache also at ~5s, a goal shows up within ~10–15s of
  // happening (vs. up to ~30–60s at 30s polling).
  live: 10_000,
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
  const isLeaguesMode = leagueId === "leagues";
  const trimmedName = teamName.trim();
  // In "leagues" mode a team name is required; without one we render an
  // empty state and skip every fetch.
  const needsTeam = isLeaguesMode && trimmedName.length === 0;

  const [snapshot, setSnapshot] = useState<FootballSnapshot | null>(null);
  const [featured, setFeatured] = useState<FootballFeatured | null>(null);
  const [standings, setStandings] = useState<FootballStandings | null>(null);
  const [leagues, setLeagues] = useState<FootballLeague[] | null>(null);
  const [resolvedLeagueId, setResolvedLeagueId] = useState<string | null>(
    isLeaguesMode ? null : leagueId,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!needsTeam);

  const snapshotRef = useRef<FootballSnapshot | null>(null);
  const featuredRef = useRef<FootballFeatured | null>(null);
  const standingsRef = useRef<FootballStandings | null>(null);
  const leaguesRef = useRef<FootballLeague[] | null>(null);
  const resolvedLeagueIdRef = useRef<string | null>(isLeaguesMode ? null : leagueId);
  const inFlightRef = useRef(false);
  const { registerAction, unregisterAction } = useSharedContext();

  // The effective league id to query: the configured one outside "leagues"
  // mode, or the auto-resolved one once a team name has been looked up.
  const effectiveLeagueId = isLeaguesMode ? resolvedLeagueId : leagueId;

  const loadAll = useCallback(async () => {
    if (needsTeam) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setError(null);

      let activeLeagueId = isLeaguesMode ? resolvedLeagueIdRef.current : leagueId;
      if (isLeaguesMode && !activeLeagueId) {
        const resolved = await footballApi.resolveTeam(trimmedName);
        activeLeagueId = resolved.leagueId;
        resolvedLeagueIdRef.current = resolved.leagueId;
        setResolvedLeagueId(resolved.leagueId);
      }
      if (!activeLeagueId) return;

      const tasks: Promise<void>[] = [];
      if (trimmedName) {
        tasks.push(
          (async () => {
            const next = await footballApi.getSnapshotByName(activeLeagueId, trimmedName);
            snapshotRef.current = next;
            setSnapshot(next);
          })(),
        );
      } else {
        tasks.push(
          (async () => {
            const next = await footballApi.getFeatured(activeLeagueId);
            featuredRef.current = next;
            setFeatured(next);
          })(),
        );
      }
      if (includeStandings) {
        tasks.push(
          (async () => {
            const next = await footballApi.getStandings(activeLeagueId);
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
  }, [
    needsTeam,
    isLeaguesMode,
    leagueId,
    trimmedName,
    includeStandings,
  ]);

  // Reset all derived state whenever the inputs change. In "leagues" mode the
  // resolved league is cleared so the next load re-resolves from the new name.
  useEffect(() => {
    snapshotRef.current = null;
    featuredRef.current = null;
    standingsRef.current = null;
    setSnapshot(null);
    setFeatured(null);
    setStandings(null);
    resolvedLeagueIdRef.current = isLeaguesMode ? null : leagueId;
    setResolvedLeagueId(isLeaguesMode ? null : leagueId);
    setError(null);
    setLoading(!needsTeam);
  }, [leagueId, teamName, includeStandings, isLeaguesMode, needsTeam]);

  useEffect(() => {
    if (needsTeam) return;
    void loadAll();
  }, [loadAll, needsTeam]);

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
    if (needsTeam) return;
    const intervalMs = pollIntervalForSnapshot(snapshot);
    const id = window.setInterval(() => void loadAll(), intervalMs);
    return () => clearInterval(id);
  }, [loadAll, snapshot, needsTeam]);

  // When the tab regains visibility or the window regains focus, refetch
  // immediately. Browsers throttle setInterval aggressively in background
  // tabs (Chrome / Opera can stretch a 30s timer to several minutes), so
  // without this the user can come back to the dashboard after a while
  // and see stale data until the next interval fires.
  useEffect(() => {
    if (needsTeam) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadAll();
      }
    };
    const onFocus = () => {
      void loadAll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadAll, needsTeam]);

  useEffect(() => {
    if (needsTeam || !includeStandings || !effectiveLeagueId) return;
    const id = window.setInterval(() => {
      void footballApi
        .getStandings(effectiveLeagueId)
        .then((next) => {
          standingsRef.current = next;
          setStandings(next);
        })
        .catch(() => {
          /* keep last known on error */
        });
    }, STANDINGS_POLL_MS);
    return () => clearInterval(id);
  }, [effectiveLeagueId, includeStandings, needsTeam]);

  useEffect(() => {
    const ids = [
      "football-widget:result",
      "football-widget:upcoming",
      "football-widget:standings",
      "football-widget:refresh",
    ];

    const ensureLeagueId = async (): Promise<string | null> => {
      if (effectiveLeagueId) return effectiveLeagueId;
      if (isLeaguesMode && trimmedName) {
        return footballApi
          .resolveTeam(trimmedName)
          .then((r) => {
            resolvedLeagueIdRef.current = r.leagueId;
            setResolvedLeagueId(r.leagueId);
            return r.leagueId;
          })
          .catch(() => null);
      }
      return null;
    };

    registerAction({
      id: ids[0],
      widgetId: "football-widget",
      title: "Last football result",
      description: "Read the favorite team's last result.",
      intentTags: ["football last result", "soccer last result"],
      run: async () => {
        const lid = await ensureLeagueId();
        const s =
          snapshotRef.current ??
          (lid && trimmedName
            ? await footballApi.getSnapshotByName(lid, trimmedName).catch(() => null)
            : null);
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
        const lid = await ensureLeagueId();
        const s =
          snapshotRef.current ??
          (lid && trimmedName
            ? await footballApi.getSnapshotByName(lid, trimmedName).catch(() => null)
            : null);
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
        const lid = await ensureLeagueId();
        if (!lid) return { success: false, message: "Standings unavailable." };
        const t = standingsRef.current ?? (await footballApi.getStandings(lid).catch(() => null));
        if (!t || t.rows.length === 0) return { success: false, message: "Standings unavailable." };
        const top = t.rows.slice(0, 3).map((r) => `${r.position}. ${r.team.shortName} (${r.points})`).join("; ");
        return { success: true, message: `Top of ${lid}: ${top}.` };
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
  }, [
    registerAction,
    unregisterAction,
    effectiveLeagueId,
    isLeaguesMode,
    trimmedName,
    loadAll,
  ]);

  return {
    snapshot,
    featured,
    standings,
    leagues,
    resolvedLeagueId: effectiveLeagueId,
    needsTeam,
    error,
    loading,
    refresh: loadAll,
  };
}
