import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Code2, MessageSquareMore } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import { githubService, type GithubPulse } from "@/services/github";
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
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

  const notifications = pulse.notifications.length;
  return `${notifications} update${notifications === 1 ? "" : "s"}`;
}

function getPrimaryItem(pulse: GithubPulse) {
  return pulse.notifications[0] ?? pulse.assignedPullRequests[0] ?? null;
}

function getCompactFacts(pulse: GithubPulse) {
  const facts: Array<{ key: string; label: string; tone?: "secondary" | "outline" }> = [];

  facts.push({
    key: "prs",
    label: `${pulse.assignedPullRequests.length} PR${pulse.assignedPullRequests.length === 1 ? "" : "s"}`,
    tone: "secondary",
  });

  if (pulse.failingChecksCount > 0) {
    facts.push({
      key: "failing",
      label: `${pulse.failingChecksCount} failing`,
      tone: "outline",
    });
  }

  if (pulse.notifications.length > 0) {
    facts.push({
      key: "notifications",
      label: `${pulse.notifications.length} unread`,
      tone: "outline",
    });
  }

  return facts.slice(0, 3);
}

export function GithubPulseCompactView({
  title,
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
  const pullRequests = useMemo(
    () => pulse.assignedPullRequests.slice(0, maxItems),
    [maxItems, pulse.assignedPullRequests],
  );
  const notifications = useMemo(
    () => pulse.notifications.slice(0, maxItems),
    [maxItems, pulse.notifications],
  );
  const message = error ?? pulse.error ?? pulse.provider?.lastError ?? null;
  const primaryItem = getPrimaryItem({
    ...pulse,
    assignedPullRequests: pullRequests,
    notifications,
  });
  const facts = getCompactFacts({
    ...pulse,
    assignedPullRequests: pullRequests,
    notifications,
  });

  return (
    <WidgetShell
      title={title}
      badges={[
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
          title="Loading GitHub"
          message="Checking pulse."
        />
      ) : pullRequests.length === 0 && notifications.length === 0 ? (
        <WidgetEmptyState
          title="No GitHub activity"
          message={message || "No PRs or notifications."}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
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
                <p className="text-xl font-semibold leading-none text-foreground">
                  {getPrimarySignal(pulse)}
                </p>
                <p className="mt-2 truncate text-sm font-medium text-foreground">
                  {"reason" in (primaryItem ?? {})
                    ? formatReason(primaryItem?.reason ?? "")
                    : primaryItem?.title ?? "Assigned work"}
                </p>
                {primaryItem?.repository ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {primaryItem.repository}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {facts.map((fact) => (
              <Badge
                key={fact.key}
                variant={fact.tone === "secondary" ? "secondary" : "outline"}
                className="gap-1"
              >
                {fact.key === "notifications" ? <Bell className="size-3" /> : null}
                {fact.key === "failing" ? <AlertTriangle className="size-3" /> : null}
                {fact.key === "prs" ? <Code2 className="size-3" /> : null}
                <span>{fact.label}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
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
