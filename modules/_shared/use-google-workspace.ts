import { useEffect, useState } from "react";

import {
  googleService,
  type GoogleWorkspaceSummary,
} from "@/services/google";

export const EMPTY_GOOGLE_WORKSPACE_SUMMARY: GoogleWorkspaceSummary = {
  calendar: {
    busyNow: false,
    items: [],
  },
  tasks: {
    items: [],
    dueTodayCount: 0,
  },
  inbox: {
    unreadCount: 0,
    items: [],
  },
  focus: {
    active: false,
  },
};

export function useGoogleWorkspaceSummary(pollMs: number) {
  const [summary, setSummary] = useState<GoogleWorkspaceSummary>(
    EMPTY_GOOGLE_WORKSPACE_SUMMARY,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary(cancelled = false) {
    try {
      const nextSummary = await googleService.getSummary();
      if (cancelled) return;
      setSummary(nextSummary);
      setError(null);
    } catch (nextError) {
      if (cancelled) return;
      setError((nextError as Error)?.message ?? "Google summary unavailable.");
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    void loadSummary(cancelled);
    const intervalId = window.setInterval(() => {
      void loadSummary(cancelled);
    }, Math.max(5000, pollMs));

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pollMs]);

  return {
    summary,
    loading,
    error,
    setSummary,
    reload: async () => loadSummary(false),
  };
}

export function getGoogleWorkspaceMessage(summary: GoogleWorkspaceSummary) {
  return (
    summary.calendar.error ||
    summary.tasks.error ||
    summary.inbox.error ||
    summary.focus.error ||
    summary.provider?.lastError ||
    null
  );
}
