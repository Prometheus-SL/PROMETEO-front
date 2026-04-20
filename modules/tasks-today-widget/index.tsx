import { useMemo } from "react";
import { CheckSquare2, Clock3, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  WidgetContent,
  WidgetHeader,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import { formatTimestamp } from "../_shared/prometeo-widget-kit";
import {
  getGoogleWorkspaceMessage,
  useGoogleWorkspaceSummary,
} from "../_shared/use-google-workspace";

function formatDueDate(value?: string | null) {
  if (!value) return "No due date";
  return formatTimestamp(value);
}

export default function TasksTodayWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Tasks Today");
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 60000));
  const maxItems = Math.max(1, Math.min(10, Number(config["maxItems"] ?? 5)));
  const { summary, loading, error } = useGoogleWorkspaceSummary(pollMs);
  const tasks = useMemo(
    () => summary.tasks.items.slice(0, maxItems),
    [maxItems, summary.tasks.items],
  );
  const overdueCount = Number(summary.tasks.overdueCount ?? 0);
  const dueTodayCount = Number(summary.tasks.dueTodayCount ?? 0);
  const message = error ?? getGoogleWorkspaceMessage(summary);
  const accent = overdueCount > 0 ? ("rose" as const) : ("emerald" as const);

  return (
    <WidgetShell accent={accent}>
      <WidgetHeader
        accent={accent}
        icon={<CheckSquare2 className="size-4" />}
        title={title}
        description="Google Tasks due today"
        status={
          <WidgetStatus tone={overdueCount > 0 ? "danger" : "success"}>
            {dueTodayCount} due
          </WidgetStatus>
        }
        meta={
          overdueCount > 0 ? (
            <Badge className="h-4 bg-red-500/20 px-1.5 text-[9px] text-red-700 hover:bg-red-500/20 dark:text-red-200">
              {overdueCount} overdue
            </Badge>
          ) : null
        }
      />
      <WidgetContent>
        {loading && tasks.length === 0 ? (
          <WidgetState
            accent={accent}
            icon={<Loader2 className="size-5 animate-spin" />}
            title="Loading tasks"
            message="Checking your Google Tasks list."
          />
        ) : tasks.length === 0 ? (
          <WidgetState
            accent={accent}
            icon={<CheckSquare2 className="size-5" />}
            title="No tasks due"
            message={message || "Your task list is clear for today."}
          />
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1.5">
              {tasks.map((task) => (
                <WidgetSection
                  key={task.id ?? task.title}
                  accent={accent}
                  className="space-y-1 py-1.5"
                >
                  <p className="truncate text-[0.82rem] font-semibold leading-tight">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock3 className="size-3" />
                    <span>{formatDueDate(task.due)}</span>
                    {task.taskListTitle ? <span>/</span> : null}
                    {task.taskListTitle ? (
                      <span className="truncate">{task.taskListTitle}</span>
                    ) : null}
                  </div>
                </WidgetSection>
              ))}
            </div>
          </ScrollArea>
        )}
      </WidgetContent>
    </WidgetShell>
  );
}
