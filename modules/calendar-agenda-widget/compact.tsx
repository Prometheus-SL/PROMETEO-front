import { useEffect, useMemo } from "react";
import { CalendarDays, CalendarX2, Clock3, Loader2 } from "lucide-react";

import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import { WidgetShell, WidgetStatus } from "@/modules/ui/WidgetShell";
import type {
  GoogleCalendarItem,
  GoogleWorkspaceSummary,
} from "@/services/google";
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

function formatCountdown(dateStr?: string | null, isEnd = false) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - Date.now();
  if (!isEnd && diffMs < 0) return null;
  if (isEnd && diffMs < 0) return "Ending now";
  const totalMin = Math.round(Math.abs(diffMs) / 60000);
  if (totalMin < 1) return isEnd ? "Ending now" : "Now";
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

export function CalendarAgendaCompactView({
  summary,
  loading,
  error,
  maxItems = 5,
}: {
  title?: string;
  summary: GoogleWorkspaceSummary;
  loading: boolean;
  error: string | null;
  maxItems?: number;
}) {
  const items = useMemo(
    () => summary.calendar.items.slice(0, maxItems),
    [maxItems, summary.calendar.items],
  );
  const message = error ?? getGoogleWorkspaceMessage(summary);
  const primaryItem = getPrimaryCalendarItem(
    items,
    summary.calendar.activeEventId,
  );
  const accent = summary.calendar.busyNow
    ? ("amber" as const)
    : ("sky" as const);
  const countdown = summary.calendar.busyNow
    ? formatCountdown(primaryItem?.endAt, true)
    : formatCountdown(primaryItem?.startAt);

  return (
    <WidgetShell accent={accent}>
      <div className="relative flex h-full flex-col justify-center gap-0.5 px-3 py-2">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-[10px]">Syncing</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarX2 className="size-4 shrink-0" />
            <span className="truncate text-[11px]">
              {message || "Calendar is clear"}
            </span>
          </div>
        ) : (
          <>
            {/* Top: label + badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="size-3 text-muted-foreground" />
                <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {summary.calendar.busyNow ? "Now" : "Next"}
                </span>
              </div>
              <WidgetStatus
                tone={summary.calendar.busyNow ? "warning" : "success"}
              >
                {summary.calendar.busyNow ? "Busy" : "Free"}
              </WidgetStatus>
            </div>

            {/* Event title */}
            <p className="truncate text-[0.82rem] font-semibold leading-tight">
              {primaryItem?.title ?? "No upcoming meetings"}
            </p>

            {/* Time row: date + countdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">
                {primaryItem?.isAllDay
                  ? "All day"
                  : formatTimestamp(
                      primaryItem?.startAt ?? summary.calendar.nextStartAt,
                    )}
              </span>
              {countdown ? (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                  <Clock3 className="size-2.5" />
                  {countdown}
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </WidgetShell>
  );
}

export default function CalendarAgendaCompactWidget({
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

  return (
    <CalendarAgendaCompactView
      title={title}
      summary={summary}
      loading={loading}
      error={error}
      maxItems={maxItems}
    />
  );
}
