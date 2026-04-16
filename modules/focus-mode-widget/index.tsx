import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SharedAction } from "@/contexts/SharedContext";
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
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

function matchesFocusIntent(action: SharedAction) {
  const haystack = [
    action.title,
    action.description,
    ...(action.intentTags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return ["focus", "spotify", "musica", "music", "luces", "light", "presencia"]
    .some((keyword) => haystack.includes(keyword));
}

export default function FocusModeWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Focus Mode");
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 60000));
  const maxActions = Math.max(1, Math.min(8, Number(config["maxActions"] ?? 4)));
  const { summary, loading, error } = useGoogleWorkspaceSummary(pollMs);
  const {
    getActions,
    subscribeActions,
    setShared,
    registerAction,
    unregisterAction,
  } = useSharedContext();
  const [actions, setActions] = useState<SharedAction[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setShared(SHARED_NAMESPACES.automationFocus, summary.focus);
  }, [setShared, summary.focus]);

  useEffect(() => {
    setActions(getActions());
    return subscribeActions((nextActions) => {
      setActions(nextActions);
    });
  }, [getActions, subscribeActions]);

  const focusActions = useMemo(
    () => actions.filter(matchesFocusIntent).slice(0, maxActions),
    [actions, maxActions],
  );
  const message = error ?? getGoogleWorkspaceMessage(summary);

  async function runFocusActions() {
    setRunning(true);
    try {
      for (const action of focusActions) {
        await action.run({
          source: "focus-mode-widget",
          reason: summary.focus.reason,
        });
      }
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    const actionId = "focus-mode-widget:activate";

    registerAction({
      id: actionId,
      title: "Activate focus mode",
      description: "Runs the shared actions that look relevant for focus mode.",
      intentTags: ["focus", "luces", "spotify", "presencia"],
      widgetId: "focus-mode-widget",
      run: async () => {
        for (const action of focusActions) {
          await action.run({
            source: "focus-mode-widget",
            reason: summary.focus.reason,
          });
        }
        return {
          success: true,
          message: "Focus actions executed.",
          data: {
            count: focusActions.length,
          },
        };
      },
    });

    return () => {
      unregisterAction(actionId);
    };
  }, [focusActions, registerAction, summary.focus.reason, unregisterAction]);

  return (
    <WidgetShell
      title={title}
      subtitle="Focus state inferred from meetings, tasks and inbox pressure."
      badges={[
        <MetricBadge
          key="focus"
          label="focus"
          value={summary.focus.active ? "On" : "Idle"}
          tone={summary.focus.active ? "warning" : "success"}
        />,
        <MetricBadge
          key="actions"
          label="actions"
          value={focusActions.length}
        />,
      ]}
    >
      {loading && !summary.focus.active && focusActions.length === 0 ? (
        <WidgetEmptyState
          title="Loading focus state"
          message="PROMETEO is combining Google signals and shared widget actions."
        />
      ) : (
        <div className="flex h-full flex-col gap-4">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full border border-border/70 bg-background/80 p-2">
                <BrainCircuit className="size-4 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {summary.focus.active
                    ? "Focus mode is recommended right now."
                    : "No strong focus trigger detected."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {summary.focus.reason ? (
                    <Badge variant="secondary">{summary.focus.reason}</Badge>
                  ) : null}
                  {summary.focus.nextTransitionAt ? (
                    <Badge variant="outline">
                      {formatTimestamp(summary.focus.nextTransitionAt)}
                    </Badge>
                  ) : null}
                </div>
                {message ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    {message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {focusActions.length === 0 ? (
            <WidgetEmptyState
              title="No focus actions yet"
              message="Install widgets like Spotify, LIFX or WLED to let Focus Mode trigger shared actions."
            />
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={() => void runFocusActions()}
                disabled={running}
              >
                <PlayCircle className="size-4" />
                {running ? "Running focus actions..." : "Run focus actions"}
              </Button>
              <div className="flex flex-wrap gap-2">
                {focusActions.map((action) => (
                  <Badge key={action.id} variant="outline">
                    {action.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetShell>
  );
}
