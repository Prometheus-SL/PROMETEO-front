import { analyzeInstalledModules, GRID_COLS, GRID_ROWS } from "./grid-layout";
import type { Page, PageSummary } from "./types";

export type DashboardEditorStats = {
  moduleCount: number;
  occupiedCells: number;
  totalCells: number;
  occupancyPercent: number;
  needsRepair: boolean;
  canRepair: boolean;
};

export function sortDashboardPages(pages: Page[]) {
  return [...pages].sort((a, b) => a.order - b.order);
}

export function getClientDashboardPages<T extends PageSummary>(pages: T[]): T[] {
  return [...pages]
    .filter((page) => page.active)
    .sort((a, b) => a.order - b.order);
}

export function selectClientInitialPage<T extends PageSummary>(
  pages: T[],
): T | null {
  const visiblePages = getClientDashboardPages(pages);
  return (
    visiblePages.find((page) => page.principal) ?? visiblePages[0] ?? null
  );
}

export function reorderDashboardPageIds(
  orderedIds: string[],
  draggedId: string,
  targetId: string,
): string[] {
  if (draggedId === targetId) return orderedIds;

  const fromIndex = orderedIds.indexOf(draggedId);
  const toIndex = orderedIds.indexOf(targetId);
  if (fromIndex < 0 || toIndex < 0) return orderedIds;

  const next = [...orderedIds];
  const [dragged] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, dragged);
  return next;
}

export function selectDashboardPage(
  pages: Page[],
  preferredPageId?: string,
): Page | null {
  const sortedPages = sortDashboardPages(pages);
  const preferred = preferredPageId
    ? sortedPages.find((page) => page._id === preferredPageId)
    : null;

  return (
    preferred ??
    sortedPages.find((page) => page.principal) ??
    sortedPages.find((page) => page.active) ??
    sortedPages[0] ??
    null
  );
}

export function getDashboardEditorStats(
  page: Page | null | undefined,
): DashboardEditorStats {
  const totalCells = GRID_COLS * GRID_ROWS;
  if (!page) {
    return {
      moduleCount: 0,
      occupiedCells: 0,
      totalCells,
      occupancyPercent: 0,
      needsRepair: false,
      canRepair: false,
    };
  }

  const layoutAnalysis = analyzeInstalledModules(page.modules);
  const occupiedCells = Object.values(layoutAnalysis.positions).reduce(
    (total, position) => total + position.w * position.h,
    0,
  );

  return {
    moduleCount: page.modules.length,
    occupiedCells,
    totalCells,
    occupancyPercent: Math.round((occupiedCells / totalCells) * 100),
    needsRepair: layoutAnalysis.needsRepair,
    canRepair: layoutAnalysis.canRepair,
  };
}
