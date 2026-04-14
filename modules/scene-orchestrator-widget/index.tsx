import { useEffect, useMemo, useState } from "react"
import { MoonStar, RotateCcw, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSharedContext } from "@/hooks/useSharedContext"
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces"
import type { SharedAction } from "@/contexts/SharedContext"
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
} from "../_shared/prometeo-widget-kit"

type SceneDefinition = {
  id: string
  label: string
  icon: typeof MoonStar
  description: string
  query: string
}

function tokenize(query: string) {
  return query
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
}

function matchesAction(action: SharedAction, tokens: string[]) {
  if (tokens.length === 0) return false

  const haystack = [
    action.title,
    action.description ?? "",
    action.widgetId,
    ...(action.intentTags ?? []),
  ]
    .join(" ")
    .toLowerCase()

  return tokens.some((token) => haystack.includes(token))
}

export default function SceneOrchestratorWidget({
  config,
}: {
  config: Record<string, unknown>
}) {
  const title = String(config["title"] ?? "Scene Orchestrator")
  const { getActions, subscribeActions, setShared } = useSharedContext()
  const [actions, setActions] = useState<SharedAction[]>([])
  const [busySceneId, setBusySceneId] = useState<string | null>(null)

  const scenes = useMemo<SceneDefinition[]>(
    () => [
      {
        id: "scene-orchestrator-widget:focus",
        label: "Focus",
        icon: MoonStar,
        description: "Pause media, calm noisy widgets, and refresh the workspace.",
        query: String(config["focusQuery"] ?? "pause,mute,off,refresh"),
      },
      {
        id: "scene-orchestrator-widget:ambient",
        label: "Ambient",
        icon: Sparkles,
        description: "Bring media and ambience back with positive cues.",
        query: String(config["ambientQuery"] ?? "play,on,subir volumen"),
      },
      {
        id: "scene-orchestrator-widget:reset",
        label: "Reset",
        icon: RotateCcw,
        description: "Refresh dashboards and move widgets back into a known state.",
        query: String(config["resetQuery"] ?? "refresh,resumen,next"),
      },
    ],
    [config],
  )

  useEffect(() => {
    setActions(getActions())
    const unsubscribe = subscribeActions(setActions)
    return unsubscribe
  }, [getActions, subscribeActions])

  const availableActions = useMemo(
    () => actions.filter((action) => action.widgetId !== "scene-orchestrator-widget"),
    [actions],
  )

  const actionsByScene = useMemo(
    () =>
      Object.fromEntries(
        scenes.map((scene) => [
          scene.id,
          availableActions.filter((action) => matchesAction(action, tokenize(scene.query))),
        ]),
      ) as Record<string, SharedAction[]>,
    [availableActions, scenes],
  )

  useEffect(() => {
    setShared(
      SHARED_NAMESPACES.automationScenes,
      scenes.map((scene) => ({
        id: scene.id,
        label: scene.label,
        actions: actionsByScene[scene.id]?.map((action) => action.id) ?? [],
      })),
    )
  }, [actionsByScene, scenes, setShared])

  async function handleRunScene(scene: SceneDefinition) {
    const matchedActions = actionsByScene[scene.id] ?? []
    if (matchedActions.length === 0) {
      toast.error(`${scene.label} has no matched actions yet`)
      return
    }

    setBusySceneId(scene.id)
    try {
      for (const action of matchedActions) {
        await action.run()
      }

      const payload = {
        id: scene.id,
        label: scene.label,
        runAt: new Date().toISOString(),
        count: matchedActions.length,
      }

      setShared(SHARED_NAMESPACES.automationLastScene, payload)
      toast.success(`${scene.label} scene ran ${matchedActions.length} actions`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not run ${scene.label}`)
    } finally {
      setBusySceneId(null)
    }
  }

  return (
    <WidgetShell
      title={title}
      subtitle="Compose scenes from the shared actions already exposed by your widgets."
      badges={[
        <MetricBadge key="pool" label="pool" value={availableActions.length} tone={availableActions.length > 0 ? "success" : "neutral"} />,
        <MetricBadge key="scenes" label="scenes" value={scenes.length} />,
      ]}
    >
      {availableActions.length === 0 ? (
        <WidgetEmptyState
          title="No actions to orchestrate"
          message="Install widgets that expose actions first, then Scene Orchestrator can chain them into reusable flows."
        />
      ) : (
        <div className="grid flex-1 gap-3">
          {scenes.map((scene) => {
            const Icon = scene.icon
            const matchedActions = actionsByScene[scene.id] ?? []

            return (
              <div
                key={scene.id}
                className="rounded-2xl border border-border/70 bg-background/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">{scene.label}</p>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {scene.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {matchedActions.length} actions
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void handleRunScene(scene)}
                    disabled={busySceneId === scene.id || matchedActions.length === 0}
                  >
                    {busySceneId === scene.id ? "Running..." : "Run"}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </WidgetShell>
  )
}
