import { useMemo } from "react";
import { Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
} from "../_shared/prometeo-widget-kit";
import {
  getGoogleWorkspaceMessage,
  useGoogleWorkspaceSummary,
} from "../_shared/use-google-workspace";

export default function InboxSummaryWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Inbox Summary");
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 60000));
  const maxItems = Math.max(1, Math.min(8, Number(config["maxItems"] ?? 4)));
  const { summary, loading, error } = useGoogleWorkspaceSummary(pollMs);
  const items = useMemo(
    () => summary.inbox.items.slice(0, maxItems),
    [maxItems, summary.inbox.items],
  );
  const message = error ?? getGoogleWorkspaceMessage(summary);

  return (
    <WidgetShell
      title={title}
      subtitle="Unread Gmail threads without leaving the dashboard."
      badges={[
        <MetricBadge
          key="unread"
          label="unread"
          value={summary.inbox.unreadCount}
          tone={summary.inbox.unreadCount > 0 ? "warning" : "success"}
        />,
      ]}
    >
      {loading && items.length === 0 ? (
        <WidgetEmptyState
          title="Loading inbox"
          message="PROMETEO is checking your unread Gmail threads."
        />
      ) : items.length === 0 ? (
        <WidgetEmptyState
          title="Inbox under control"
          message={message || "No unread Gmail threads were found."}
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 pr-3">
            {items.map((item) => (
              <div
                key={item.id ?? item.subject}
                className="rounded-2xl border border-border/70 bg-background/60 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full border border-border/70 bg-background/80 p-2">
                    <Mail className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.subject}
                    </p>
                    {item.from ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.from}
                      </p>
                    ) : null}
                    {item.snippet ? (
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {item.snippet}
                      </p>
                    ) : null}
                    {item.date ? (
                      <div className="pt-1">
                        <Badge variant="outline">{item.date}</Badge>
                      </div>
                    ) : null}
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
