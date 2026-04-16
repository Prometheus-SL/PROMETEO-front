import { useEffect, useMemo } from "react";
import { CalendarDays, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
  formatTimestamp,
} from "../_shared/prometeo-widget-kit";
import {
  getGoogleWorkspaceMessage,
  useGoogleWorkspaceSummary,
} from "../_shared/use-google-workspace";

export default function CalendarAgendaWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Calendar Agenda");
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 60000));
  const maxItems = Math.max(1, Math.min(10, Number(config["maxItems"] ?? 5)));
  const { setShared } = useSharedContext();
  const { summary, loading, error } = useGoogleWorkspaceSummary(pollMs);

  useEffect(() => {
    setShared(SHARED_NAMESPACES.providerGoogleSummary, summary);
    setShared(SHARED_NAMESPACES.automationFocus, summary.focus);
  }, [setShared, summary]);

  const items = useMemo(
    () => summary.calendar.items.slice(0, maxItems),
    [maxItems, summary.calendar.items],
  );
  const message = error ?? getGoogleWorkspaceMessage(summary);

  return (
    <WidgetShell
      title={title}
      subtitle="Upcoming meetings and current availability from Google Calendar."
      badges={[
        <MetricBadge
          key="state"
          label="state"
          value={summary.calendar.busyNow ? "Busy" : "Free"}
          tone={summary.calendar.busyNow ? "warning" : "success"}
        />,
        <MetricBadge key="items" label="items" value={items.length} />,
      ]}
    >
      {loading && items.length === 0 ? (
        <WidgetEmptyState
          title="Loading agenda"
          message="PROMETEO is syncing your next meetings."
        />
      ) : items.length === 0 ? (
        <WidgetEmptyState
          title="No upcoming events"
          message={
            message ||
            "Your calendar is clear for the current time window."
          }
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 pr-3">
            {items.map((item) => (
              <div
                key={item.id ?? item.title}
                className="rounded-2xl border border-border/70 bg-background/60 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full border border-border/70 bg-background/80 p-2">
                    <CalendarDays className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      {item.meetingUrl || item.htmlUrl ? (
                        <a
                          href={item.meetingUrl || item.htmlUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary"
                        >
                          Open
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(item.startAt)}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.location ? (
                        <Badge variant="secondary">{item.location}</Badge>
                      ) : null}
                      {item.isAllDay ? (
                        <Badge variant="outline">All day</Badge>
                      ) : null}
                      {summary.calendar.activeEventId === item.id ? (
                        <Badge className="bg-amber-500/90 text-white hover:bg-amber-500/90">
                          In progress
                        </Badge>
                      ) : null}
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
