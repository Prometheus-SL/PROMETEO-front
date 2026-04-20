import { CheckSquare2 } from "lucide-react";

import {
  WidgetContent,
  WidgetHeader,
  WidgetShell,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import {
  getGoogleWorkspaceMessage,
  useGoogleWorkspaceSummary,
} from "../_shared/use-google-workspace";

export default function TasksTodayCompactWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Tasks Today");
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 60000));
  const { summary, error } = useGoogleWorkspaceSummary(pollMs);
  const overdueCount = Number(summary.tasks.overdueCount ?? 0);
  const dueTodayCount = Number(summary.tasks.dueTodayCount ?? 0);
  const accent = overdueCount > 0 ? ("rose" as const) : ("emerald" as const);
  const message = error ?? getGoogleWorkspaceMessage(summary);

  return (
    <WidgetShell accent={accent}>
      <WidgetHeader
        accent={accent}
        icon={<CheckSquare2 className="size-4" />}
        title={title}
        description="Today's task load"
        status={
          <WidgetStatus tone={overdueCount > 0 ? "danger" : "success"}>
            {dueTodayCount} due
          </WidgetStatus>
        }
      />
      <WidgetContent>
        <div className="flex flex-1 items-center justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold leading-none">
              {dueTodayCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">due today</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold leading-none">
              {overdueCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">overdue</p>
          </div>
        </div>
        {message ? (
          <p className="line-clamp-1 text-[10px] text-muted-foreground">
            {message}
          </p>
        ) : null}
      </WidgetContent>
    </WidgetShell>
  );
}
