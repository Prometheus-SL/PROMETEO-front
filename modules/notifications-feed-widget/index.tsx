import { useEffect, useState } from "react"
import { BellRing, Cpu, Link2 } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { dashboardService, type DashboardFeedItem } from "@/services/dashboards"
import { useSharedContext } from "@/hooks/useSharedContext"
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces"
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
  formatTimestamp,
} from "../_shared/prometeo-widget-kit"

function getFeedIcon(type: string) {
  if (type === "linked-account") return <Link2 className="size-4 text-amber-600" />
  return <Cpu className="size-4 text-primary" />
}

export default function NotificationsFeedWidget({
  config,
}: {
  config: Record<string, unknown>
}) {
  const title = String(config["title"] ?? "Notifications Feed")
  const limit = Math.max(3, Math.min(20, Number(config["limit"] ?? 8)))
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 15000))
  const { setShared } = useSharedContext()
  const [items, setItems] = useState<DashboardFeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const nextItems = await dashboardService.getFeed(limit)
        if (cancelled) return
        setItems(nextItems)
        setShared(SHARED_NAMESPACES.dashboardFeed, nextItems)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    const intervalId = window.setInterval(() => {
      void load()
    }, pollMs)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [limit, pollMs, setShared])

  return (
    <WidgetShell
      title={title}
      subtitle="Recent provider alerts and agent telemetry highlights."
      badges={[
        <MetricBadge key="count" label="items" value={items.length} tone={items.length > 0 ? "success" : "neutral"} />,
        <MetricBadge key="poll" label="poll" value={`${Math.round(pollMs / 1000)}s`} />,
      ]}
    >
      {loading && items.length === 0 ? (
        <WidgetEmptyState
          title="Loading feed"
          message="Prometeo is collecting provider and agent activity for this dashboard."
        />
      ) : items.length === 0 ? (
        <WidgetEmptyState
          title="Feed is quiet"
          message="No recent provider alerts or agent events were found for your account."
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 pr-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/70 bg-background/60 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full border border-border/70 bg-background/80 p-2">
                    {getFeedIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {item.type}
                      </Badge>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {item.message}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted-foreground">
                      {item.provider ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-200">
                          {item.provider}
                        </Badge>
                      ) : null}
                      {item.agentName ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {item.agentName}
                        </Badge>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <BellRing className="size-3.5" />
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </WidgetShell>
  )
}
