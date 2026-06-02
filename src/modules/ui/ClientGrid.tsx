import type { ComponentType } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { useAuthContext } from "@/providers/AuthProvider";
import { getModuleAvailability } from "@/modules/access";
import { loadModuleDefinition, loadModulesIndex } from "@/modules/loader";
import {
  analyzeInstalledModules,
  GRID_COLS,
  GRID_ROWS,
  type GridCell,
} from "@/modules/grid-layout";
import type { InstalledModule } from "@/modules/types";
import { WidgetErrorBoundary } from "@/modules/ui/WidgetErrorBoundary";

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
    config: Record<string, unknown>,
  ) => void;
};

type ModuleSlotProps = {
  pageId: string;
  module: InstalledModule;
  position: GridCell;
  Definition?: ModuleDefinitionEntry["Component"];
  onModuleConfigChange?: ClientGridProps["onModuleConfigChange"];
};

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
    [moduleId, onModuleConfigChange, pageId],
  );

  return (
    <div
      className="absolute p-2"
      style={{
        left: `calc(${position.x} / ${GRID_COLS} * 100%)`,
        top: `calc(${position.y} / ${GRID_ROWS} * 100%)`,
        width: `calc(${position.w} / ${GRID_COLS} * 100%)`,
        height: `calc(${position.h} / ${GRID_ROWS} * 100%)`,
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-background shadow">
        {Definition ? (
          <WidgetErrorBoundary name={module.meta.name}>
            <Definition
              config={module.config}
              onConfigChange={moduleId ? handleConfigChange : undefined}
            />
          </WidgetErrorBoundary>
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
  const { user } = useAuthContext();
  const [definitions, setDefinitions] = useState<
    Record<string, ModuleDefinitionEntry>
  >({});

  const moduleIds = useMemo(
    () => Array.from(new Set(modules.map((module) => module.meta.id))).sort(),
    [modules],
  );
  const moduleIdsKey = moduleIds.join("|");

  const layoutAnalysis = useMemo(
    () => analyzeInstalledModules(modules),
    [modules],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const index = await loadModulesIndex();
        const entriesById = new Map(
          index.map((entry) => [entry.meta.id, entry]),
        );

        const resolvedDefinitions = await Promise.all(
          moduleIds.map(async (moduleId) => {
            const entry = entriesById.get(moduleId);
            if (!entry) return null;
            const definition = await loadModuleDefinition(entry);
            return [
              moduleId,
              {
                Component: definition.Component,
              } satisfies ModuleDefinitionEntry,
            ] as const;
          }),
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

  const visibleModules = useMemo(() => {
    return modules.filter((module) => {
      const availability = getModuleAvailability(module.meta, {
        surface: "client",
        role: user?.role,
      });

      return (
        availability.isVisibleOnSurface &&
        availability.hasRequiredRole &&
        Boolean(layoutAnalysis.positions[module._id ?? module.meta.id])
      );
    });
  }, [layoutAnalysis.positions, modules, user?.role]);

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-hidden">
      {layoutAnalysis.needsRepair ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {layoutAnalysis.unplacedModuleIds.length > 0
            ? `This dashboard has ${layoutAnalysis.unplacedModuleIds.length} widget${layoutAnalysis.unplacedModuleIds.length === 1 ? "" : "s"} that no longer fit in the grid. Open Dashboards to remove or repair them.`
            : "This dashboard layout was auto-adjusted to avoid overlaps. Open Dashboards to repair it permanently."}
        </div>
      ) : null}

      <div className="relative min-h-0 w-full flex-1 select-none overflow-hidden rounded-md touch-none my-2">
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          }}
        >
          {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, index) => (
            <div key={index} className="border-zinc-200 dark:border-zinc-800" />
          ))}
        </div>
        {visibleModules.map((module) => {
          const key = module._id ?? module.meta.id;
          const position = layoutAnalysis.positions[key];
          const Definition = definitions[module.meta.id]?.Component;

          if (!position) {
            return null;
          }

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
    </div>
  );
}

export const ClientGrid = memo(ClientGridComponent);
