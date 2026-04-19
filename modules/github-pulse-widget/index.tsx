import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Code2, MessageSquareMore } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import { githubService, type GithubPulse } from "@/services/github";
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
  formatTimestamp,
} from "../_shared/prometeo-widget-kit";

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

function getPrimarySignal(pulse: GithubPulse) {
  if (pulse.mentionsCount > 0) {
    return `${pulse.mentionsCount} mention${pulse.mentionsCount === 1 ? "" : "s"}`;
  }

  const prs = pulse.assignedPullRequests.length;
  if (prs > 0) {
    return `${prs} PR${prs === 1 ? "" : "s"}`;
  }

  return `${pulse.notifications.length} update${pulse.notifications.length === 1 ? "" : "s"}`;
}

export default function GithubPulseWidget({
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pollMs, setShared]);

  const pullRequests = useMemo(
    () => pulse.assignedPullRequests.slice(0, maxItems),
    [maxItems, pulse.assignedPullRequests],
  );
  const notifications = useMemo(
    () => pulse.notifications.slice(0, maxItems),
    [maxItems, pulse.notifications],
  );
  const message = error ?? pulse.error ?? pulse.provider?.lastError ?? null;
  const primaryNotification = notifications[0] ?? null;
  const primaryPullRequest = pullRequests[0] ?? null;
  const secondaryPullRequests = pullRequests.slice(primaryPullRequest ? 1 : 0, 4);
  const secondaryNotifications = notifications.slice(primaryNotification ? 1 : 0, 4);

  return (
    <WidgetShell
      title={title}
      subtitle="Assigned pull requests, mentions and checks."
      badges={[
        <MetricBadge key="prs" label="prs" value={pullRequests.length} />,
        <MetricBadge
          key="mentions"
          label="mentions"
          value={pulse.mentionsCount}
          tone={pulse.mentionsCount > 0 ? "warning" : "neutral"}
        />,
      ]}
    >
      {loading && pullRequests.length === 0 && notifications.length === 0 ? (
        <WidgetEmptyState
          title="Loading GitHub pulse"
          message="PROMETEO is checking your pull requests and notifications."
        />
      ) : pullRequests.length === 0 && notifications.length === 0 ? (
        <WidgetEmptyState
          title="No GitHub activity"
          message={message || "No pull requests or notifications were found."}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full border border-border/70 bg-background/80 p-2">
                {pulse.mentionsCount > 0 ? (
                  <MessageSquareMore className="size-4 text-amber-600" />
                ) : pulse.failingChecksCount > 0 ? (
                  <AlertTriangle className="size-4 text-red-500" />
                ) : (
                  <Code2 className="size-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Priority signal
                </p>
                <p className="mt-1 text-xl font-semibold leading-none text-foreground">
                  {getPrimarySignal(pulse)}
                </p>
                <p className="mt-2 truncate text-sm font-medium text-foreground">
                  {primaryNotification
                    ? formatReason(primaryNotification.reason)
                    : primaryPullRequest?.title ?? "Assigned work"}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {primaryNotification?.repository ?? primaryPullRequest?.repository ?? "No repository"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-3">
              <Badge variant="secondary" className="gap-1">
                <Code2 className="size-3" />
                {pullRequests.length} PR{pullRequests.length === 1 ? "" : "s"}
              </Badge>
              {pulse.failingChecksCount > 0 ? (
                <Badge variant="outline" className="gap-1">
                  <AlertTriangle className="size-3" />
                  {pulse.failingChecksCount} failing
                </Badge>
              ) : null}
              {notifications.length > 0 ? (
                <Badge variant="outline" className="gap-1">
                  <Bell className="size-3" />
                  {notifications.length} unread
                </Badge>
              ) : null}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 pr-3">
              {(secondaryPullRequests.length > 0 ? secondaryPullRequests : pullRequests.slice(0, 1)).map((item) => (
                <div
                  key={item.id ?? item.title}
                  className="rounded-2xl border border-border/70 bg-background/60 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full border border-border/70 bg-background/80 p-2">
                      <Code2 className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {item.title}
                        </p>
                        {item.hasFailingChecks ? (
                          <Badge className="bg-red-500/90 text-white hover:bg-red-500/90">
                            Failing checks
                          </Badge>
                        ) : null}
                      </div>
                      {item.repository ? (
                        <p className="text-xs text-muted-foreground">
                          {item.repository}
                        </p>
                      ) : null}
                      {item.updatedAt ? (
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(item.updatedAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {(secondaryNotifications.length > 0 ? secondaryNotifications : notifications.slice(0, 1)).map((item) => (
                <div
                  key={item.id ?? `${item.repository}-${item.title}`}
                  className="rounded-2xl border border-border/70 bg-background/60 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full border border-border/70 bg-background/80 p-2">
                      {item.reason === "mention" || item.reason === "review_requested" ? (
                        <MessageSquareMore className="size-4 text-amber-600" />
                      ) : (
                        <AlertTriangle className="size-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.repository ? (
                          <Badge variant="outline">{item.repository}</Badge>
                        ) : null}
                        <Badge variant="secondary">{formatReason(item.reason)}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </WidgetShell>
  );
}
