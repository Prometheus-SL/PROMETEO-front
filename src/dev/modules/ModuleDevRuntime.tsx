import { Loader2 } from "lucide-react";
import { forwardRef, useEffect, useState, type ComponentType } from "react";

import type { SharedAction } from "@/contexts/SharedContext";
import type { ModulesIndexEntry } from "@/modules/types";

import { loadModuleDevRuntimeEntry } from "./catalog";
import { ModuleDevBoundary } from "./ModuleDevBoundary";
import { ModuleDevCanvas } from "./ModuleDevCanvas";
import { ModuleDevPreviewProviders } from "./runtime";
import type {
  ModuleDevAuthState,
  ModuleDevCanvasMode,
  ModuleDevSurface,
} from "./types";

type RuntimeState =
  | {
      status: "loading";
      entry: ModulesIndexEntry | null;
      error: Error | null;
    }
  | {
      status: "ready";
      entry: ModulesIndexEntry;
      Component: ComponentType<{ config: Record<string, unknown> }>;
      error: null;
    }
  | {
      status: "error";
      entry: ModulesIndexEntry | null;
      error: Error;
    };

function asError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

export const ModuleDevRuntime = forwardRef<
  HTMLDivElement,
  {
    actions?: SharedAction[];
    authState?: ModuleDevAuthState;
    canvasMode: ModuleDevCanvasMode;
    config: Record<string, unknown>;
    entryId: string;
    sharedData?: Record<string, unknown>;
    surface: ModuleDevSurface;
  }
>(function ModuleDevRuntime(
  { actions, authState, canvasMode, config, entryId, sharedData, surface },
  ref,
) {
  const [runtime, setRuntime] = useState<RuntimeState>({
    status: "loading",
    entry: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    setRuntime((previous) => ({
      status: "loading",
      entry: previous.entry,
      error: null,
    }));

    void (async () => {
      try {
        const nextRuntime = await loadModuleDevRuntimeEntry(entryId);
        if (cancelled) {
          return;
        }

        setRuntime({
          status: "ready",
          entry: nextRuntime.entry,
          Component: nextRuntime.module.Component,
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRuntime({
          status: "error",
          entry: null,
          error: asError(error),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entryId]);

  const size = runtime.entry?.meta.size;

  if (runtime.status === "loading") {
    return (
      <ModuleDevCanvas ref={ref} mode={canvasMode} size={size}>
        <div className="flex h-full w-full items-center justify-center bg-background/90">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="size-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading module...</p>
          </div>
        </div>
      </ModuleDevCanvas>
    );
  }

  if (runtime.status === "error") {
    return (
      <ModuleDevCanvas ref={ref} mode={canvasMode} size={size}>
        <div className="flex h-full w-full items-center justify-center bg-background/90">
          <div className="flex max-w-sm flex-col items-center gap-3 px-5 text-center">
            <p className="text-sm font-semibold text-foreground">
              Could not load {entryId}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              {runtime.error.message}
            </p>
          </div>
        </div>
      </ModuleDevCanvas>
    );
  }

  const { Component } = runtime;

  return (
    <ModuleDevCanvas ref={ref} mode={canvasMode} size={runtime.entry.meta.size}>
      <ModuleDevPreviewProviders
        actions={actions}
        authState={authState}
        sharedData={sharedData}
        surface={surface}
      >
        <ModuleDevBoundary
          title={`Could not render ${runtime.entry.meta.name}`}
        >
          <Component config={config} />
        </ModuleDevBoundary>
      </ModuleDevPreviewProviders>
    </ModuleDevCanvas>
  );
});
