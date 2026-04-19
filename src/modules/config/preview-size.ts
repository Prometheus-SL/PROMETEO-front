import type { ModuleSize } from "../types";

const GRID_CELL_WIDTH = 246;
const GRID_CELL_HEIGHT = 98.879;

export function resolveWidgetPreviewCanvasSize(size?: ModuleSize | null) {
  const width = Math.max(1, Math.round(size?.width ?? 2));
  const height = Math.max(1, Math.round(size?.height ?? 2));

  return {
    width: Number((width * GRID_CELL_WIDTH).toFixed(3)),
    height: Number((height * GRID_CELL_HEIGHT).toFixed(3)),
  };
}
