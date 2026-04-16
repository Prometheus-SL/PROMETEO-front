import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ModuleSize } from "@/modules/types";

import { resolveModuleCanvasSize } from "./helpers";
import type { ModuleDevCanvasMode } from "./types";

export const ModuleDevCanvas = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    className?: string;
    mode?: ModuleDevCanvasMode;
    size?: ModuleSize | null;
  }
>(function ModuleDevCanvas({ children, className, mode = "fit", size }, ref) {
  const canvasSize = resolveModuleCanvasSize(size);
  const style =
    mode === "fit"
      ? {
          width: `min(100%, ${canvasSize.width}px)`,
          aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
        }
      : {
          width: canvasSize.width,
          minWidth: canvasSize.width,
          height: canvasSize.height,
        };

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-[28px] border border-border/60 bg-background/85 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)] backdrop-blur",
          className,
        )}
        style={style}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_32%)]" />
        <div className="relative h-full w-full overflow-hidden p-2">
          <div
            className="h-full w-full overflow-hidden rounded-[22px]"
            ref={ref}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});
