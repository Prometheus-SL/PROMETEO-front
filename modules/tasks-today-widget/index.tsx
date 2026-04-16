import { useMemo, useState } from "react";
import { Check, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { googleService, type GoogleTaskItem } from "@/services/google";
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

function getPostponedDate(task: GoogleTaskItem) {
  const base = task.due ? new Date(task.due) : new Date();
  const nextDate = Number.isNaN(base.getTime()) ? new Date() : base;
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return nextDate.toISOString();
}

export default function TasksTodayWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Tasks Today");
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 60000));
  const maxItems = Math.max(3, Math.min(12, Number(config["maxItems"] ?? 6)));
  const { summary, loading, error, reload } = useGoogleWorkspaceSummary(pollMs);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const items = useMemo(
    () => summary.tasks.items.slice(0, maxItems),
    [maxItems, summary.tasks.items],
  );
  const message = error ?? getGoogleWorkspaceMessage(summary);

  async function handleComplete(task: GoogleTaskItem) {
    if (!task.id || !task.taskListId) return;
    setPendingTaskId(task.id);
    try {
      await googleService.completeTask(task.taskListId, task.id);
      await reload();
    } finally {
      setPendingTaskId(null);
    }
  }

  async function handlePostpone(task: GoogleTaskItem) {
    if (!task.id || !task.taskListId) return;
    setPendingTaskId(task.id);
    try {
      await googleService.rescheduleTask(
        task.taskListId,
        task.id,
        getPostponedDate(task),
      );
      await reload();
    } finally {
      setPendingTaskId(null);
    }
  }

  return (
    <WidgetShell
      title={title}
      subtitle="Today and overdue work from Google Tasks."
      badges={[
        <MetricBadge
          key="today"
          label="today"
          value={summary.tasks.dueTodayCount}
          tone={summary.tasks.dueTodayCount > 0 ? "warning" : "success"}
        />,
        <MetricBadge
          key="overdue"
          label="overdue"
          value={summary.tasks.overdueCount ?? 0}
          tone={(summary.tasks.overdueCount ?? 0) > 0 ? "warning" : "neutral"}
        />,
      ]}
    >
      {loading && items.length === 0 ? (
        <WidgetEmptyState
          title="Loading tasks"
          message="PROMETEO is syncing your Google task lists."
        />
      ) : items.length === 0 ? (
        <WidgetEmptyState
          title="No urgent tasks"
          message={message || "Nothing due today or overdue was found."}
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 pr-3">
            {items.map((task) => {
              const isPending = pendingTaskId === task.id;
              return (
                <div
                  key={`${task.taskListId}-${task.id}`}
                  className="rounded-2xl border border-border/70 bg-background/60 p-3"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.due ? formatTimestamp(task.due) : "No due date"}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => void handleComplete(task)}
                        disabled={isPending}
                      >
                        <Check className="size-4" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => void handlePostpone(task)}
                        disabled={isPending}
                      >
                        <Clock3 className="size-4" />
                        Tomorrow
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </WidgetShell>
  );
}
