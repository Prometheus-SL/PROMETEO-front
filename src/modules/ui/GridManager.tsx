import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Grip, Pencil, Trash2 } from "lucide-react";

import { SharedContextProvider } from "@/providers/SharedContextProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { loadModuleDefinition, loadModulesIndex } from "../loader";
import type { InstalledModule } from "../types";
import { ModuleConfigModal } from "./ModuleConfigModal";

type GridCell = { x: number; y: number; w: number; h: number };

interface GridManagerProps {
  installed: InstalledModule[];
  onRemove?: (id: string) => void;
  onMove?: (id: string, pos: GridCell) => void;
  onUpdateConfig?: (id: string, config: Record<string, unknown>) => void;
}

type DragState = {
  id: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startPosition: GridCell;
};

const COLS = 4;
const ROWS = 5;

function clampToGrid(position: GridCell): GridCell {
  return {
    x: Math.min(Math.max(0, position.x), COLS - Math.max(1, position.w)),
    y: Math.min(Math.max(0, position.y), ROWS - Math.max(1, position.h)),
    w: Math.min(Math.max(1, position.w), COLS),
    h: Math.min(Math.max(1, position.h), ROWS),
  };
}

function sameCell(left?: GridCell | null, right?: GridCell | null) {
  if (!left || !right) return false;
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.w === right.w &&
    left.h === right.h
  );
}

function samePositionMap(
  left: Record<string, GridCell>,
  right: Record<string, GridCell>
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => sameCell(left[key], right[key]));
}

function collides(left: GridCell, right: GridCell) {
  return !(
    left.x + left.w <= right.x ||
    right.x + right.w <= left.x ||
    left.y + left.h <= right.y ||
    right.y + right.h <= left.y
  );
}

function occupied(
  positions: Record<string, GridCell>,
  ignoreId?: string
): GridCell[] {
  return Object.entries(positions)
    .filter(([id]) => id !== ignoreId)
    .map(([, position]) => position);
}

function findNearestFreeCell(
  positions: Record<string, GridCell>,
  desired: GridCell,
  ignoreId?: string
): GridCell {
  const target = clampToGrid(desired);
  const taken = occupied(positions, ignoreId);

  if (!taken.some((item) => collides(item, target))) {
    return target;
  }

  let best = target;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let y = 0; y <= ROWS - target.h; y += 1) {
    for (let x = 0; x <= COLS - target.w; x += 1) {
      const candidate = { ...target, x, y };
      if (taken.some((item) => collides(item, candidate))) {
        continue;
      }

      const score =
        Math.abs(candidate.x - target.x) * 10 + Math.abs(candidate.y - target.y);

      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }

  return best;
}

function findFirstFreeCell(
  positions: Record<string, GridCell>,
  width = 1,
  height = 1,
  ignoreId?: string
) {
  return findNearestFreeCell(
    positions,
    { x: 0, y: 0, w: width, h: height },
    ignoreId
  );
}

function getDesiredSize(moduleInstance: InstalledModule): { w: number; h: number } {
  const config: Record<string, unknown> = moduleInstance.config ?? {};

  const toInt = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.floor(value);
    }
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
    }
    return undefined;
  };

  const rawSize = (config as { size?: unknown }).size;
  if (typeof rawSize === "string") {
    const match = rawSize.match(/^(\d+)x(\d+)$/i);
    if (match) {
      return {
        w: Math.max(1, Number(match[1])),
        h: Math.max(1, Number(match[2])),
      };
    }
  }

  const width =
    toInt((config as { w?: unknown }).w) ??
    toInt((config as { width?: unknown }).width);
  const height =
    toInt((config as { h?: unknown }).h) ??
    toInt((config as { height?: unknown }).height);

  if (width && height) {
    return { w: width, h: height };
  }

  const metaSize = moduleInstance.meta.size as
    | { width?: unknown; height?: unknown }
    | string
    | undefined;

  if (typeof metaSize === "string") {
    const match = metaSize.match(/^(\d+)x(\d+)$/i);
    if (match) {
      return {
        w: Math.max(1, Number(match[1])),
        h: Math.max(1, Number(match[2])),
      };
    }
  } else if (metaSize) {
    const metaWidth = toInt(metaSize.width);
    const metaHeight = toInt(metaSize.height);
    if (metaWidth && metaHeight) {
      return { w: metaWidth, h: metaHeight };
    }
  }

  return { w: 1, h: 1 };
}

function buildPositionMap(
  installed: InstalledModule[],
  previous: Record<string, GridCell>
) {
  const next: Record<string, GridCell> = {};

  for (const moduleInstance of installed) {
    const id = moduleInstance._id ?? moduleInstance.meta.id;
    const desired = getDesiredSize(moduleInstance);
    const preferred =
      moduleInstance.position ??
      previous[id] ??
      findFirstFreeCell(next, desired.w, desired.h);

    next[id] = findNearestFreeCell(
      next,
      clampToGrid({
        ...preferred,
        w: desired.w,
        h: desired.h,
      }),
      id
    );
  }

  return next;
}

export function GridManager({
  installed,
  onRemove,
  onMove,
  onUpdateConfig,
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

  const gridRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef<Record<string, GridCell>>({});

  const editingModule = useMemo(
    () =>
      editingId
        ? installed.find((moduleInstance) => {
            return (moduleInstance._id ?? moduleInstance.meta.id) === editingId;
          }) ?? null
        : null,
    [editingId, installed]
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
        const entry = index.find((item) => item.meta.id === moduleInstance.meta.id);
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
      const next = buildPositionMap(installed, previous);
      if (samePositionMap(previous, next)) {
        return previous;
      }

      positionsRef.current = next;
      return next;
    });
  }, [dragging, installed]);

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
        `[data-widget-id="${id}"]`
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
    []
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
      const cellWidth = gridRect.width / COLS;
      const cellHeight = gridRect.height / ROWS;
      const nextX = Math.floor(
        (event.clientX - gridRect.left - dragging.offsetX + cellWidth / 2) /
          cellWidth
      );
      const nextY = Math.floor(
        (event.clientY - gridRect.top - dragging.offsetY + cellHeight / 2) /
          cellHeight
      );

      const current = positionsRef.current[dragging.id];
      if (!current) {
        return;
      }

      const resolved = findNearestFreeCell(
        positionsRef.current,
        {
          ...current,
          x: nextX,
          y: nextY,
        },
        dragging.id
      );

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
    return [...installed].sort((left, right) => {
      const leftId = left._id ?? left.meta.id;
      const rightId = right._id ?? right.meta.id;
      const leftPosition = positions[leftId] ?? { x: 0, y: 0, w: 1, h: 1 };
      const rightPosition = positions[rightId] ?? { x: 0, y: 0, w: 1, h: 1 };

      return leftPosition.y - rightPosition.y || leftPosition.x - rightPosition.x;
    });
  }, [installed, positions]);

  return (
    <SharedContextProvider>
      <div
        ref={gridRef}
        className="relative mx-auto h-[500px] w-full max-w-[1024px] touch-none select-none overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div
          className="pointer-events-none absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {Array.from({ length: COLS * ROWS }).map((_, index) => (
            <div
              key={index}
              className="border border-dashed border-zinc-200 dark:border-zinc-800"
            />
          ))}
        </div>

        {sortedItems.map((moduleInstance) => {
          const id = moduleInstance._id ?? moduleInstance.meta.id;
          const position = positions[id] ?? { x: 0, y: 0, w: 1, h: 1 };
          const Definition = definitions[moduleInstance.meta.id]?.Component;
          const isDragging = dragging?.id === id;

          return (
            <div
              key={id}
              className="absolute p-2"
              style={{
                left: `calc(${position.x} / ${COLS} * 100%)`,
                top: `calc(${position.y} / ${ROWS} * 100%)`,
                width: `calc(${position.w} / ${COLS} * 100%)`,
                height: `calc(${position.h} / ${ROWS} * 100%)`,
                zIndex: isDragging ? 30 : 10,
              }}
            >
              <div
                data-widget-id={id}
                className={cn(
                  "group relative h-full w-full overflow-hidden rounded-lg border bg-background shadow-sm transition-shadow",
                  isDragging
                    ? "border-primary/60 shadow-xl ring-2 ring-primary/25"
                    : "border-border hover:shadow-md"
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
    </SharedContextProvider>
  );
}
