import { useEffect, useMemo, useState } from "react"
import { Play, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSharedContext } from "@/hooks/useSharedContext"
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces"
import type { SharedAction } from "@/contexts/SharedContext"
import { MetricBadge, WidgetEmptyState, WidgetShell } from "../_shared/prometeo-widget-kit"

export default function ActionCenterWidget({
  config,
}: {
  config: Record<string, unknown>
}) {
  const title = String(config["title"] ?? "Action Center")
  const maxActions = Math.max(3, Math.min(20, Number(config["maxActions"] ?? 8)))
  const showWidgetIds = Boolean(config["showWidgetIds"] ?? true)
  const { getActions, subscribeActions, setShared } = useSharedContext()
  const [actions, setActions] = useState<SharedAction[]>([])
  const [busyActionId, setBusyActionId] = useState<string | null>(null)

  useEffect(() => {
    setActions(getActions())
    const unsubscribe = subscribeActions(setActions)
    return unsubscribe
  }, [getActions, subscribeActions])

  useEffect(() => {
    setShared(
      SHARED_NAMESPACES.mediaActions,
      actions.map((action) => ({
        id: action.id,
        title: action.title,
        widgetId: action.widgetId,
        intentTags: action.intentTags ?? [],
      })),
    )
  }, [actions, setShared])

  const visibleActions = useMemo(
    () =>
      [...actions]
        .sort((left, right) => left.title.localeCompare(right.title))
        .slice(0, maxActions),
    [actions, maxActions],
  )

  async function handleRun(action: SharedAction) {
    setBusyActionId(action.id)
    try {
      const result = await action.run()
      if (result.success) {
        toast.success(result.message || `${action.title} completed`)
      } else {
        toast.error(result.message || `${action.title} failed`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not run ${action.title}`)
    } finally {
      setBusyActionId(null)
    }
  }

  return (
    <WidgetShell
      title={title}
      subtitle="Shared actions exposed by the rest of your widgets."
      badges={[
        <MetricBadge key="count" label="actions" value={actions.length} tone={actions.length > 0 ? "success" : "neutral"} />,
        <MetricBadge key="sync" label="source" value="SharedContext" />,
      ]}
    >
      {visibleActions.length === 0 ? (
        <WidgetEmptyState
          title="No shared actions yet"
          message="Install widgets that register actions, or expose new actions from your own modules to control them here."
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 pr-3">
            {visibleActions.map((action) => (
              <div
                key={action.id}
                className="rounded-2xl border border-border/70 bg-background/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{action.title}</p>
                      {showWidgetIds ? (
                        <Badge variant="outline" className="text-[10px]">
                          {action.widgetId}
                        </Badge>
                      ) : null}
                    </div>
                    {action.description ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {action.description}
                      </p>
                    ) : null}
                    {action.intentTags?.length ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {action.intentTags.slice(0, 3).map((tag) => (
                          <Badge
                            key={`${action.id}-${tag}`}
                            variant="secondary"
                            className="bg-primary/10 text-primary"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={busyActionId === action.id}
                    onClick={() => void handleRun(action)}
                  >
                    {busyActionId === action.id ? (
                      <Sparkles className="size-4 animate-pulse" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    Run
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </WidgetShell>
  )
}
