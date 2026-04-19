import { ImageOff, MonitorPlay } from "lucide-react";
import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SharedContextProvider } from "@/providers/SharedContextProvider";
import { cn } from "@/lib/utils";

import { loadModuleDefinition, loadModulesIndex } from "../loader";
import type { ModuleDefinition, ModuleMeta } from "../types";
import { getModuleConfigUiDefinition } from "./definitions";
import { resolveWidgetPreviewCanvasSize } from "./preview-size";
import type { WidgetPreviewMode } from "./types";

type RuntimeState =
  | { status: "idle"; Component: null; error: null }
  | { status: "loading"; Component: null; error: null }
  | {
      status: "ready";
      Component: ComponentType<{ config: Record<string, unknown> }>;
      error: null;
    }
  | { status: "error"; Component: null; error: Error };

type PreviewBoundaryState = {
  error: Error | null;
};

function asError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

class PreviewBoundary extends Component<
  { children: ReactNode },
  PreviewBoundaryState
> {
  state: PreviewBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full place-items-center bg-muted/40 px-5 text-center">
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview could not render</p>
            <p className="text-xs text-muted-foreground">
              {this.state.error.message}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function WidgetConfigPreview({
  meta,
  value,
}: {
  meta: ModuleMeta;
  value: Record<string, unknown>;
}) {
  const [mode, setMode] = useState<WidgetPreviewMode>("sample");
  const [previewUrl, setPreviewUrl] = useState<string | null>(meta.preview ?? null);
  const [runtime, setRuntime] = useState<RuntimeState>({
    status: "idle",
    Component: null,
    error: null,
  });
  const size = useMemo(
    () => resolveWidgetPreviewCanvasSize(meta.size),
    [meta.size],
  );
  const uiDefinition = getModuleConfigUiDefinition(meta.id);

  useEffect(() => {
    if (meta.preview) {
      setPreviewUrl(meta.preview);
      return;
    }

    let cancelled = false;

    void (async () => {
      const index = await loadModulesIndex();
      const entry = index.find((item) => item.meta.id === meta.id);
      if (!entry?.importers.preview) return;
      const url = await entry.importers.preview();
      if (!cancelled && typeof url === "string") {
        setPreviewUrl(url);
      }
    })().catch(() => {
      if (!cancelled) setPreviewUrl(null);
    });

    return () => {
      cancelled = true;
    };
  }, [meta.id, meta.preview]);

  useEffect(() => {
    if (mode !== "live") return;

    let cancelled = false;

    setRuntime({ status: "loading", Component: null, error: null });

    void (async () => {
      try {
        const index = await loadModulesIndex();
        const entry = index.find((item) => item.meta.id === meta.id);
        if (!entry) {
          throw new Error(`Module ${meta.id} was not found.`);
        }

        const definition = (await loadModuleDefinition(entry)) as ModuleDefinition;
        if (cancelled) return;

        setRuntime({
          status: "ready",
          Component: definition.Component,
          error: null,
        });
      } catch (error) {
        if (!cancelled) {
          setRuntime({
            status: "error",
            Component: null,
            error: asError(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [meta.id, mode]);

  const sampleConfig = {
    ...uiDefinition.sampleConfig,
    ...value,
  };
  const live = mode === "live";
  const ComponentToRender = runtime.status === "ready" ? runtime.Component : null;

  return (
    <aside className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Preview</p>
          <p className="text-xs text-muted-foreground">
            Sample is safe. Live may contact providers or devices.
          </p>
        </div>
        <div className="flex rounded-md border border-border/70 bg-muted/40 p-1">
          {(["sample", "live"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={mode === item ? "default" : "ghost"}
              className="h-8 px-3 text-xs"
              onClick={() => setMode(item)}
            >
              {item === "sample" ? "Sample" : "Live"}
            </Button>
          ))}
        </div>
      </div>

      {live ? (
        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-200">
          Live preview can make real requests
        </Badge>
      ) : null}

      <div
        className="mx-auto overflow-hidden rounded-md border border-border/70 bg-background shadow-sm"
        style={{
          width: `min(100%, ${size.width}px)`,
          maxHeight: size.height,
          aspectRatio: `${size.width} / ${size.height}`,
        }}
      >
        {live ? (
          ComponentToRender ? (
            <SharedContextProvider initialSharedData={{}} persist={false}>
              <PreviewBoundary>
                <div className="h-full w-full overflow-hidden">
                  <ComponentToRender config={value} />
                </div>
              </PreviewBoundary>
            </SharedContextProvider>
          ) : runtime.status === "error" ? (
            <div className="grid h-full place-items-center px-5 text-center">
              <p className="text-sm text-muted-foreground">
                {runtime.error.message}
              </p>
            </div>
          ) : (
            <div className="grid h-full place-items-center px-5 text-center">
              <p className="text-sm text-muted-foreground">Loading live preview...</p>
            </div>
          )
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={`${meta.name} sample preview`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full flex-col items-center justify-center gap-3 px-5 text-center",
              "bg-[linear-gradient(135deg,rgba(250,204,21,0.10),rgba(14,165,233,0.10))]",
            )}
          >
            <div className="grid size-10 place-items-center rounded-md border border-border/70 bg-background/80">
              {Object.keys(sampleConfig).length > 0 ? (
                <MonitorPlay className="size-5 text-primary" />
              ) : (
                <ImageOff className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{meta.name}</p>
              <p className="max-w-[260px] text-xs leading-5 text-muted-foreground">
                No static sample is available yet. Switch to Live when you want
                to render the real widget with this draft config.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
