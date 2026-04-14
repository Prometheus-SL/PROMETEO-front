import { useState } from "react";
import {
  Lightbulb,
  Palette,
  Power,
  RefreshCw,
  SkipForward,
  Sparkles,
} from "lucide-react";

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

/* ── WLED Controller  (2 × 2) ────────────────────────────────────── */

export default function WledControllerWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const ctrl = useWledController(config, "wled-controller");
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
            message="Conectando con el dispositivo…"
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
        <WidgetContent className="flex h-full flex-col gap-1.5 p-1.5">
          {/* ── header ───────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/90">
              <Lightbulb className="size-4" />
            </div>
            <p className="min-w-0 truncate text-[0.95rem] font-semibold">
              {ctrl.deviceName}
            </p>
            <WidgetStatus
              tone={ctrl.isOn ? "success" : "neutral"}
              className="h-4 px-1.5 text-[8px]"
            >
              {ctrl.isOn ? "On" : "Off"}
            </WidgetStatus>
            <div className="flex-1" />
            <Button
              type="button"
              variant={ctrl.isOn ? "default" : "secondary"}
              className="h-7 min-h-0 min-w-0 rounded-md px-2 text-[11px]"
              onClick={() => void ctrl.togglePower()}
            >
              <Power className="size-3.5" />
            </Button>
          </div>

          {/* ── brightness slider ────────────────────────────────── */}
          <div className="mx-1">
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
              heightClassName="h-8"
              showValueInside
              showPercentage
              formatValue={() => `${ctrl.brightnessPercent}%`}
            />
          </div>

          {/* ── color + fx info row ──────────────────────────────── */}
          <div className="flex items-center gap-1.5 px-0.5">
            {/* color swatch — opens modal */}
            <button
              type="button"
              aria-label="Abrir controles"
              className="relative flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/90 shadow-sm transition-transform hover:scale-[1.04]"
              onClick={() => setModalOpen(true)}
            >
              <div
                className="absolute inset-1 rounded-full blur-sm transition-colors duration-300"
                style={{
                  backgroundColor: ctrl.isOn
                    ? ctrl.mainSegColor
                    : "transparent",
                  opacity: ctrl.isOn ? 0.55 : 0,
                }}
              />
              <div
                className="relative size-6 rounded-full border border-white/50 shadow-inner"
                style={{ backgroundColor: ctrl.mainSegColor }}
              />
            </button>

            {/* fx + palette text */}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-xs font-medium">
                <Sparkles className="size-3 shrink-0 text-muted-foreground" />
                {ctrl.currentFx?.name ?? "Solid"}
              </p>
              <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                <Palette className="size-3 shrink-0" />
                {ctrl.currentPal?.name ?? "Default"}
              </p>
            </div>

            {/* edit button */}
            <Button
              type="button"
              variant="ghost"
              className="h-7 min-h-0 min-w-0 rounded-md px-2 text-[10px]"
              onClick={() => setModalOpen(true)}
            >
              <Palette className="size-3.5" />
              Editar
            </Button>
          </div>

          {/* ── presets + next fx row ────────────────────────────── */}
          <div className="flex items-center gap-1 px-0.5">
            {[1, 2, 3, 4, 5].map((ps) => (
              <button
                key={ps}
                type="button"
                className={cn(
                  "flex-1 rounded-md border py-0.5 text-center text-[9px] font-semibold transition-colors",
                  ctrl.wledState?.ps === ps
                    ? "border-amber-400/45 bg-amber-500/10 text-foreground"
                    : "border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/30",
                )}
                onClick={() => void ctrl.applyPreset(ps)}
              >
                P{ps}
              </button>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="h-6 min-h-0 min-w-0 rounded-md px-2 text-[9px]"
              onClick={() => {
                if (!ctrl.mainSeg) return;
                const maxFx =
                  ctrl.effects.length > 0
                    ? ctrl.effects[ctrl.effects.length - 1].id
                    : 0;
                const nextFx =
                  ctrl.mainSeg.fx >= maxFx ? 0 : ctrl.mainSeg.fx + 1;
                void ctrl.setEffect(ctrl.mainSeg.id, nextFx);
              }}
            >
              <SkipForward className="size-3" />
              FX
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
