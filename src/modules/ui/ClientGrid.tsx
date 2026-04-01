import type { ComponentType } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { loadModuleDefinition, loadModulesIndex } from "@/modules/loader";
import type { InstalledModule } from "@/modules/types";

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
  pageId: string;
  onModuleConfigChange?: (
    pageId: string,
    moduleId: string,
    config: Record<string, unknown>
  ) => void;
};

type ModuleSlotProps = {
  pageId: string;
  module: InstalledModule;
  position: GridCell;
  Definition?: ModuleDefinitionEntry["Component"];
  onModuleConfigChange?: ClientGridProps["onModuleConfigChange"];
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
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.floor(value);
    }
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

const ModuleSlot = memo(function ModuleSlot({
  pageId,
  module,
  position,
  Definition,
  onModuleConfigChange,
}: ModuleSlotProps) {
  const moduleId = module._id;

  const handleConfigChange = useCallback(
    (newConfig: Record<string, unknown>) => {
      if (!moduleId || !onModuleConfigChange) return;
      onModuleConfigChange(pageId, moduleId, newConfig);
    },
    [moduleId, onModuleConfigChange, pageId]
  );

  return (
    <div
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
            onConfigChange={moduleId ? handleConfigChange : undefined}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Loading module...
          </div>
        )}
      </div>
    </div>
  );
});

function ClientGridComponent({
  modules,
  pageId,
  onModuleConfigChange,
}: ClientGridProps) {
  const [definitions, setDefinitions] = useState<
    Record<string, ModuleDefinitionEntry>
  >({});

  const moduleIds = useMemo(
    () => Array.from(new Set(modules.map((module) => module.meta.id))).sort(),
    [modules]
  );
  const moduleIdsKey = moduleIds.join("|");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const index = await loadModulesIndex();
        const entriesById = new Map(index.map((entry) => [entry.meta.id, entry]));

        const resolvedDefinitions = await Promise.all(
          moduleIds.map(async (moduleId) => {
            const entry = entriesById.get(moduleId);
            if (!entry) return null;
            const definition = await loadModuleDefinition(entry);
            return [
              moduleId,
              { Component: definition.Component } satisfies ModuleDefinitionEntry,
            ] as const;
          })
        );

        if (cancelled) return;

        const nextDefinitions = resolvedDefinitions.reduce<
          Record<string, ModuleDefinitionEntry>
        >((accumulator, entry) => {
          if (!entry) return accumulator;
          const [moduleId, definition] = entry;
          accumulator[moduleId] = definition;
          return accumulator;
        }, {});

        setDefinitions((previous) => ({ ...previous, ...nextDefinitions }));
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading module definitions:", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [moduleIds, moduleIdsKey]);

  const positions = useMemo(() => {
    const accumulator: Record<string, GridCell> = {};

    for (const module of modules) {
      const key = module._id ?? module.meta.id;
      const desired = getDesiredSize(module);
      const rawPosition = module.position ?? {
        x: 0,
        y: 0,
        w: desired.w,
        h: desired.h,
      };

      accumulator[key] = clampToGrid({
        ...rawPosition,
        w: desired.w,
        h: desired.h,
      });
    }

    return accumulator;
  }, [modules]);

  return (
    <div
      className="relative h-screen max-h-[80vh] w-screen select-none overflow-hidden rounded-md touch-none"
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
          <ModuleSlot
            key={key}
            pageId={pageId}
            module={module}
            position={position}
            Definition={Definition}
            onModuleConfigChange={onModuleConfigChange}
          />
        );
      })}
    </div>
  );
}

export const ClientGrid = memo(ClientGridComponent);
