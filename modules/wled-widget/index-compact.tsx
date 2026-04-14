import { useState } from "react";
import { Lightbulb, Loader2, Power, RefreshCw } from "lucide-react";

import TallHorizontalSlider from "@/components/ui/big-slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  WidgetContent,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";

import { useWledController } from "./useWledController";
import WledControlModal from "./WledControlModal";

/* ── WLED Compact  (2 × 1) ───────────────────────────────────────── */

export default function WledCompactWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const ctrl = useWledController(config, "wled-compact");
  const [modalOpen, setModalOpen] = useState(false);

  /* ── guard states ──────────────────────────────────────────────── */

  if (!ctrl.deviceIp) {
    return (
      <WidgetShell accent="amber">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="amber"
            tone="warning"
            icon={<Lightbulb className="size-5" />}
            title="WLED"
            message="Configura la IP del dispositivo WLED."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (ctrl.loading) {
    return (
      <WidgetShell accent="amber">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="amber"
            tone="info"
            icon={<RefreshCw className="size-5 animate-spin" />}
            title="WLED"
            message="Conectando…"
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (ctrl.error && !ctrl.wledState) {
    return (
      <WidgetShell accent="rose">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="rose"
            tone="danger"
            icon={<Power className="size-5" />}
            title="No se pudo conectar"
            message={ctrl.error}
            action={
              <Button
                type="button"
                variant="secondary"
                className="h-9 rounded-lg px-4"
                onClick={() => void ctrl.fetchState()}
              >
                Reintentar
              </Button>
            }
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (!ctrl.wledState) return null;

  /* ── main render ───────────────────────────────────────────────── */

  return (
    <>
      <WidgetShell accent={ctrl.accent}>
        <WidgetContent className="flex h-full items-stretch gap-2 px-1.5 pt-1.5 pb-1.5">
          {/* ── left column: name + slider ────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/90">
                <Lightbulb className="size-4" />
              </div>
              <p className="truncate text-[0.95rem] font-semibold">
                {ctrl.deviceName}
              </p>
              <WidgetStatus
                tone={ctrl.isOn ? "success" : "neutral"}
                className="h-4 px-1.5 text-[8px]"
              >
                {ctrl.isOn ? "On" : "Off"}
              </WidgetStatus>
            </div>

            <div className="mx-2 mt-1.5">
              <TallHorizontalSlider
                min={1}
                max={255}
                value={ctrl.brightness}
                onChange={(value) => {
                  ctrl.setBrightnessDraft(value);
                  ctrl.scheduleBrightnessUpdate(value);
                }}
                theme="custom"
                customTheme={{
                  track: "bg-muted border border-border",
                  fill: "",
                  thumb:
                    "bg-background border border-amber-200 dark:border-amber-800 shadow-sm",
                  thumbRing: "ring-4 ring-amber-500/15",
                  valueBadge:
                    "bg-background/95 border border-amber-200 dark:border-amber-900 shadow-sm backdrop-blur",
                  valueText: "text-foreground",
                  label: "text-foreground",
                  helper: "text-muted-foreground",
                }}
                fillStyle={{
                  background: `linear-gradient(90deg, #44403c 0%, ${ctrl.mainSegColor} 100%)`,
                  boxShadow: `inset 0 0 0 1px ${ctrl.mainSegColor}33`,
                }}
                heightClassName="h-10"
                showValueInside
                showPercentage
              />
            </div>
          </div>

          {/* ── right column: color + power ───────────────────────── */}
          <div className="flex shrink-0 gap-1.5 self-stretch">
            {/* color swatch — opens modal */}
            <button
              type="button"
              aria-label="Abrir controles WLED"
              className={cn(
                "relative flex w-16 items-center justify-center rounded-lg border border-border/70 bg-background/90 shadow-sm transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35",
                !ctrl.savingColor && "hover:scale-[1.04]",
              )}
              onClick={() => setModalOpen(true)}
              disabled={ctrl.savingColor}
            >
              <div
                className="absolute inset-2 rounded-full blur-sm transition-colors duration-300"
                style={{
                  backgroundColor: ctrl.isOn
                    ? ctrl.mainSegColor
                    : "transparent",
                  opacity: ctrl.isOn ? 0.55 : 0,
                }}
              />
              <div
                className="relative size-8 rounded-full border border-white/50 shadow-inner"
                style={{ backgroundColor: ctrl.mainSegColor }}
              />
              {ctrl.savingColor && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]">
                  <Loader2 className="size-3.5 animate-spin text-foreground" />
                </div>
              )}
            </button>

            {/* power button */}
            <Button
              type="button"
              variant={ctrl.isOn ? "default" : "secondary"}
              className="h-auto min-h-0 w-16 self-stretch rounded-md px-2 text-[11px]"
              onClick={() => void ctrl.togglePower()}
            >
              <div className="flex flex-col items-center gap-1">
                <Power className="size-4" />
                <span className="text-[9px]">{ctrl.isOn ? "Off" : "On"}</span>
              </div>
            </Button>
          </div>
        </WidgetContent>
      </WidgetShell>

      <WledControlModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        ctrl={ctrl}
      />
    </>
  );
}
