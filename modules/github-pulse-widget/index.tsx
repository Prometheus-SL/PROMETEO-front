import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Code2, MessageSquareMore } from "lucide-react";

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

  return (
    <WidgetShell
      title={title}
      subtitle="Your assigned pull requests, mentions and failing checks."
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
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 pr-3">
            {pullRequests.map((item) => (
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

            {notifications.map((item) => (
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
                      <Badge variant="secondary">{item.reason}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </WidgetShell>
  );
}
