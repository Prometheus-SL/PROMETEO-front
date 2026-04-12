import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Grip, Pencil, Sparkles, Trash2, Wrench } from "lucide-react";

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

function buildRepairMessage(
  repairCount: number,
  hiddenCount: number,
) {
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

  const gridRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef<Record<string, GridCell>>({});

  const layoutAnalysis = useMemo(
    () => analyzeInstalledModules(installed),
    [installed],
  );

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
  }, [dragging, onMove, updatePosition]);

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

  return (
    <SharedContextProvider>
      <div className="space-y-4">
        {layoutAnalysis.needsRepair ? (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-900 dark:text-amber-100 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="size-4" />
                Layout attention needed
              </div>
              <p className="text-sm text-amber-800/90 dark:text-amber-100/90">
                {buildRepairMessage(
                  layoutAnalysis.movedModuleIds.length || layoutAnalysis.issues.length,
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

        <div
          ref={gridRef}
          className="relative mx-auto h-[500px] w-full max-w-[1024px] touch-none select-none overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
        >
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
                className="border border-dashed border-zinc-200 dark:border-zinc-800"
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
                    "group relative h-full w-full overflow-hidden rounded-lg border bg-background shadow-sm transition-shadow",
                    isDragging
                      ? "border-primary/60 shadow-xl ring-2 ring-primary/25"
                      : "border-border hover:shadow-md",
                  )}
                >
                  <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md bg-background/90 p-1 shadow-sm backdrop-blur-sm">
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      className="cursor-grab active:cursor-grabbing"
                      title="Move widget"
                      onPointerDown={(event) => handlePointerDown(event, id)}
                    >
                      <Grip className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      title="Edit widget"
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
                      <Definition
                        config={moduleInstance.config}
                        onConfigChange={(config) => {
                          onUpdateConfig?.(id, config);
                        }}
                      />
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
    </SharedContextProvider>
  );
}
