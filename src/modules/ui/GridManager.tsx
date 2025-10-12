import { useEffect, useMemo, useRef, useState } from "react";
import type { InstalledModule } from "../types";
import { loadModulesIndex, loadModuleDefinition } from "../loader";
import { Button } from "@/components/ui/button";
import { ModuleConfigModal } from "./ModuleConfigModal";

type GridCell = { x: number; y: number; w: number; h: number };

interface GridManagerProps {
  installed: InstalledModule[];
  onRemove?: (id: string) => void; // id de instancia (_id) o meta.id si no existe
  onMove?: (id: string, pos: GridCell) => void; // id de instancia (_id) o meta.id si no existe
  onUpdateConfig?: (id: string, config: Record<string, unknown>) => void;
}

// Tamaño del lienzo: 4 columnas x 5 filas
const COLS = 4;
const ROWS = 5;

// Helpers fuera del componente para no afectar dependencias de hooks
function clampToGrid(p: GridCell): GridCell {
  return {
    x: Math.min(Math.max(0, p.x), COLS - Math.max(1, p.w)),
    y: Math.min(Math.max(0, p.y), ROWS - Math.max(1, p.h)),
    w: Math.min(Math.max(1, p.w), COLS),
    h: Math.min(Math.max(1, p.h), ROWS),
  };
}

function collides(a: GridCell, b: GridCell) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function occupied(map: Record<string, GridCell>, ignoreId?: string) {
  const cells: GridCell[] = [];
  for (const [id, p] of Object.entries(map)) {
    if (id === ignoreId) continue;
    cells.push(p);
  }
  return cells;
}

function findFirstFree(map: Record<string, GridCell>, w = 1, h = 1): GridCell {
  const taken = occupied(map);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const candidate = clampToGrid({ x, y, w, h });
      if (!taken.some((p) => collides(p, candidate))) return candidate;
    }
  }
  // Si no hay hueco, colócalo arriba a la izquierda con clamp aplicado
  return clampToGrid({ x: 0, y: 0, w, h });
}

// Obtiene el tamaño deseado del módulo a partir de su configuración o metadata
function getDesiredSize(inst: InstalledModule): { w: number; h: number } {
  const cfg: Record<string, unknown> = inst.config ?? {};

  const toInt = (val: unknown): number | undefined => {
    if (typeof val === "number") return Math.floor(val);
    if (typeof val === "string") {
      const n = parseInt(val, 10);
      return Number.isFinite(n) ? Math.floor(n) : undefined;
    }
    return undefined;
  };

  // 1) config.size como "2x3"
  const sizeRaw: unknown = (cfg as { size?: unknown }).size;
  if (typeof sizeRaw === "string") {
    const m = /^(\d+)x(\d+)$/i.exec(sizeRaw);
    if (m) {
      return { w: Math.max(1, Number(m[1])), h: Math.max(1, Number(m[2])) };
    }
  }
  // 2) config.w / config.h numéricos o strings numéricos
  const wNum = toInt((cfg as { w?: unknown }).w);
  const hNum = toInt((cfg as { h?: unknown }).h);
  if (wNum && hNum && wNum > 0 && hNum > 0) {
    return { w: wNum, h: hNum };
  }
  // 3) config.width / config.height
  const widthNum = toInt((cfg as { width?: unknown }).width);
  const heightNum = toInt((cfg as { height?: unknown }).height);
  if (widthNum && heightNum && widthNum > 0 && heightNum > 0) {
    return { w: widthNum, h: heightNum };
  }
  // 4) meta.size como objeto { width, height } (según tipos)
  const metaSize = inst.meta.size as
    | { width?: unknown; height?: unknown }
    | string
    | undefined;
  if (metaSize) {
    // Soportar defensivamente string "2x2"
    if (typeof metaSize === "string") {
      const m = /^(\d+)x(\d+)$/i.exec(metaSize);
      if (m) {
        return { w: Math.max(1, Number(m[1])), h: Math.max(1, Number(m[2])) };
      }
    } else {
      const mw = toInt(metaSize.width);
      const mh = toInt(metaSize.height);
      if (mw && mh && mw > 0 && mh > 0) {
        return { w: mw, h: mh };
      }
    }
  }
  // 5) por defecto 1x1
  return { w: 1, h: 1 };
}

export function GridManager({
  installed,
  onRemove,
  onMove,
  onUpdateConfig,
}: GridManagerProps) {
  const [defs, setDefs] = useState<
    Record<
      string,
      { Component: React.ComponentType<{ config: Record<string, unknown> }> }
    >
  >({});

  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [positions, setPositions] = useState<Record<string, GridCell>>({});
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingInst = useMemo(
    () =>
      editingId
        ? installed.find((m) => (m._id ?? m.meta.id) === editingId)
        : null,
    [editingId, installed]
  );

  // Cargar componentes dinámicos
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const index = await loadModulesIndex();
      const map: Record<
        string,
        { Component: React.ComponentType<{ config: Record<string, unknown> }> }
      > = {};
      for (const item of installed) {
        const entry = index.find((e) => e.meta.id === item.meta.id);
        if (!entry) continue;
        const def = await loadModuleDefinition(entry);
        map[item.meta.id] = { Component: def.Component };
      }
      if (!cancelled) setDefs(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [installed]);

  // Inicializar/mantener posiciones locales basadas en installed.position
  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      for (const i of installed) {
        const key = i._id ?? i.meta.id;
        const desired = getDesiredSize(i);
        const current = next[key];
        // Partimos de la posición guardada o de un hueco nuevo, pero siempre con el tamaño deseado
        let candidate: GridCell = clampToGrid({
          ...(i.position ??
            current ?? { x: 0, y: 0, w: desired.w, h: desired.h }),
          w: desired.w,
          h: desired.h,
        });
        // Si colisiona, buscamos un hueco libre con ese tamaño
        const others = occupied(next, key);
        if (others.some((p) => collides(p, candidate))) {
          candidate = findFirstFree(next, desired.w, desired.h);
        }
        next[key] = candidate;
      }
      return next;
    });
  }, [installed]);

  // Utils grid (ahora importadas del scope superior)

  // DnD handlers
  function handlePointerDown(e: React.PointerEvent, id: string) {
    // Buscar el contenedor del widget para calcular el offset correcto
    const container = gridRef.current?.querySelector<HTMLElement>(
      `[data-widget-id="${id}"]`
    );
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setDragging({
      id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || !gridRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / COLS;
    const cellHeight = gridRect.height / ROWS;
    const x = Math.floor(
      (e.clientX - gridRect.left - dragging.offsetX + cellWidth / 2) / cellWidth
    );
    const y = Math.floor(
      (e.clientY - gridRect.top - dragging.offsetY + cellHeight / 2) /
        cellHeight
    );

    setPositions((prev) => {
      const current = prev[dragging.id] ?? { x: 0, y: 0, w: 1, h: 1 };
      const next = clampToGrid({ ...current, x, y });
      // Evitar colisiones simples empujando hacia abajo
      const others = occupied(prev, dragging.id);
      const adjusted = { ...next };
      let safety = 0;
      while (
        others.some((p) => collides(p, adjusted)) &&
        safety < ROWS * COLS
      ) {
        adjusted.y = Math.min(adjusted.y + 1, ROWS - adjusted.h);
        safety++;
      }
      return { ...prev, [dragging.id]: adjusted };
    });
  }

  function handlePointerUp() {
    if (!dragging) return;
    const id = dragging.id;
    setDragging(null);
    const pos = positions[id];
    if (pos && onMove) onMove(id, pos);
  }

  // Orden de render por fila/columna
  const items = useMemo(() => {
    return [...installed].sort((a, b) => {
      const ka = a._id ?? a.meta.id;
      const kb = b._id ?? b.meta.id;
      const pa = positions[ka] ?? { x: 0, y: 0, w: 1, h: 1 };
      const pb = positions[kb] ?? { x: 0, y: 0, w: 1, h: 1 };
      return pa.y - pb.y || pa.x - pb.x;
    });
  }, [installed, positions]);

  return (
    <div
      ref={gridRef}
      className="relative w-full select-none h-screen max-h-[75vh] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden touch-none"
      style={{ aspectRatio: `${COLS}/${ROWS}` }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Lienzo base con fondo cuadriculado sutil */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, idx) => (
          <div
            key={idx}
            className="border border-dashed border-zinc-200 dark:border-zinc-800"
          />
        ))}
      </div>

      {/* Widgets posicionados absolutamente */}
      {items.map((i) => {
        const key = i._id ?? i.meta.id;
        const pos = positions[key] ?? { x: 0, y: 0, w: 1, h: 1 };
        const Def = defs[i.meta.id]?.Component;
        return (
          <div
            key={key}
            className="absolute p-2"
            style={{
              left: `calc(${pos.x} / ${COLS} * 100%)`,
              top: `calc(${pos.y} / ${ROWS} * 100%)`,
              width: `calc(${pos.w} / ${COLS} * 100%)`,
              height: `calc(${pos.h} / ${ROWS} * 100%)`,
            }}
          >
            <div
              className="h-full w-full shadow-sm overflow-hidden group relative"
              data-widget-id={key}
            >
              {/* Barra de acciones */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 cursor-grab active:cursor-grabbing"
                  title="Move"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePointerDown(e, key);
                  }}
                >
                  ≡
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 cursor-pointer"
                  title="Edit configuration"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(key);
                  }}
                >
                  ✎
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7 cursor-pointer"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.(key);
                  }}
                >
                  ×
                </Button>
              </div>
              <div className="h-full w-full">
                {Def ? (
                  <Def config={i.config} />
                ) : (
                  <div className="h-full grid place-items-center text-sm text-zinc-500">
                    Loading...
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Modal de edición de configuración */}
      {editingId && editingInst && (
        <ModuleConfigModal
          key={`edit-${editingId}`}
          meta={editingInst.meta}
          open={!!editingId}
          onClose={() => setEditingId(null)}
          onSave={(config) => {
            onUpdateConfig?.(editingId, config);
            setEditingId(null);
          }}
          mode="edit"
          initialConfig={editingInst.config}
        />
      )}
    </div>
  );
}
