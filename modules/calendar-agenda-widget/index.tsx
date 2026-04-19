import { useEffect, useMemo } from "react";
import { CalendarDays, Clock3, ExternalLink, MapPin, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import type { GoogleCalendarItem } from "@/services/google";
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

function getPrimaryCalendarItem(
  items: GoogleCalendarItem[],
  activeEventId?: string | null,
) {
  return items.find((item) => item.id && item.id === activeEventId) ?? items[0] ?? null;
}

function getDurationMinutes(startAt?: string | null, endAt?: string | null) {
  if (!startAt || !endAt) return null;

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return minutes > 0 ? minutes : null;
}

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
  const primaryItem = getPrimaryCalendarItem(items, summary.calendar.activeEventId);
  const secondaryItems = useMemo(() => {
    if (!primaryItem?.id) {
      return items.slice(1, 4);
    }

    return items
      .filter((item) => item.id !== primaryItem.id)
      .slice(0, 3);
  }, [items, primaryItem?.id]);
  const durationMinutes = getDurationMinutes(
    primaryItem?.startAt,
    primaryItem?.endAt,
  );

  return (
    <WidgetShell
      title={title}
      subtitle="Upcoming meetings and availability."
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
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 rounded-full border border-border/70 bg-background/80 p-2">
                  <CalendarDays className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Current state
                  </p>
                  <p className="mt-1 text-xl font-semibold leading-none text-foreground">
                    {summary.calendar.busyNow ? "Busy" : "Free"}
                  </p>
                  <p className="mt-2 truncate text-sm font-medium text-foreground">
                    {primaryItem?.title ?? "No highlighted event"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTimestamp(primaryItem?.startAt ?? summary.calendar.nextStartAt)}
                  </p>
                </div>
              </div>

              {primaryItem?.meetingUrl || primaryItem?.htmlUrl ? (
                <a
                  href={primaryItem?.meetingUrl || primaryItem?.htmlUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-primary"
                >
                  Open
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 pt-3">
              <Badge variant="secondary">{items.length} items</Badge>
              {primaryItem?.location ? (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="size-3" />
                  {primaryItem.location}
                </Badge>
              ) : null}
              {durationMinutes ? (
                <Badge variant="outline" className="gap-1">
                  <Clock3 className="size-3" />
                  {durationMinutes}m
                </Badge>
              ) : null}
              {summary.focus.active ? (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="size-3" />
                  Focus on
                </Badge>
              ) : null}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 pr-3">
              {(secondaryItems.length > 0 ? secondaryItems : items.slice(0, 1)).map((item) => (
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
        </div>
      )}
    </WidgetShell>
  );
}
