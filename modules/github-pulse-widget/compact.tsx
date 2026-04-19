import { useEffect, useState } from "react";
import {
  AlertTriangle,
  GitPullRequest,
  Loader2,
  MessageSquareMore,
} from "lucide-react";

import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import { WidgetShell, WidgetStatus } from "@/modules/ui/WidgetShell";
import { githubService, type GithubPulse } from "@/services/github";

const EMPTY_PULSE: GithubPulse = {
  profile: {},
  assignedPullRequests: [],
  notifications: [],
  mentionsCount: 0,
  failingChecksCount: 0,
};

function formatReason(reason: string) {
  switch (reason) {
    case "review_requested":
      return "Review requested";
    case "mention":
      return "Mention";
    default:
      return reason.replaceAll("_", " ");
  }
}

export function GithubPulseCompactView({
  pulse,
  loading,
  error,
  maxItems = 4,
}: {
  title: string;
  pulse: GithubPulse;
  loading: boolean;
  error: string | null;
  maxItems?: number;
}) {
  const pullRequests = pulse.assignedPullRequests.slice(0, maxItems);
  const notifications = pulse.notifications.slice(0, maxItems);
  const hasActivity = pullRequests.length > 0 || notifications.length > 0;
  const hasFailing = pulse.failingChecksCount > 0;
  const hasMentions = pulse.mentionsCount > 0;
  const primaryNotification = notifications[0] ?? null;
  const primaryPr = pullRequests[0] ?? null;
  const accent = hasFailing
    ? ("rose" as const)
    : hasMentions
      ? ("amber" as const)
      : ("violet" as const);

  return (
    <WidgetShell accent={accent}>
      <div className="relative flex h-full flex-col justify-center gap-0.5 px-3 py-2">
        {loading && !hasActivity ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-[10px]">Syncing</span>
          </div>
        ) : !hasActivity ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <GitPullRequest className="size-4 shrink-0" />
            <span className="truncate text-[11px]">
              {error || "No GitHub activity"}
            </span>
          </div>
        ) : (
          <>
            {/* Top: icon + label + status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {hasFailing ? (
                  <AlertTriangle className="size-3 text-red-500" />
                ) : hasMentions ? (
                  <MessageSquareMore className="size-3 text-amber-600 dark:text-amber-400" />
                ) : (
                  <GitPullRequest className="size-3 text-violet-500 dark:text-violet-400" />
                )}
                <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  GitHub
                </span>
              </div>
              <WidgetStatus
                tone={
                  hasFailing ? "danger" : hasMentions ? "warning" : "neutral"
                }
              >
                {pullRequests.length} PR{pullRequests.length === 1 ? "" : "s"}
              </WidgetStatus>
            </div>

            {/* Primary item */}
            <p className="truncate text-[0.82rem] font-semibold leading-tight">
              {primaryPr?.title ?? primaryNotification?.title ?? "No items"}
            </p>

            {/* Facts row */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {(primaryPr?.repository ?? primaryNotification?.repository) ? (
                <span className="truncate">
                  {primaryPr?.repository ?? primaryNotification?.repository}
                </span>
              ) : null}
              {primaryNotification && !primaryPr ? (
                <>
                  <span>·</span>
                  <span className="shrink-0">
                    {formatReason(primaryNotification.reason)}
                  </span>
                </>
              ) : null}
              {hasFailing ? (
                <>
                  <span>·</span>
                  <span className="shrink-0 font-medium text-red-600 dark:text-red-400">
                    {pulse.failingChecksCount} failing
                  </span>
                </>
              ) : notifications.length > 0 ? (
                <>
                  <span>·</span>
                  <span className="shrink-0">
                    {notifications.length} unread
                  </span>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </WidgetShell>
  );
}

export default function GithubPulseCompactWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "GitHub Pulse");
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 60000));
  const maxItems = Math.max(1, Math.min(8, Number(config["maxItems"] ?? 4)));
  const { setShared } = useSharedContext();
  const [pulse, setPulse] = useState<GithubPulse>(EMPTY_PULSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const nextPulse = await githubService.getPulse();
        if (cancelled) return;
        setPulse(nextPulse);
        setError(null);
        setShared(SHARED_NAMESPACES.providerGithubPulse, nextPulse);
      } catch (nextError) {
        if (cancelled) return;
        setError((nextError as Error)?.message ?? "GitHub pulse unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const intervalId = window.setInterval(() => void load(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pollMs, setShared]);

  return (
    <GithubPulseCompactView
      title={title}
      pulse={pulse}
      loading={loading}
      error={error}
      maxItems={maxItems}
    />
  );
}
