import { useEffect, useMemo, useState } from "react"
import {
  BellRing,
  Camera,
  Lock,
  RefreshCcw,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSharedValue, useSharedContext } from "@/hooks/useSharedContext"
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces"
import { agentsService, type Agent } from "@/services/agents"
import { controlService } from "@/services/control"
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
} from "../_shared/prometeo-widget-kit"

type CommandPreset = {
  id: string
  label: string
  icon: typeof Lock
  command: string
  parameters?: Record<string, unknown>
}

export default function CommandCenterWidget({
  config,
}: {
  config: Record<string, unknown>
}) {
  const title = String(config["title"] ?? "Command Center")
  const mode = config["mode"] === "agent" ? "agent" : "auto"
  const configuredAgentId = String(config["agentId"] ?? "")
  const notificationTitle = String(config["notificationTitle"] ?? "PROMETEO")
  const notificationMessage = String(
    config["notificationMessage"] ?? "Hello from Command Center",
  )
  const selectedAgentId = useSharedValue<string>(SHARED_NAMESPACES.agentSelected)
  const { setShared } = useSharedContext()
  const [agents, setAgents] = useState<Agent[]>([])
  const [busyCommandId, setBusyCommandId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const nextAgents = await agentsService.listMine()
        if (!cancelled) {
          setAgents(nextAgents)
          setLoading(false)
        }
      } catch (_error) {
        if (!cancelled) {
          setAgents([])
          setLoading(false)
        }
      }
    }

    void load()
    const intervalId = window.setInterval(() => {
      void load()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
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

    return [...agents].sort((left, right) => {
      const leftOnline = left.status === "online" ? 1 : 0
      const rightOnline = right.status === "online" ? 1 : 0
      if (leftOnline !== rightOnline) {
        return rightOnline - leftOnline
      }

      return new Date(right.lastSeen || 0).getTime() - new Date(left.lastSeen || 0).getTime()
    })[0] ?? null
  }, [agents, configuredAgentId, mode, selectedAgentId])

  useEffect(() => {
    if (activeAgent?.id) {
      setShared(SHARED_NAMESPACES.agentSelected, activeAgent.id)
    }
  }, [activeAgent?.id, setShared])

  const commandPresets = useMemo<CommandPreset[]>(
    () => [
      { id: "lock_screen", label: "Lock", icon: Lock, command: "lock_screen" },
      { id: "take_screenshot", label: "Screenshot", icon: Camera, command: "take_screenshot" },
      { id: "restart", label: "Restart", icon: RotateCcw, command: "restart" },
      { id: "media_refresh", label: "Refresh Media", icon: RefreshCcw, command: "media_refresh" },
      {
        id: "show_notification",
        label: "Notify",
        icon: BellRing,
        command: "show_notification",
        parameters: { title: notificationTitle, message: notificationMessage },
      },
      { id: "volume_up", label: "Volume +", icon: Volume2, command: "volume_up" },
      { id: "volume_mute", label: "Mute", icon: VolumeX, command: "volume_mute" },
    ],
    [notificationMessage, notificationTitle],
  )

  async function handleCommand(preset: CommandPreset) {
    if (!activeAgent?.id) return

    setBusyCommandId(preset.id)
    try {
      const response = await controlService.sendCommand({
        agentId: activeAgent.id,
        command: preset.command,
        parameters: preset.parameters,
      })

      toast.success(`${preset.label} queued`, {
        description: response.commandId || activeAgent.name || activeAgent.id,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not send ${preset.label}`)
    } finally {
      setBusyCommandId(null)
    }
  }

  return (
    <WidgetShell
      title={title}
      subtitle="Safe shortcuts for Hermes and controllable agents."
      badges={[
        <MetricBadge key="agents" label="agents" value={agents.length} tone={agents.length > 0 ? "success" : "neutral"} />,
        <MetricBadge key="mode" label="mode" value={mode} />,
      ]}
    >
      {loading ? (
        <WidgetEmptyState
          title="Loading controllable agents"
          message="Prometeo is resolving which agent should receive quick commands."
        />
      ) : !activeAgent ? (
        <WidgetEmptyState
          title="No controllable agent"
          message="Link or register an accessible agent before using Command Center."
        />
      ) : (
        <div className="flex h-full flex-col gap-4">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {activeAgent.name || activeAgent.id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeAgent.computerInfo?.hostname || activeAgent.id}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  activeAgent.status === "online"
                    ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/30 text-amber-700 dark:text-amber-200"
                }
              >
                {activeAgent.status}
              </Badge>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3">
            {commandPresets.map((preset) => {
              const Icon = preset.icon
              return (
                <Button
                  key={preset.id}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-20 flex-col items-start justify-between rounded-2xl border-border/70 px-4 py-3 text-left"
                  onClick={() => void handleCommand(preset)}
                  disabled={busyCommandId === preset.id || activeAgent.status !== "online"}
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon className="size-4 text-primary" />
                    {busyCommandId === preset.id ? (
                      <Badge variant="secondary">Queued</Badge>
                    ) : null}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{preset.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {preset.command}
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </WidgetShell>
  )
}
