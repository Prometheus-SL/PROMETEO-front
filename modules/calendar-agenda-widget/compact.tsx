import { useEffect, useMemo } from "react";
import { CalendarDays, Clock3, MapPin, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import type { GoogleCalendarItem, GoogleWorkspaceSummary } from "@/services/google";
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
} from "../_shared/prometeo-widget-kit";
import {
  getGoogleWorkspaceMessage,
  useGoogleWorkspaceSummary,
} from "../_shared/use-google-workspace";

function getPrimaryCalendarItem(items: GoogleCalendarItem[], activeEventId?: string | null) {
  return items.find((item) => item.id && item.id === activeEventId) ?? items[0] ?? null;
}

function getDurationMinutes(item?: GoogleCalendarItem | null) {
  if (!item?.startAt || !item.endAt) return null;

  const start = new Date(item.startAt);
  const end = new Date(item.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return minutes > 0 ? minutes : null;
}

function getCompactFacts(
  summary: GoogleWorkspaceSummary,
  items: GoogleCalendarItem[],
  primaryItem?: GoogleCalendarItem | null,
) {
  const facts: Array<{ key: string; label: string; tone?: "secondary" | "outline" }> = [];

  facts.push({
    key: "items",
    label: `${items.length} item${items.length === 1 ? "" : "s"}`,
    tone: "secondary",
  });

  if (primaryItem?.location) {
    facts.push({
      key: "location",
      label: primaryItem.location,
      tone: "outline",
    });
  }

  const durationMinutes = getDurationMinutes(primaryItem);
  if (durationMinutes) {
    facts.push({
      key: "duration",
      label: `${durationMinutes}m`,
      tone: "outline",
    });
  }

  if (summary.focus.active) {
    facts.push({
      key: "focus",
      label: "Focus on",
      tone: "secondary",
    });
  }

  return facts.slice(0, 4);
}

function getPrimaryLine(
  summary: GoogleWorkspaceSummary,
  primaryItem?: GoogleCalendarItem | null,
) {
  if (!primaryItem) {
    return summary.focus.active ? "Focus block active" : "No upcoming meetings";
  }

  return primaryItem.title;
}

export function CalendarAgendaCompactView({
  title,
  summary,
  loading,
  error,
  maxItems = 5,
}: {
  title: string;
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
  const primaryItem = getPrimaryCalendarItem(items, summary.calendar.activeEventId);
  const facts = getCompactFacts(summary, items, primaryItem);

  return (
    <WidgetShell
      title={title}
      badges={[
        <MetricBadge
          key="state"
          label="state"
          value={summary.calendar.busyNow ? "Busy" : "Free"}
          tone={summary.calendar.busyNow ? "warning" : "success"}
        />,
      ]}
    >
      {loading && items.length === 0 ? (
        <WidgetEmptyState
          title="Loading agenda"
          message="Syncing meetings."
        />
      ) : items.length === 0 ? (
        <WidgetEmptyState
          title="No upcoming events"
          message={message || "Calendar is clear."}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full border border-border/70 bg-background/80 p-2">
                <CalendarDays className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold leading-none text-foreground">
                  {summary.calendar.busyNow ? "Busy" : "Free"}
                </p>
                <p className="mt-2 truncate text-sm font-medium text-foreground">
                  {getPrimaryLine(summary, primaryItem)}
                </p>
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
                {fact.key === "location" ? <MapPin className="size-3" /> : null}
                {fact.key === "duration" ? <Clock3 className="size-3" /> : null}
                {fact.key === "focus" ? <Sparkles className="size-3" /> : null}
                <span>{fact.label}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
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
