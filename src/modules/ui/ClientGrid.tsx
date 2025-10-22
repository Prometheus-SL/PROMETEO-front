import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import type { InstalledModule } from "@/modules/types";
import { loadModulesIndex, loadModuleDefinition } from "@/modules/loader";

const COLS = 4;
const ROWS = 5;

type GridCell = { x: number; y: number; w: number; h: number };

type ModuleDefinitionEntry = {
  Component: ComponentType<{
    config: Record<string, unknown>;
    onConfigChange?: (config: Record<string, unknown>) => void;
  }>;
};

type ClientGridProps = {
  modules: InstalledModule[];
  pageId?: string; // ID de la página para guardar cambios (opcional, solo para logging)
  onModuleConfigChange?: (
    moduleId: string,
    config: Record<string, unknown>
  ) => void;
};

function clampToGrid(cell: GridCell): GridCell {
  return {
    x: Math.min(Math.max(0, cell.x), COLS - Math.max(1, cell.w)),
    y: Math.min(Math.max(0, cell.y), ROWS - Math.max(1, cell.h)),
    w: Math.min(Math.max(1, cell.w), COLS),
    h: Math.min(Math.max(1, cell.h), ROWS),
  };
}

function getDesiredSize(inst: InstalledModule): { w: number; h: number } {
  const cfg = inst.config ?? {};

  const parseIntSafe = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value))
      return Math.floor(value);
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
    }
    return undefined;
  };

  const rawSize = (cfg as { size?: unknown }).size;
  if (typeof rawSize === "string") {
    const match = rawSize.match(/^(\d+)x(\d+)$/i);
    if (match) {
      return {
        w: Math.max(1, Number(match[1])),
        h: Math.max(1, Number(match[2])),
      };
    }
  }

  const w = parseIntSafe(
    (cfg as { w?: unknown }).w ?? (cfg as { width?: unknown }).width
  );
  const h = parseIntSafe(
    (cfg as { h?: unknown }).h ?? (cfg as { height?: unknown }).height
  );
  if (w && h) {
    return { w, h };
  }

  const metaSize = inst.meta.size as
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
    const metaW = parseIntSafe(metaSize.width);
    const metaH = parseIntSafe(metaSize.height);
    if (metaW && metaH) {
      return { w: metaW, h: metaH };
    }
  }

  return { w: 1, h: 1 };
}

export function ClientGrid({ modules, onModuleConfigChange }: ClientGridProps) {
  const [definitions, setDefinitions] = useState<
    Record<string, ModuleDefinitionEntry>
  >({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const index = await loadModulesIndex();
        const map: Record<string, ModuleDefinitionEntry> = {};
        for (const module of modules) {
          const entry = index.find((item) => item.meta.id === module.meta.id);
          if (!entry) continue;
          const def = await loadModuleDefinition(entry);
          map[module.meta.id] = { Component: def.Component };
        }
        if (!cancelled) {
          setDefinitions(map);
        }
      } catch {
        if (!cancelled) {
          setDefinitions({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modules]);

  const positions = useMemo(() => {
    const acc: Record<string, GridCell> = {};
    for (const module of modules) {
      const key = module._id ?? module.meta.id;
      const desired = getDesiredSize(module);
      const raw = module.position ?? { x: 0, y: 0, w: desired.w, h: desired.h };
      acc[key] = clampToGrid({ ...raw, w: desired.w, h: desired.h });
    }
    return acc;
  }, [modules]);

  return (
    <div
      className="relative w-screen select-none h-screen max-h-[80vh] rounded-md overflow-hidden touch-none"
      style={{ aspectRatio: `${COLS}/${ROWS}` }}
    >
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, index) => (
          <div key={index} className="border-zinc-200 dark:border-zinc-800" />
        ))}
      </div>
      {modules.map((module) => {
        const key = module._id ?? module.meta.id;
        const position = positions[key] ?? { x: 0, y: 0, w: 1, h: 1 };
        const Definition = definitions[module.meta.id]?.Component;
        return (
          <div
            key={key}
            className="absolute p-2"
            style={{
              left: `calc(${position.x} / ${COLS} * 100%)`,
              top: `calc(${position.y} / ${ROWS} * 100%)`,
              width: `calc(${position.w} / ${COLS} * 100%)`,
              height: `calc(${position.h} / ${ROWS} * 100%)`,
            }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-lg bg-background shadow">
              {Definition ? (
                <Definition
                  config={module.config}
                  onConfigChange={
                    onModuleConfigChange
                      ? (newConfig) => {
                          const moduleId = module._id;
                          if (moduleId) {
                            onModuleConfigChange(moduleId, newConfig);
                          }
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  Loading module…
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
