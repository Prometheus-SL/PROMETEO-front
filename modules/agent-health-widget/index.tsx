import { useEffect, useState } from "react"

import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useSharedContext } from "@/hooks/useSharedContext"
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces"
import {
  agentsService,
  type AgentHealthItem,
  type AgentHealthResponse,
} from "@/services/agents"
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
  formatTimestamp,
} from "../_shared/prometeo-widget-kit"

function ResourceMeter({
  label,
  value,
}: {
  label: string
  value?: number | null
}) {
  const safeValue = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span>{typeof value === "number" ? `${Math.round(value)}%` : "--"}</span>
      </div>
      <Progress value={safeValue} className="h-2" />
    </div>
  )
}

export default function AgentHealthWidget({
  config,
}: {
  config: Record<string, unknown>
}) {
  const title = String(config["title"] ?? "Agent Health")
  const limit = Math.max(1, Math.min(12, Number(config["limit"] ?? 4)))
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 15000))
  const { setShared, setShared: setSharedValue } = useSharedContext()
  const [payload, setPayload] = useState<AgentHealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const nextPayload = await agentsService.health(limit)
        if (cancelled) return
        setPayload(nextPayload)
        setShared(SHARED_NAMESPACES.agentHealth, nextPayload)
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

  const agents = payload?.agents ?? []
  const summary = payload?.summary

  return (
    <WidgetShell
      title={title}
      subtitle="Realtime health summary for your reachable agents."
      badges={[
        <MetricBadge key="total" label="agents" value={summary?.total ?? 0} tone={(summary?.total ?? 0) > 0 ? "success" : "neutral"} />,
        <MetricBadge key="degraded" label="degraded" value={summary?.degraded ?? 0} tone={(summary?.degraded ?? 0) > 0 ? "warning" : "success"} />,
      ]}
    >
      {loading && agents.length === 0 ? (
        <WidgetEmptyState
          title="Loading health"
          message="Prometeo is aggregating the latest system status from your agents."
        />
      ) : agents.length === 0 ? (
        <WidgetEmptyState
          title="No agents detected"
          message="Health cards will appear once at least one accessible agent has recent telemetry."
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 pr-3">
            {agents.map((agent: AgentHealthItem) => (
              <button
                key={agent.agentId}
                type="button"
                className="w-full rounded-2xl border border-border/70 bg-background/60 p-3 text-left transition hover:border-primary/50"
                onClick={() => setSharedValue(SHARED_NAMESPACES.agentSelected, agent.agentId)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{agent.name || agent.agentId}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.hostname || agent.agentId}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      agent.degraded
                        ? "border-amber-500/30 text-amber-700 dark:text-amber-200"
                        : "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    }
                  >
                    {agent.status}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2">
                  <ResourceMeter label="CPU" value={agent.health.cpuPercent} />
                  <ResourceMeter label="Memory" value={agent.health.memoryPercent} />
                  <ResourceMeter label="Disk" value={agent.health.diskPercent} />
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Last telemetry: {formatTimestamp(agent.latestTelemetryAt || agent.lastSeen)}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </WidgetShell>
  )
}
