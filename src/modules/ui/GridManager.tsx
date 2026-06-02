import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Grip, Pencil, Sparkles, Trash2, Undo2, Wrench } from "lucide-react";

import { SharedContextProvider } from "@/providers/SharedContextProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { loadModuleDefinition, loadModulesIndex } from "../loader";
import {
  analyzeInstalledModules,
  findNearestFreeCell,
  GRID_COLS,
  GRID_ROWS,
  sameCell,
  type GridCell,
} from "../grid-layout";
import type { InstalledModule } from "../types";
import { ModuleConfigModal } from "./ModuleConfigModal";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";

interface GridManagerProps {
  installed: InstalledModule[];
  onRemove?: (id: string) => void;
  onMove?: (id: string, pos: GridCell) => void;
  onUpdateConfig?: (id: string, config: Record<string, unknown>) => void;
  onRepairLayout?: () => Promise<void> | void;
}

type DragState = {
  id: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startPosition: GridCell;
};

type LastMove = {
  id: string;
  moduleName: string;
  from: GridCell;
  to: GridCell;
};

function samePositionMap(
  left: Record<string, GridCell>,
  right: Record<string, GridCell>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => sameCell(left[key], right[key]));
}

function buildRepairMessage(repairCount: number, hiddenCount: number) {
  if (hiddenCount > 0) {
    return `This layout has ${hiddenCount} widget${hiddenCount === 1 ? "" : "s"} that no longer fit in the grid. Remove some widgets before repairing it.`;
  }

  return `This layout has ${repairCount} widget${repairCount === 1 ? "" : "s"} with overlapping or invalid positions. Prometeo is previewing a safe layout and can repair it permanently.`;
}

export function GridManager({
  installed,
  onRemove,
  onMove,
  onUpdateConfig,
  onRepairLayout,
}: GridManagerProps) {
  const [definitions, setDefinitions] = useState<
    Record<
      string,
      {
        Component: ComponentType<{
          config: Record<string, unknown>;
          onConfigChange?: (config: Record<string, unknown>) => void;
        }>;
      }
    >
  >({});
  const [positions, setPositions] = useState<Record<string, GridCell>>({});
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const scaleWrapperRef = useRef<HTMLDivElement | null>(null);
  const [gridScale, setGridScale] = useState(1);
  const positionsRef = useRef<Record<string, GridCell>>({});
  const gridBaseWidth = 1024;
  const gridBaseHeight = 500;

  const layoutAnalysis = useMemo(
    () => analyzeInstalledModules(installed),
    [installed],
  );

  useEffect(() => {
    const updateScale = () => {
      const wrapper = scaleWrapperRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const availableHeight = Math.max(280, window.innerHeight - rect.top - 24);
      const nextScale = Math.min(
        rect.width / gridBaseWidth,
        availableHeight / gridBaseHeight,
      );
      setGridScale(Math.max(0.55, nextScale));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (scaleWrapperRef.current) observer.observe(scaleWrapperRef.current);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  const editingModule = useMemo(
    () =>
      editingId
        ? (installed.find((moduleInstance) => {
            return (moduleInstance._id ?? moduleInstance.meta.id) === editingId;
          }) ?? null)
        : null,
    [editingId, installed],
  );

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const index = await loadModulesIndex();
      const nextDefinitions: Record<
        string,
        {
          Component: ComponentType<{
            config: Record<string, unknown>;
            onConfigChange?: (config: Record<string, unknown>) => void;
          }>;
        }
      > = {};

      for (const moduleInstance of installed) {
        const entry = index.find(
          (item) => item.meta.id === moduleInstance.meta.id,
        );
        if (!entry) continue;

        const definition = await loadModuleDefinition(entry);
        nextDefinitions[moduleInstance.meta.id] = {
          Component: definition.Component,
        };
      }

      if (!cancelled) {
        setDefinitions(nextDefinitions);
      }
    })().catch((error) => {
      if (!cancelled) {
        console.error("Error loading grid definitions:", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [installed]);

  useEffect(() => {
    if (dragging) return;

    setPositions((previous) => {
      if (samePositionMap(previous, layoutAnalysis.positions)) {
        return previous;
      }

      positionsRef.current = layoutAnalysis.positions;
      return layoutAnalysis.positions;
    });
  }, [dragging, layoutAnalysis.positions]);

  const updatePosition = useCallback((id: string, nextPosition: GridCell) => {
    setPositions((previous) => {
      const current = previous[id];
      if (sameCell(current, nextPosition)) {
        return previous;
      }

      const next = {
        ...previous,
        [id]: nextPosition,
      };
      positionsRef.current = next;
      return next;
    });
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, id: string) => {
      const widget = gridRef.current?.querySelector<HTMLElement>(
        `[data-widget-id="${id}"]`,
      );
      const startPosition = positionsRef.current[id];

      if (!widget || !startPosition) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const rect = widget.getBoundingClientRect();
      event.currentTarget.setPointerCapture?.(event.pointerId);

      setDragging({
        id,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        startPosition,
      });
    },
    [],
  );

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragging.pointerId || !gridRef.current) {
        return;
      }

      const gridRect = gridRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / GRID_COLS;
      const cellHeight = gridRect.height / GRID_ROWS;
      const nextX = Math.floor(
        (event.clientX - gridRect.left - dragging.offsetX + cellWidth / 2) /
          cellWidth,
      );
      const nextY = Math.floor(
        (event.clientY - gridRect.top - dragging.offsetY + cellHeight / 2) /
          cellHeight,
      );

      const current = positionsRef.current[dragging.id];
      if (!current) {
        return;
      }

      const resolved =
        findNearestFreeCell(
          positionsRef.current,
          {
            ...current,
            x: nextX,
            y: nextY,
          },
          dragging.id,
        ) || dragging.startPosition;

      updatePosition(dragging.id, resolved);
    };

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== dragging.pointerId) {
        return;
      }

      const finalPosition = positionsRef.current[dragging.id];
      setDragging(null);

      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;

      if (
        finalPosition &&
        !sameCell(finalPosition, dragging.startPosition) &&
        onMove
      ) {
        const moduleName =
          installed.find(
            (moduleInstance) =>
              (moduleInstance._id ?? moduleInstance.meta.id) === dragging.id,
          )?.meta.name ?? "Widget";
        setLastMove({
          id: dragging.id,
          moduleName,
          from: dragging.startPosition,
          to: finalPosition,
        });
        onMove(dragging.id, finalPosition);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [dragging, installed, onMove, updatePosition]);

  const sortedItems = useMemo(() => {
    return [...installed]
      .filter((moduleInstance) =>
        Boolean(positions[moduleInstance._id ?? moduleInstance.meta.id]),
      )
      .sort((left, right) => {
        const leftId = left._id ?? left.meta.id;
        const rightId = right._id ?? right.meta.id;
        const leftPosition = positions[leftId] ?? { x: 0, y: 0, w: 1, h: 1 };
        const rightPosition = positions[rightId] ?? { x: 0, y: 0, w: 1, h: 1 };

        return (
          leftPosition.y - rightPosition.y || leftPosition.x - rightPosition.x
        );
      });
  }, [installed, positions]);

  async function handleRepairLayout() {
    if (!onRepairLayout || !layoutAnalysis.canRepair) {
      return;
    }

    setIsRepairing(true);
    try {
      await onRepairLayout();
    } finally {
      setIsRepairing(false);
    }
  }

  const handleUndoMove = useCallback(() => {
    if (!lastMove) return;

    updatePosition(lastMove.id, lastMove.from);
    onMove?.(lastMove.id, lastMove.from);
    setLastMove(null);
  }, [lastMove, onMove, updatePosition]);

  return (
    <SharedContextProvider>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {layoutAnalysis.needsRepair ? (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-900 dark:text-amber-100 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="size-4" />
                Layout attention needed
              </div>
              <p className="text-sm text-amber-800/90 dark:text-amber-100/90">
                {buildRepairMessage(
                  layoutAnalysis.movedModuleIds.length ||
                    layoutAnalysis.issues.length,
                  layoutAnalysis.unplacedModuleIds.length,
                )}
              </p>
            </div>

            {onRepairLayout ? (
              <Button
                variant="secondary"
                onClick={() => void handleRepairLayout()}
                disabled={isRepairing || !layoutAnalysis.canRepair}
              >
                <Wrench className="size-4" />
                {isRepairing ? "Repairing..." : "Repair layout"}
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {sortedItems.length} widget{sortedItems.length === 1 ? "" : "s"}
            </span>
            <span>
              {GRID_COLS}x{GRID_ROWS}
            </span>
            {lastMove ? <span>Moved {lastMove.moduleName}</span> : null}
          </div>
          {lastMove ? (
            <Button variant="outline" size="sm" onClick={handleUndoMove}>
              <Undo2 className="size-4" />
              Undo Move
            </Button>
          ) : null}
        </div>

        <div
          ref={scaleWrapperRef}
          className="w-full overflow-hidden"
          style={{ height: gridBaseHeight * gridScale }}
        >
          <div
            ref={gridRef}
            className="relative touch-none select-none overflow-hidden rounded-lg border border-border/70 bg-background shadow-inner"
            style={{
              width: gridBaseWidth,
              height: gridBaseHeight,
              transform: `scale(${gridScale})`,
              transformOrigin: "top left",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in srgb, hsl(var(--muted)) 70%, transparent), transparent 55%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
              }}
            >
              {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, index) => (
                <div
                  key={index}
                  className="border border-dashed border-border/55 bg-background/20"
                />
              ))}
            </div>

            {sortedItems.map((moduleInstance) => {
              const id = moduleInstance._id ?? moduleInstance.meta.id;
              const position = positions[id];
              const Definition = definitions[moduleInstance.meta.id]?.Component;
              const isDragging = dragging?.id === id;

              if (!position) {
                return null;
              }

              return (
                <div
                  key={id}
                  className="absolute p-2"
                  style={{
                    left: `calc(${position.x} / ${GRID_COLS} * 100%)`,
                    top: `calc(${position.y} / ${GRID_ROWS} * 100%)`,
                    width: `calc(${position.w} / ${GRID_COLS} * 100%)`,
                    height: `calc(${position.h} / ${GRID_ROWS} * 100%)`,
                    zIndex: isDragging ? 30 : 10,
                  }}
                >
                  <div
                    data-widget-id={id}
                    className={cn(
                      "group relative h-full w-full overflow-hidden rounded-lg border bg-background/95 shadow-sm transition-[border-color,box-shadow]",
                      isDragging
                        ? "border-primary/60 shadow-xl ring-2 ring-primary/25"
                        : "border-border/80 hover:border-primary/40 hover:shadow-md",
                    )}
                  >
                    <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md border border-border/70 bg-background/90 p-1 shadow-sm backdrop-blur-sm opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        className="cursor-grab active:cursor-grabbing"
                        title="Move widget"
                        aria-label={`Move ${moduleInstance.meta.name}`}
                        onPointerDown={(event) => handlePointerDown(event, id)}
                      >
                        <Grip className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        title="Edit widget"
                        aria-label={`Edit ${moduleInstance.meta.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingId(id);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        title="Delete widget"
                        aria-label={`Delete ${moduleInstance.meta.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove?.(id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="h-full w-full">
                      {Definition ? (
                        <WidgetErrorBoundary name={moduleInstance.meta.name}>
                          <Definition
                            config={moduleInstance.config}
                            onConfigChange={(config) => {
                              onUpdateConfig?.(id, config);
                            }}
                          />
                        </WidgetErrorBoundary>
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-zinc-500">
                          Loading...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {editingId && editingModule ? (
              <ModuleConfigModal
                key={`edit-${editingId}`}
                meta={editingModule.meta}
                open={Boolean(editingId)}
                onClose={() => setEditingId(null)}
                onSave={(config) => {
                  onUpdateConfig?.(editingId, config);
                  setEditingId(null);
                }}
                mode="edit"
                initialConfig={editingModule.config}
              />
            ) : null}
          </div>
        </div>
      </div>
    </SharedContextProvider>
  );
}
