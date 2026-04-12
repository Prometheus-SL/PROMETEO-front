import type { InstalledModule, ModuleMeta } from "./types";

export const GRID_COLS = 4;
export const GRID_ROWS = 5;

export type GridCell = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LayoutIssueType =
  | "missing-position"
  | "adjusted-position"
  | "collision"
  | "no-space";

export type LayoutIssue = {
  moduleId: string;
  moduleName: string;
  type: LayoutIssueType;
};

export type LayoutAnalysis = {
  positions: Record<string, GridCell>;
  issues: LayoutIssue[];
  movedModuleIds: string[];
  unplacedModuleIds: string[];
  needsRepair: boolean;
  canRepair: boolean;
};

type ModuleLike = Pick<InstalledModule, "_id" | "meta" | "config" | "position">;

export function getModuleInstanceId(moduleInstance: Pick<InstalledModule, "_id" | "meta">) {
  return moduleInstance._id ?? moduleInstance.meta.id;
}

export function clampToGrid(position: GridCell): GridCell {
  return {
    x: Math.min(Math.max(0, position.x), GRID_COLS - Math.max(1, position.w)),
    y: Math.min(Math.max(0, position.y), GRID_ROWS - Math.max(1, position.h)),
    w: Math.min(Math.max(1, position.w), GRID_COLS),
    h: Math.min(Math.max(1, position.h), GRID_ROWS),
  };
}

export function sameCell(left?: GridCell | null, right?: GridCell | null) {
  if (!left || !right) return false;
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.w === right.w &&
    left.h === right.h
  );
}

export function collides(left: GridCell, right: GridCell) {
  return !(
    left.x + left.w <= right.x ||
    right.x + right.w <= left.x ||
    left.y + left.h <= right.y ||
    right.y + right.h <= left.y
  );
}

function occupied(
  positions: Record<string, GridCell>,
  ignoreId?: string,
): GridCell[] {
  return Object.entries(positions)
    .filter(([id]) => id !== ignoreId)
    .map(([, position]) => position);
}

function readInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
  }

  return undefined;
}

export function getDesiredSize(
  moduleInstance: Pick<InstalledModule, "meta" | "config"> | {
    meta: ModuleMeta;
    config?: Record<string, unknown>;
  },
  configOverride?: Record<string, unknown>,
): { w: number; h: number } {
  const config = configOverride ?? moduleInstance.config ?? {};

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
    readInteger((config as { w?: unknown }).w) ??
    readInteger((config as { width?: unknown }).width);
  const height =
    readInteger((config as { h?: unknown }).h) ??
    readInteger((config as { height?: unknown }).height);

  if (width && height) {
    return { w: width, h: height };
  }

  const metaSize = moduleInstance.meta.size;
  if (metaSize) {
    return {
      w: Math.max(1, readInteger(metaSize.width) ?? 1),
      h: Math.max(1, readInteger(metaSize.height) ?? 1),
    };
  }

  return { w: 1, h: 1 };
}

function normalizePreferredPosition(moduleInstance: ModuleLike): GridCell {
  const desiredSize = getDesiredSize(moduleInstance);
  const raw = moduleInstance.position;

  return clampToGrid({
    x: readInteger(raw?.x) ?? 0,
    y: readInteger(raw?.y) ?? 0,
    w: desiredSize.w,
    h: desiredSize.h,
  });
}

export function findNearestFreeCell(
  positions: Record<string, GridCell>,
  desired: GridCell,
  ignoreId?: string,
): GridCell | null {
  const target = clampToGrid(desired);
  const taken = occupied(positions, ignoreId);

  if (!taken.some((item) => collides(item, target))) {
    return target;
  }

  let best: GridCell | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let y = 0; y <= GRID_ROWS - target.h; y += 1) {
    for (let x = 0; x <= GRID_COLS - target.w; x += 1) {
      const candidate = { ...target, x, y };
      if (taken.some((item) => collides(item, candidate))) {
        continue;
      }

      const score =
        Math.abs(candidate.x - target.x) * 10 +
        Math.abs(candidate.y - target.y);

      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }

  return best;
}

export function findFirstFreeCell(
  positions: Record<string, GridCell>,
  width = 1,
  height = 1,
  ignoreId?: string,
) {
  return findNearestFreeCell(
    positions,
    { x: 0, y: 0, w: width, h: height },
    ignoreId,
  );
}

export function analyzeInstalledModules(modules: InstalledModule[]): LayoutAnalysis {
  const positions: Record<string, GridCell> = {};
  const rawPositions: Array<{ id: string; position: GridCell }> = [];
  const issues: LayoutIssue[] = [];
  const movedModuleIds: string[] = [];
  const unplacedModuleIds: string[] = [];

  for (const moduleInstance of modules) {
    const id = getModuleInstanceId(moduleInstance);
    const preferred = normalizePreferredPosition(moduleInstance);
    const moduleName = moduleInstance.meta.name;

    if (!moduleInstance.position) {
      issues.push({
        moduleId: id,
        moduleName,
        type: "missing-position",
      });
    } else if (
      !sameCell(moduleInstance.position, preferred) ||
      moduleInstance.position.w !== preferred.w ||
      moduleInstance.position.h !== preferred.h
    ) {
      issues.push({
        moduleId: id,
        moduleName,
        type: "adjusted-position",
      });
    }

    if (rawPositions.some((item) => collides(item.position, preferred))) {
      issues.push({
        moduleId: id,
        moduleName,
        type: "collision",
      });
    }

    rawPositions.push({ id, position: preferred });

    const resolved = findNearestFreeCell(positions, preferred, id);
    if (!resolved) {
      unplacedModuleIds.push(id);
      issues.push({
        moduleId: id,
        moduleName,
        type: "no-space",
      });
      continue;
    }

    positions[id] = resolved;

    if (!sameCell(resolved, preferred)) {
      movedModuleIds.push(id);
    }
  }

  const needsRepair =
    issues.length > 0 ||
    movedModuleIds.length > 0 ||
    unplacedModuleIds.length > 0;

  return {
    positions,
    issues,
    movedModuleIds,
    unplacedModuleIds,
    needsRepair,
    canRepair: needsRepair && unplacedModuleIds.length === 0,
  };
}

export function getCandidatePlacement(
  modules: InstalledModule[],
  moduleMeta: ModuleMeta,
  config: Record<string, unknown>,
) {
  const analysis = analyzeInstalledModules(modules);
  const size = getDesiredSize({ meta: moduleMeta, config });

  if (analysis.unplacedModuleIds.length > 0) {
    return {
      analysis,
      size,
      position: null,
    };
  }

  return {
    analysis,
    size,
    position: findFirstFreeCell(analysis.positions, size.w, size.h),
  };
}
