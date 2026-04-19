import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Code2,
  GitPullRequest,
  Loader2,
  MessageSquareMore,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import {
  WidgetContent,
  WidgetHeader,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import { githubService, type GithubPulse } from "@/services/github";
import { formatTimestamp } from "../_shared/prometeo-widget-kit";

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
  const hasActivity = pullRequests.length > 0 || notifications.length > 0;
  const hasFailing = pulse.failingChecksCount > 0;
  const hasMentions = pulse.mentionsCount > 0;
  const accent = hasFailing
    ? ("rose" as const)
    : hasMentions
      ? ("amber" as const)
      : ("violet" as const);

  return (
    <WidgetShell accent={accent}>
      <WidgetHeader
        accent={accent}
        icon={<GitPullRequest className="size-4" />}
        title={title}
        description="Pull requests, mentions and checks"
        status={
          hasFailing ? (
            <WidgetStatus tone="danger">
              {pulse.failingChecksCount} failing
            </WidgetStatus>
          ) : hasMentions ? (
            <WidgetStatus tone="warning">
              {pulse.mentionsCount} mention
              {pulse.mentionsCount === 1 ? "" : "s"}
            </WidgetStatus>
          ) : (
            <WidgetStatus tone="neutral">
              {pullRequests.length} PR{pullRequests.length === 1 ? "" : "s"}
            </WidgetStatus>
          )
        }
        meta={
          <>
            <Badge
              variant="secondary"
              className="h-4 gap-0.5 px-1.5 text-[9px]"
            >
              <Code2 className="size-2.5" />
              {pullRequests.length} PR{pullRequests.length === 1 ? "" : "s"}
            </Badge>
            {notifications.length > 0 ? (
              <Badge
                variant="outline"
                className="h-4 gap-0.5 px-1.5 text-[9px]"
              >
                <Bell className="size-2.5" />
                {notifications.length} unread
              </Badge>
            ) : null}
          </>
        }
      />
      <WidgetContent>
        {loading && !hasActivity ? (
          <WidgetState
            accent={accent}
            icon={<Loader2 className="size-5 animate-spin" />}
            title="Loading GitHub pulse"
            message="Checking your pull requests and notifications."
          />
        ) : !hasActivity ? (
          <WidgetState
            accent={accent}
            icon={<GitPullRequest className="size-5" />}
            title="No GitHub activity"
            message={message || "No pull requests or notifications were found."}
          />
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1.5">
              {pullRequests.map((pr) => (
                <WidgetSection
                  key={pr.id ?? pr.title}
                  accent={accent}
                  className="space-y-1 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Code2 className="size-3.5 shrink-0 text-violet-500 dark:text-violet-400" />
                      <p className="truncate text-[0.82rem] font-semibold leading-tight">
                        {pr.title}
                      </p>
                    </div>
                    {pr.hasFailingChecks ? (
                      <Badge className="h-4 shrink-0 bg-red-500/20 px-1.5 text-[9px] text-red-700 hover:bg-red-500/20 dark:text-red-200">
                        <AlertTriangle className="mr-0.5 size-2.5" />
                        Failing
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {pr.repository ? (
                      <span className="truncate font-medium">
                        {pr.repository}
                      </span>
                    ) : null}
                    {pr.repository && pr.updatedAt ? <span>·</span> : null}
                    {pr.updatedAt ? (
                      <span>{formatTimestamp(pr.updatedAt)}</span>
                    ) : null}
                  </div>
                </WidgetSection>
              ))}

              {notifications.map((notif) => (
                <WidgetSection
                  key={notif.id ?? `${notif.repository}-${notif.title}`}
                  accent={accent}
                  className="space-y-1 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {notif.reason === "mention" ||
                      notif.reason === "review_requested" ? (
                        <MessageSquareMore className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <Bell className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <p className="truncate text-[0.82rem] font-semibold leading-tight">
                        {notif.title}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="h-4 shrink-0 px-1.5 text-[9px]"
                    >
                      {formatReason(notif.reason)}
                    </Badge>
                  </div>
                  {notif.repository ? (
                    <p className="truncate text-[10px] text-muted-foreground">
                      {notif.repository}
                    </p>
                  ) : null}
                </WidgetSection>
              ))}
            </div>
          </ScrollArea>
        )}
      </WidgetContent>
    </WidgetShell>
  );
}
