import { useEffect, useMemo, useState } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useSharedContext, useSharedValue } from "@/hooks/useSharedContext"
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces"
import { agentsService, type Agent } from "@/services/agents"
import { controlService, type CommandRecord } from "@/services/control"
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
  formatTimestamp,
} from "../_shared/prometeo-widget-kit"

function getStatusTone(status: string) {
  if (status === "completed") return "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
  if (status === "failed" || status === "timeout") return "border-amber-500/30 text-amber-700 dark:text-amber-200"
  return "border-border/60"
}

export default function CommandHistoryWidget({
  config,
}: {
  config: Record<string, unknown>
}) {
  const title = String(config["title"] ?? "Command History")
  const mode = config["mode"] === "agent" ? "agent" : "auto"
  const configuredAgentId = String(config["agentId"] ?? "")
  const limit = Math.max(3, Math.min(20, Number(config["limit"] ?? 8)))
  const configuredStatus = String(config["status"] ?? "")
  const selectedAgentId = useSharedValue<string>(SHARED_NAMESPACES.agentSelected)
  const { setShared } = useSharedContext()
  const [agents, setAgents] = useState<Agent[]>([])
  const [commands, setCommands] = useState<CommandRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadAgents() {
      try {
        const nextAgents = await agentsService.listMine()
        if (!cancelled) {
          setAgents(nextAgents)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadAgents()

    return () => {
      cancelled = true
    }
  }, [])

  const activeAgent = useMemo(() => {
    if (agents.length === 0) return null

    const preferredAgentId =
      mode === "agent" && configuredAgentId
        ? configuredAgentId
        : selectedAgentId || configuredAgentId

    if (preferredAgentId) {
      const explicitAgent = agents.find((agent) => agent.id === preferredAgentId)
      if (explicitAgent) return explicitAgent
    }

    return agents[0] ?? null
  }, [agents, configuredAgentId, mode, selectedAgentId])

  useEffect(() => {
    if (!activeAgent?.id) return

    let cancelled = false
    const agentId = activeAgent.id

    async function loadCommands() {
      const payload = await controlService.listAgentCommands(agentId, {
        limit,
        status: configuredStatus || undefined,
      })

      if (cancelled) return
      setCommands(payload.commands ?? [])
      setShared(SHARED_NAMESPACES.agentCommands, payload.commands ?? [])
    }

    void loadCommands()
    const intervalId = window.setInterval(() => {
      void loadCommands()
    }, 12000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [activeAgent?.id, configuredStatus, limit, setShared])

  return (
    <WidgetShell
      title={title}
      subtitle="Recent command queue and execution results."
      badges={[
        <MetricBadge key="limit" label="limit" value={limit} />,
        <MetricBadge key="agent" label="agent" value={activeAgent?.name || activeAgent?.id || "--"} />,
      ]}
    >
      {loading ? (
        <WidgetEmptyState
          title="Loading command history"
          message="Prometeo is resolving which agent queue should be displayed."
        />
      ) : !activeAgent ? (
        <WidgetEmptyState
          title="No command target"
          message="Choose or register an accessible agent to inspect its recent command queue."
        />
      ) : commands.length === 0 ? (
        <WidgetEmptyState
          title="No commands yet"
          message="Queued commands and execution results will appear here once Command Center or Hermes sends work to this agent."
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 pr-3">
            {commands.map((command) => (
              <div
                key={command.commandId}
                className="rounded-2xl border border-border/70 bg-background/60 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {command.command}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent by {command.sentBy}
                    </p>
                  </div>
                  <Badge variant="outline" className={getStatusTone(command.status)}>
                    {command.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {command.priority}
                  </Badge>
                  <span>{formatTimestamp(command.createdAt)}</span>
                  {command.response?.executionTime ? (
                    <span>{command.response.executionTime} ms</span>
                  ) : null}
                </div>
                {command.response?.error ? (
                  <p className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-200">
                    {command.response.error}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </WidgetShell>
  )
}
