import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Palette, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import {
  COLOR_PRESETS,
  rgbToHex,
  segmentPrimaryColor,
  type WledController,
} from "./useWledController";

/* ── modal ────────────────────────────────────────────────────────── */

export default function WledControlModal({
  open,
  onOpenChange,
  ctrl,
  initialSegId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctrl: WledController;
  initialSegId?: number;
}) {
  const [colorHex, setColorHex] = useState("#ff8800");
  const [activeSegId, setActiveSegId] = useState(0);
  const [colorError, setColorError] = useState<string | null>(null);

  /* sync initial state when modal opens */
  useEffect(() => {
    if (!open || !ctrl.wledState) return;
    const segId = initialSegId ?? ctrl.wledState.mainseg;
    const seg =
      ctrl.wledState.seg.find((s) => s.id === segId) ?? ctrl.wledState.seg[0];
    if (seg) {
      setActiveSegId(seg.id);
      setColorHex(segmentPrimaryColor(seg));
    }
    setColorError(null);
  }, [open, ctrl.wledState, initialSegId]);

  const handleSaveColor = async () => {
    setColorError(null);
    try {
      await ctrl.saveSegmentColor(activeSegId, colorHex);
    } catch (e) {
      setColorError(
        e instanceof Error ? e.message : "Error al cambiar el color",
      );
    }
  };

  if (!ctrl.wledState) return null;

  const activeSeg =
    ctrl.wledState.seg.find((s) => s.id === activeSegId) ??
    ctrl.wledState.seg[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!ctrl.savingColor) onOpenChange(v);
      }}
    >
      <DialogContent
        showCloseButton={!ctrl.savingColor}
        className="overflow-hidden border-border/70 bg-background/95 p-0 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur sm:max-w-[680px]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-amber-500/12 via-transparent to-sky-500/12" />
        <div className="relative">
          {/* ── header ─────────────────────────────────────────── */}
          <DialogHeader className="border-b border-border/60 px-4 pt-4 pb-3 text-left">
            <div className="flex items-start gap-3">
              <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/90 shadow-sm">
                <div
                  className="absolute inset-1.5 rounded-full blur-lg"
                  style={{ backgroundColor: colorHex, opacity: 0.78 }}
                />
                <div
                  className="relative size-6 rounded-full border border-white/55 shadow-inner"
                  style={{ backgroundColor: colorHex }}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <DialogTitle className="text-sm">{ctrl.deviceName}</DialogTitle>
                <DialogDescription className="text-xs leading-4">
                  Controles de color, efectos, segmentos y presets.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* ── body ───────────────────────────────────────────── */}
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 px-4 py-4">
              {/* ── color section ──────────────────────────────── */}
              <section className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Color — Segmento {activeSegId}
                </p>
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((preset) => {
                    const hex = rgbToHex(preset.r, preset.g, preset.b);
                    const active = colorHex.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className={cn(
                          "rounded-xl border p-1.5 text-left shadow-sm transition-all",
                          active
                            ? "border-amber-400/45 bg-amber-500/10"
                            : "border-border/70 bg-background/85 hover:bg-muted/35",
                        )}
                        onClick={() => setColorHex(hex)}
                        disabled={ctrl.savingColor}
                      >
                        <span
                          className="block h-6 rounded-lg border border-white/20 shadow-inner"
                          style={{ background: hex }}
                        />
                        <span className="mt-1 block truncate text-[9px] font-medium">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-border/70 bg-transparent p-0.5"
                    disabled={ctrl.savingColor}
                  />
                  <input
                    type="text"
                    value={colorHex}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColorHex(v);
                    }}
                    maxLength={7}
                    className="h-8 w-24 rounded-md border border-border/70 bg-background/90 px-2 text-xs font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-400/35"
                    disabled={ctrl.savingColor}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => void handleSaveColor()}
                    disabled={ctrl.savingColor || colorHex.length !== 7}
                  >
                    {ctrl.savingColor ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Palette className="size-3.5" />
                    )}
                    Aplicar
                  </Button>
                </div>
                {colorError && (
                  <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
                    {colorError}
                  </div>
                )}
              </section>

              {/* ── effects section ────────────────────────────── */}
              {activeSeg && (
                <section className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Efectos & Paleta
                  </p>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-0.5 block text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Efecto
                      </label>
                      <div className="relative">
                        <select
                          className="h-8 w-full appearance-none truncate rounded-md border border-border/70 bg-background/90 px-2 pr-6 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-400/35"
                          value={activeSeg.fx}
                          onChange={(e) =>
                            void ctrl.setEffect(
                              activeSeg.id,
                              Number(e.target.value),
                            )
                          }
                        >
                          {ctrl.effects.map((fx) => (
                            <option key={fx.id} value={fx.id}>
                              {fx.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Paleta
                      </label>
                      <div className="relative">
                        <select
                          className="h-8 w-full appearance-none truncate rounded-md border border-border/70 bg-background/90 px-2 pr-6 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-400/35"
                          value={activeSeg.pal}
                          onChange={(e) =>
                            void ctrl.setPalette(
                              activeSeg.id,
                              Number(e.target.value),
                            )
                          }
                        >
                          {ctrl.palettes.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-3">
                    <MiniSlider
                      label="Speed"
                      value={ctrl.fxSpeed}
                      onChange={(v) => void ctrl.updateFxSpeed(activeSeg.id, v)}
                    />
                    <MiniSlider
                      label="Intensity"
                      value={ctrl.fxIntensity}
                      onChange={(v) =>
                        void ctrl.updateFxIntensity(activeSeg.id, v)
                      }
                    />
                  </div>
                </section>
              )}

              {/* ── segments section ───────────────────────────── */}
              {ctrl.wledState.seg.length > 1 && (
                <section className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Segmentos
                  </p>
                  <div className="mt-2 space-y-1">
                    {ctrl.wledState.seg.map((seg) => (
                      <div
                        key={seg.id}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2 py-1",
                          seg.id === activeSegId
                            ? "border-amber-400/45 bg-amber-500/5"
                            : "border-border/60 bg-background/70",
                        )}
                      >
                        <button
                          type="button"
                          className="size-4 shrink-0 rounded-full border border-white/30 shadow-inner transition-transform hover:scale-110"
                          style={{
                            backgroundColor: segmentPrimaryColor(seg),
                          }}
                          onClick={() => {
                            setActiveSegId(seg.id);
                            setColorHex(segmentPrimaryColor(seg));
                          }}
                          title="Editar color de este segmento"
                        />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                          {seg.n || `Seg ${seg.id}`}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {seg.start}–{seg.stop}
                        </span>
                        <Button
                          type="button"
                          variant={seg.on ? "default" : "secondary"}
                          className="h-5 min-h-0 min-w-0 rounded px-1.5 text-[9px]"
                          onClick={() => void ctrl.toggleSegment(seg.id)}
                        >
                          <Power className="size-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── presets section ─────────────────────────────── */}
              <section className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Presets
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5].map((ps) => (
                    <button
                      key={ps}
                      type="button"
                      className={cn(
                        "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                        ctrl.wledState?.ps === ps
                          ? "border-amber-400/45 bg-amber-500/10 text-foreground"
                          : "border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/30",
                      )}
                      onClick={() => void ctrl.applyPreset(ps)}
                    >
                      P{ps}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>

          {/* ── footer ─────────────────────────────────────────── */}
          <DialogFooter className="border-t border-border/60 bg-background/80 px-4 py-3">
            <Button
              type="button"
              variant="secondary"
              className="rounded-lg"
              onClick={() => onOpenChange(false)}
              disabled={ctrl.savingColor}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── mini slider ──────────────────────────────────────────────────── */

function MiniSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="text-[9px] tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={255}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "h-4 w-full cursor-pointer appearance-none rounded-full bg-muted",
          "[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm",
          "[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border",
          "[&::-moz-range-thumb]:border-amber-300 [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow-sm",
        )}
      />
    </div>
  );
}
