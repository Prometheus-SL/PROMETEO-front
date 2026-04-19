import { useEffect, useMemo } from "react";
import {
  CalendarDays,
  CalendarX2,
  Clock3,
  Loader2,
  MapPin,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import type { GoogleCalendarItem } from "@/services/google";
import { formatTimestamp } from "../_shared/prometeo-widget-kit";
import {
  getGoogleWorkspaceMessage,
  useGoogleWorkspaceSummary,
} from "../_shared/use-google-workspace";

function getPrimaryCalendarItem(
  items: GoogleCalendarItem[],
  activeEventId?: string | null,
) {
  return (
    items.find((item) => item.id && item.id === activeEventId) ??
    items[0] ??
    null
  );
}

function getDurationMinutes(startAt?: string | null, endAt?: string | null) {
  if (!startAt || !endAt) return null;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return minutes > 0 ? minutes : null;
}

function formatCountdown(dateStr?: string | null, isEnd = false) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - Date.now();
  if (!isEnd && diffMs < 0) return null;
  if (isEnd && diffMs < 0) return "Ending now";
  const totalMin = Math.round(Math.abs(diffMs) / 60000);
  if (totalMin < 1) return isEnd ? "Ending now" : "Starting now";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  if (isEnd) {
    if (d > 0) return rh > 0 ? `${d}d ${rh}h left` : `${d}d left`;
    if (h > 0) return m > 0 ? `${h}h ${m}m left` : `${h}h left`;
    return `${m}m left`;
  }
  if (d > 0) return rh > 0 ? `in ${d}d ${rh}h` : `in ${d}d`;
  if (h > 0) return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  return `in ${m}m`;
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
  const primaryItem = getPrimaryCalendarItem(
    items,
    summary.calendar.activeEventId,
  );
  const secondaryItems = useMemo(() => {
    if (!primaryItem?.id) return items.slice(1);
    return items.filter((item) => item.id !== primaryItem.id);
  }, [items, primaryItem]);
  const durationMinutes = getDurationMinutes(
    primaryItem?.startAt,
    primaryItem?.endAt,
  );
  const countdown = summary.calendar.busyNow
    ? formatCountdown(primaryItem?.endAt, true)
    : formatCountdown(primaryItem?.startAt);
  const accent = summary.calendar.busyNow
    ? ("amber" as const)
    : ("sky" as const);

  return (
    <WidgetShell accent={accent}>
      <WidgetHeader
        accent={accent}
        icon={<CalendarDays className="size-4" />}
        title={title}
        description="Upcoming meetings and availability"
        status={
          <WidgetStatus tone={summary.calendar.busyNow ? "warning" : "success"}>
            {summary.calendar.busyNow ? "Busy" : "Free"}
          </WidgetStatus>
        }
      />
      <WidgetContent>
        {loading && items.length === 0 ? (
          <WidgetState
            accent={accent}
            icon={<Loader2 className="size-5 animate-spin" />}
            title="Loading agenda"
            message="Syncing your next meetings."
          />
        ) : items.length === 0 ? (
          <WidgetState
            accent={accent}
            icon={<CalendarX2 className="size-5" />}
            title="No upcoming events"
            message={message || "Your calendar is clear."}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            {/* Next event */}
            <WidgetSection accent={accent} className="space-y-1 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-[8px] font-medium uppercase tracking-[0.16em]">
                  {summary.calendar.busyNow ? "In progress" : "Next event"}
                </p>
                <div className="flex items-center gap-1.5">
                  {summary.calendar.busyNow ? (
                    <Badge className="h-4 px-1.5 bg-amber-500/20 text-[9px] text-amber-700 dark:text-amber-200 hover:bg-amber-500/20">
                      Now
                    </Badge>
                  ) : null}
                  {durationMinutes ? (
                    <Badge
                      variant="outline"
                      className="h-4 gap-0.5 px-1.5 text-[9px]"
                    >
                      <Clock3 className="size-2.5" />
                      {durationMinutes}m
                    </Badge>
                  ) : null}
                </div>
              </div>
              <p className="truncate text-[0.85rem] font-semibold leading-tight">
                {primaryItem?.title ?? "No highlighted event"}
              </p>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="font-medium">
                  {formatTimestamp(
                    primaryItem?.startAt ?? summary.calendar.nextStartAt,
                  )}
                </span>
                {countdown ? (
                  <>
                    <Separator orientation="vertical" className="!h-3" />
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      {countdown}
                    </span>
                  </>
                ) : null}
                {primaryItem?.location ? (
                  <span className="flex items-center gap-0.5 truncate text-muted-foreground">
                    <MapPin className="size-2.5 shrink-0" />
                    {primaryItem.location}
                  </span>
                ) : null}
              </div>
            </WidgetSection>

            {/* Upcoming list */}
            {secondaryItems.length > 0 ? (
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-1">
                  {secondaryItems.map((item) => {
                    const itemCountdown = formatCountdown(item.startAt);
                    return (
                      <WidgetSection
                        key={item.id ?? item.title}
                        accent={accent}
                        className="flex items-center gap-2 py-1 px-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-medium leading-tight">
                            {item.title}
                          </p>
                        </div>
                        <span className="shrink-0 text-[9px] text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(item.startAt)}
                          {item.isAllDay ? " · All day" : ""}
                        </span>
                        {itemCountdown ? (
                          <span className="shrink-0 text-[9px] font-semibold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                            {itemCountdown}
                          </span>
                        ) : null}
                      </WidgetSection>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : null}
          </div>
        )}
      </WidgetContent>
    </WidgetShell>
  );
}
