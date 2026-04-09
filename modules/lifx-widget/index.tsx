import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Lightbulb,
  Loader2,
  Palette,
  Power,
  RefreshCw,
  SunMedium,
} from "lucide-react";

import TallHorizontalSlider from "@/components/ui/big-slider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  WidgetContent,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import { useSharedContext } from "@/hooks/useSharedContext";
import { cn } from "@/lib/utils";

import LifxApi from "./lifx-api";
import type { LifxLight } from "./types";

function shouldUpdateLights(prev: LifxLight[], next: LifxLight[]) {
  if (prev.length !== next.length) return true;
  for (let index = 0; index < prev.length; index += 1) {
    const current = prev[index];
    const nextLight = next[index];
    if (
      current.id !== nextLight.id ||
      current.label !== nextLight.label ||
      current.power !== nextLight.power ||
      current.connected !== nextLight.connected ||
      current.brightness !== nextLight.brightness ||
      current.color.hue !== nextLight.color.hue ||
      current.color.saturation !== nextLight.color.saturation ||
      current.color.kelvin !== nextLight.color.kelvin
    ) {
      return true;
    }
  }
  return false;
}

type LightColorMode = "color" | "white";

type LightColorDraft = {
  mode: LightColorMode;
  hue: number;
  saturation: number;
  kelvin: number;
};

type LightColorValues = {
  hue: number;
  saturation: number;
  kelvin: number;
};

type ColorPreset = {
  label: string;
  hue: number;
  saturation: number;
};

type WhitePreset = {
  label: string;
  kelvin: number;
};

const COLOR_PRESETS: ColorPreset[] = [
  { label: "Atardecer", hue: 18, saturation: 92 },
  { label: "Mandarina", hue: 34, saturation: 96 },
  { label: "Lima", hue: 88, saturation: 84 },
  { label: "Turquesa", hue: 172, saturation: 86 },
  { label: "Océano", hue: 214, saturation: 92 },
  { label: "Índigo", hue: 252, saturation: 82 },
  { label: "Magenta", hue: 316, saturation: 88 },
  { label: "Rubí", hue: 348, saturation: 86 },
];

const WHITE_PRESETS: WhitePreset[] = [
  { label: "Vela", kelvin: 2200 },
  { label: "Cálida", kelvin: 2700 },
  { label: "Hogar", kelvin: 3200 },
  { label: "Neutra", kelvin: 4000 },
  { label: "Trabajo", kelvin: 5200 },
  { label: "Día", kelvin: 6500 },
];

const HUE_TRACK_BACKGROUND =
  "linear-gradient(90deg, #ef4444 0%, #f59e0b 16%, #eab308 28%, #22c55e 44%, #14b8a6 58%, #3b82f6 74%, #8b5cf6 88%, #ec4899 100%)";
const COLOR_SYNC_DELAY_MS = 1400;

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeHue(hue: number) {
  const normalized = hue % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getBulbColorFromValues(
  color: LightColorValues,
  powerState: LifxLight["power"] = "on",
) {
  if (color.saturation > 0.05) {
    const hue = normalizeHue(color.hue);
    const saturation = Math.max(
      0,
      Math.min(100, Math.round(color.saturation * 100)),
    );
    const lightness = powerState === "on" ? 56 : 24;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  const kelvin = color.kelvin;
  if (kelvin < 3000) return powerState === "on" ? "#f59e0b" : "#5b4522";
  if (kelvin < 4000) return powerState === "on" ? "#fbbf24" : "#5b4a23";
  if (kelvin < 5500) return powerState === "on" ? "#fde68a" : "#65604a";
  if (kelvin < 7000) return powerState === "on" ? "#bfdbfe" : "#475569";
  return powerState === "on" ? "#93c5fd" : "#334155";
}

function createColorDraft(light: LifxLight): LightColorDraft {
  return {
    mode: light.color.saturation > 0.05 ? "color" : "white",
    hue: normalizeHue(light.color.hue),
    saturation: clampValue(Math.round(light.color.saturation * 100), 0, 100),
    kelvin: light.color.kelvin,
  };
}

function getDraftPreviewColor(
  draft: LightColorDraft,
  powerState: LifxLight["power"] = "on",
) {
  return getBulbColorFromValues(
    {
      hue: draft.hue,
      saturation: draft.mode === "color" ? draft.saturation / 100 : 0,
      kelvin: draft.kelvin,
    },
    powerState,
  );
}

function getKelvinLabel(kelvin: number) {
  if (kelvin < 2600) return "Muy cálida";
  if (kelvin < 3400) return "Cálida";
  if (kelvin < 4500) return "Equilibrada";
  if (kelvin < 5800) return "Fría";
  return "Luz día";
}

function getHueDistance(first: number, second: number) {
  const distance = Math.abs(normalizeHue(first) - normalizeHue(second));
  return Math.min(distance, 360 - distance);
}

function isColorPresetActive(draft: LightColorDraft, preset: ColorPreset) {
  return (
    draft.mode === "color" &&
    getHueDistance(draft.hue, preset.hue) <= 8 &&
    Math.abs(draft.saturation - preset.saturation) <= 8
  );
}

function isWhitePresetActive(draft: LightColorDraft, preset: WhitePreset) {
  return (
    draft.mode === "white" && Math.abs(draft.kelvin - preset.kelvin) <= 180
  );
}

function getBulbColor(
  light: LifxLight,
  powerState: LifxLight["power"] = light.power,
) {
  return getBulbColorFromValues(light.color, powerState);
}

export default function LifxWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const apiToken = String(config["apiToken"] ?? "");
  const refreshInterval = Number(config["refreshInterval"] ?? 5);
  const groupFilter = String(config["groupFilter"] ?? "");

  const [lights, setLights] = useState<LifxLight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [brightnessDraft, setBrightnessDraft] = useState<number | null>(null);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [colorDraft, setColorDraft] = useState<LightColorDraft | null>(null);
  const [colorError, setColorError] = useState<string | null>(null);
  const [savingColor, setSavingColor] = useState(false);

  const updatingRef = useRef<Set<string>>(new Set());
  const isTogglingRef = useRef(false);
  const isFetchingRef = useRef(false);
  const brightnessDebounceRef = useRef<number | null>(null);
  const colorRefreshTimeoutRef = useRef<number | null>(null);
  const colorSyncCooldownUntilRef = useRef(0);
  const primaryLightRef = useRef<LifxLight | null>(null);
  const lightsRef = useRef<LifxLight[]>([]);
  const { registerAction, unregisterAction } = useSharedContext();

  const api = useMemo(
    () => (apiToken ? new LifxApi(apiToken) : null),
    [apiToken],
  );

  const patchLight = useCallback(
    (lightId: string, patch: (light: LifxLight) => LifxLight) => {
      setLights((prev) => {
        const next = prev.map((item) =>
          item.id === lightId ? patch(item) : item,
        );
        lightsRef.current = next;
        primaryLightRef.current = next[0] ?? null;
        return next;
      });
    },
    [],
  );

  const fetchLights = useCallback(async (options?: { force?: boolean }) => {
    if (!api) {
      setError("API token no configurado");
      setLoading(false);
      return;
    }

    if (
      !options?.force &&
      Date.now() < colorSyncCooldownUntilRef.current
    ) {
      return;
    }

    if (isTogglingRef.current || isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      setError(null);
      const selector = groupFilter ? `group:"${groupFilter}"` : undefined;
      const data = await api.getLights(selector);
      lightsRef.current = data;
      primaryLightRef.current = data[0] ?? null;
      setLights((prev) => (shouldUpdateLights(prev, data) ? data : prev));
      setLoading(false);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Error al obtener las luces";
      setError(message);
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, [api, groupFilter]);

  const toggleLight = useCallback(
    async (light: LifxLight) => {
      if (!api || updatingRef.current.has(light.id) || isTogglingRef.current) {
        return;
      }

      isTogglingRef.current = true;
      const newPowerState: LifxLight["power"] =
        light.power === "on" ? "off" : "on";

      setUpdating((prev) => {
        const next = new Set([...prev, light.id]);
        updatingRef.current = next;
        return next;
      });

      try {
        await api.toggleLight(light.id);
        patchLight(light.id, (item) => ({
          ...item,
          power: newPowerState,
        }));
      } catch (toggleError) {
        setError(
          toggleError instanceof Error
            ? toggleError.message
            : "Error al cambiar el estado",
        );
      } finally {
        setUpdating((prev) => {
          const next = new Set(prev);
          next.delete(light.id);
          updatingRef.current = next;
          return next;
        });

        window.setTimeout(() => {
          isTogglingRef.current = false;
        }, 300);
      }
    },
    [api, patchLight],
  );

  const openColorDialog = useCallback((light: LifxLight) => {
    const minKelvin = light.product.capabilities.min_kelvin ?? 1500;
    const maxKelvin = light.product.capabilities.max_kelvin ?? 9000;
    const nextDraft = createColorDraft(light);

    if (!light.product.capabilities.has_color) {
      nextDraft.mode = "white";
    } else if (!light.product.capabilities.has_variable_color_temp) {
      nextDraft.mode = "color";
    }

    nextDraft.kelvin = clampValue(nextDraft.kelvin, minKelvin, maxKelvin);

    setColorDraft(nextDraft);
    setColorError(null);
    setIsColorDialogOpen(true);
  }, []);

  const scheduleColorRefresh = useCallback(() => {
    colorSyncCooldownUntilRef.current = Date.now() + COLOR_SYNC_DELAY_MS;

    if (colorRefreshTimeoutRef.current !== null) {
      window.clearTimeout(colorRefreshTimeoutRef.current);
    }

    colorRefreshTimeoutRef.current = window.setTimeout(() => {
      colorRefreshTimeoutRef.current = null;
      void fetchLights({ force: true });
    }, COLOR_SYNC_DELAY_MS);
  }, [fetchLights]);

  const saveColor = useCallback(
    async (light: LifxLight, draft: LightColorDraft) => {
      if (!api) return;
      if (!light.connected) {
        setColorError("La luz está desconectada ahora mismo.");
        return;
      }

      const brightness = Math.round((light.brightness ?? 0) * 100);

      setSavingColor(true);
      setColorError(null);
      setError(null);

      try {
        if (draft.mode === "white") {
          await api.setTemperature(light.id, draft.kelvin);
        } else {
          await api.setColor(light.id, draft.hue, draft.saturation, brightness);
        }

        patchLight(light.id, (item) => ({
          ...item,
          color: {
            ...item.color,
            hue: draft.hue,
            saturation: draft.mode === "color" ? draft.saturation / 100 : 0,
            kelvin: draft.mode === "white" ? draft.kelvin : item.color.kelvin,
          },
        }));

        setIsColorDialogOpen(false);
        setColorDraft(null);
        scheduleColorRefresh();
      } catch (saveError) {
        setColorError(
          saveError instanceof Error
            ? saveError.message
            : "No pude actualizar el color de la luz",
        );
      } finally {
        setSavingColor(false);
      }
    },
    [api, patchLight, scheduleColorRefresh],
  );

  const scheduleBrightnessUpdate = useCallback(
    (lightId: string, value: number) => {
      if (!api) return;

      if (brightnessDebounceRef.current !== null) {
        window.clearTimeout(brightnessDebounceRef.current);
      }

      brightnessDebounceRef.current = window.setTimeout(async () => {
        try {
          await api.setBrightness(lightId, value);
          await fetchLights();
        } catch (brightnessError) {
          setError(
            brightnessError instanceof Error
              ? brightnessError.message
              : "Error al cambiar el brillo",
          );
        }
      }, 180);
    },
    [api, fetchLights],
  );

  useEffect(() => {
    void fetchLights();
    const interval = window.setInterval(() => {
      void fetchLights();
    }, refreshInterval * 1000);
    return () => window.clearInterval(interval);
  }, [fetchLights, refreshInterval]);

  useEffect(() => {
    return () => {
      if (brightnessDebounceRef.current !== null) {
        window.clearTimeout(brightnessDebounceRef.current);
      }
      if (colorRefreshTimeoutRef.current !== null) {
        window.clearTimeout(colorRefreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const toggleId = "lifx-widget:toggle";
    const onId = "lifx-widget:on";
    const offId = "lifx-widget:off";
    const refreshId = "lifx-widget:refresh";

    registerAction({
      id: toggleId,
      widgetId: "lifx-widget",
      title: "Alternar luz",
      description: "Enciende o apaga la primera luz",
      intentTags: ["enciende luz", "apaga luz", "luces", "toggle luz"],
      run: async () => {
        if (!apiToken || !api) {
          return { success: false, message: "Configura el token de LIFX" };
        }
        const light = primaryLightRef.current;
        if (!light) {
          return { success: false, message: "No hay luces disponibles" };
        }
        await toggleLight(light);
        return { success: true, message: `Luz ${light.label} alternada` };
      },
    });

    registerAction({
      id: onId,
      widgetId: "lifx-widget",
      title: "Encender luz",
      description: "Enciende la primera luz",
      intentTags: ["enciende luz", "prende luz", "luz on"],
      run: async () => {
        if (!apiToken || !api) {
          return { success: false, message: "Configura el token de LIFX" };
        }
        const light = primaryLightRef.current;
        if (!light) {
          return { success: false, message: "No hay luces disponibles" };
        }
        await api.turnOnLight(light.id);
        await fetchLights();
        return { success: true, message: `Luz ${light.label} encendida` };
      },
    });

    registerAction({
      id: offId,
      widgetId: "lifx-widget",
      title: "Apagar luz",
      description: "Apaga la primera luz",
      intentTags: ["apaga luz", "apagar luz", "luz off"],
      run: async () => {
        if (!apiToken || !api) {
          return { success: false, message: "Configura el token de LIFX" };
        }
        const light = primaryLightRef.current;
        if (!light) {
          return { success: false, message: "No hay luces disponibles" };
        }
        await api.turnOffLight(light.id);
        await fetchLights();
        return { success: true, message: `Luz ${light.label} apagada` };
      },
    });

    registerAction({
      id: refreshId,
      widgetId: "lifx-widget",
      title: "Actualizar luces",
      description: "Refresca el estado de las luces",
      intentTags: ["actualiza luces", "refresca luces", "luces"],
      run: async () => {
        await fetchLights();
        const light = primaryLightRef.current;
        if (!light) {
          return {
            success: true,
            message: "Actualizado. Sin luces disponibles",
          };
        }

        const onCount = lightsRef.current.filter(
          (item) => item.power === "on",
        ).length;
        return {
          success: true,
          message: `Luces actualizadas. Encendidas: ${onCount}`,
        };
      },
    });

    return () => {
      unregisterAction(toggleId);
      unregisterAction(onId);
      unregisterAction(offId);
      unregisterAction(refreshId);
    };
  }, [
    api,
    apiToken,
    fetchLights,
    registerAction,
    toggleLight,
    unregisterAction,
  ]);

  const remoteBrightnessFromState = Math.round(
    (lights[0]?.brightness ?? 0) * 100,
  );

  useEffect(() => {
    if (brightnessDraft === null) return;

    if (lights.length === 0) {
      setBrightnessDraft(null);
      return;
    }

    if (Math.abs(remoteBrightnessFromState - brightnessDraft) <= 1) {
      setBrightnessDraft(null);
    }
  }, [brightnessDraft, lights.length, remoteBrightnessFromState]);

  useEffect(() => {
    if (lights.length > 0) return;

    setIsColorDialogOpen(false);
    setColorDraft(null);
    setColorError(null);
  }, [lights.length]);

  if (!apiToken) {
    return (
      <WidgetShell accent="amber">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="amber"
            tone="warning"
            icon={<Lightbulb className="size-5" />}
            title="LIFX"
            message="Falta el token para consultar las luces."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (loading) {
    return (
      <WidgetShell accent="amber">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="amber"
            tone="info"
            icon={<RefreshCw className="size-5 animate-spin" />}
            title="LIFX"
            message="Cargando luces."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (error && lights.length === 0) {
    return (
      <WidgetShell accent="rose">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="rose"
            tone="danger"
            icon={<Power className="size-5" />}
            title="No se pudo conectar"
            message={error}
            action={
              <Button
                type="button"
                variant="secondary"
                className="h-9 rounded-lg px-4"
                onClick={() => void fetchLights()}
              >
                Reintentar
              </Button>
            }
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (lights.length === 0) {
    return (
      <WidgetShell accent="amber">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="amber"
            icon={<Lightbulb className="size-5" />}
            title="LIFX"
            message="No hay luces disponibles para este selector."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  const light = lights[0];
  const bulbOnColor = getBulbColor(light, "on");
  const bulbOffColor = getBulbColor(light, "off");
  const bulbColor = light.power === "on" ? bulbOnColor : bulbOffColor;
  const accent = light.power === "on" ? "amber" : "slate";
  const remoteBrightness = Math.round((light.brightness ?? 0) * 100);
  const brightness = brightnessDraft ?? remoteBrightness;
  const isUpdating = updating.has(light.id);
  const supportsColor = light.product.capabilities.has_color;
  const supportsWhiteTemperature =
    light.product.capabilities.has_variable_color_temp;
  const canEditTone =
    light.connected && (supportsColor || supportsWhiteTemperature);
  const minKelvin = light.product.capabilities.min_kelvin ?? 1500;
  const maxKelvin = light.product.capabilities.max_kelvin ?? 9000;
  const dialogPreviewColor = colorDraft
    ? getDraftPreviewColor(colorDraft, "on")
    : bulbOnColor;
  const dialogPreviewSummary = colorDraft
    ? colorDraft.mode === "color"
      ? `${Math.round(colorDraft.hue)}° · ${Math.round(
          colorDraft.saturation,
        )}% saturación`
      : `${Math.round(colorDraft.kelvin)}K · ${getKelvinLabel(colorDraft.kelvin)}`
    : "";
  const saturationTrackBackground = colorDraft
    ? `linear-gradient(90deg, #f8fafc 0%, ${getDraftPreviewColor(
        {
          ...colorDraft,
          mode: "color",
          saturation: 100,
        },
        "on",
      )} 100%)`
    : "linear-gradient(90deg, #f8fafc 0%, #f59e0b 100%)";
  const midKelvin = Math.round((minKelvin + maxKelvin) / 2);
  const temperatureTrackBackground = `linear-gradient(90deg, ${getBulbColorFromValues(
    { hue: 40, saturation: 0, kelvin: minKelvin },
    "on",
  )} 0%, ${getBulbColorFromValues(
    { hue: 48, saturation: 0, kelvin: midKelvin },
    "on",
  )} 48%, ${getBulbColorFromValues(
    { hue: 210, saturation: 0, kelvin: maxKelvin },
    "on",
  )} 100%)`;
  const sliderFillStyle = {
    background: `linear-gradient(90deg, ${bulbOffColor} 0%, ${bulbOnColor} 100%)`,
    boxShadow: `inset 0 0 0 1px ${bulbOnColor}33`,
  };

  return (
    <>
      <WidgetShell accent={accent}>
        <WidgetContent className="flex h-full items-stretch gap-2 px-1.5 pt-1.5 pb-1.5">
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="min-w-0 flex items-center gap-1.5">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/90">
                <Lightbulb className="size-4" />
              </div>
              <p className="truncate text-[0.95rem] font-semibold">
                {light.label}
              </p>
              <WidgetStatus
                tone={light.connected ? "success" : "warning"}
                className="h-4 px-1.5 text-[8px]"
              >
                {light.connected ? "Connected" : "Offline"}
              </WidgetStatus>
            </div>

            <div className="mt-1.5 flex min-w-0 items-center gap-2">
              <div className="mx-2 grid min-w-0 flex-1 gap-2">
                <TallHorizontalSlider
                  value={brightness}
                  onChange={(value) => {
                    setBrightnessDraft(value);
                    scheduleBrightnessUpdate(light.id, value);
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
                  fillStyle={sliderFillStyle}
                  heightClassName="h-10"
                  showValueInside
                  showPercentage
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 self-stretch gap-1.5 ">
            <button
              type="button"
              aria-label={`Editar color de ${light.label}`}
              className={cn(
                "relative flex size-8 h-full w-16 items-center justify-center rounded-lg border border-border/70 bg-background/90 shadow-sm transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35",
                canEditTone && !savingColor && "hover:scale-[1.04]",
                !canEditTone && "cursor-not-allowed opacity-70",
              )}
              onClick={() => openColorDialog(light)}
              disabled={!canEditTone || savingColor}
            >
              <div
                className="absolute inset-1 rounded-full blur-sm transition-colors duration-300 m-1"
                style={{
                  backgroundColor:
                    light.power === "on" ? bulbColor : "transparent",
                  opacity: light.power === "on" ? 0.55 : 0,
                }}
              />
              <div
                className="relative size-8 rounded-full border border-white/50 shadow-inner"
                style={{
                  backgroundColor: bulbColor,
                  opacity: light.connected ? 1 : 0.45,
                }}
              />
              {savingColor ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]">
                  <Loader2 className="size-3.5 animate-spin text-foreground" />
                </div>
              ) : null}
            </button>
            <Button
              type="button"
              variant={light.power === "on" ? "default" : "secondary"}
              className="h-full min-h-0 min-w-0 self-stretch rounded-md px-2 text-[11px] w-16"
              onClick={() => void toggleLight(light)}
              disabled={isUpdating || !light.connected}
            >
              {isUpdating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Power className="size-3.5" />
              )}
              {light.power === "on" ? "Off" : "On"}
            </Button>
          </div>
        </WidgetContent>
      </WidgetShell>

      <Dialog
        open={isColorDialogOpen}
        onOpenChange={(open) => {
          if (savingColor) return;
          setIsColorDialogOpen(open);
          if (!open) {
            setColorDraft(null);
            setColorError(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={!savingColor}
          className="overflow-hidden border-border/70 bg-background/95 p-0 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur sm:max-w-[720px]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-amber-500/12 via-transparent to-sky-500/12" />
          <div className="relative">
            <DialogHeader className="border-b border-border/60 px-4 pt-4 pb-3 text-left">
              <div className="flex items-start gap-3">
                <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/90 shadow-sm">
                  <div
                    className="absolute inset-1.5 rounded-full blur-lg"
                    style={{
                      backgroundColor: dialogPreviewColor,
                      opacity: 0.78,
                    }}
                  />
                  <div
                    className="relative size-6 rounded-full border border-white/55 shadow-inner"
                    style={{ backgroundColor: dialogPreviewColor }}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DialogTitle className="text-sm">{light.label}</DialogTitle>
                    <WidgetStatus
                      tone={light.connected ? "success" : "warning"}
                      className="h-5 px-2 text-[9px]"
                    >
                      {light.connected ? "Online" : "Offline"}
                    </WidgetStatus>
                    {colorDraft ? (
                      <WidgetStatus tone="info" className="h-5 px-2 text-[9px]">
                        {colorDraft.mode === "color" ? "Color" : "Blanco"}
                      </WidgetStatus>
                    ) : null}
                  </div>
                  <DialogDescription className="text-xs leading-4">
                    Ajuste rapido de color o temperatura.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {colorDraft ? (
              <>
                <div className="grid gap-3 px-4 py-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start">
                  <div className="space-y-2 sm:order-1">
                    <div className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Vista previa
                      </p>
                      <div className="mt-3 rounded-xl border border-border/70 bg-gradient-to-b from-background/95 to-muted/30 px-3 py-3.5 text-center">
                        <div className="relative mx-auto flex size-20 items-center justify-center rounded-[1.2rem] border border-border/70 bg-background/90 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                          <div
                            className="absolute inset-3 rounded-full blur-xl"
                            style={{
                              backgroundColor: dialogPreviewColor,
                              opacity: 0.78,
                            }}
                          />
                          <div
                            className="relative size-10 rounded-full border border-white/50 shadow-inner"
                            style={{ backgroundColor: dialogPreviewColor }}
                          />
                        </div>
                        <p className="mt-3 text-sm font-semibold">
                          {colorDraft.mode === "color" ? "Color" : "Blanco"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dialogPreviewSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 space-y-3 sm:order-2">
                    {supportsColor && supportsWhiteTemperature ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-left shadow-sm transition-colors",
                            colorDraft.mode === "color"
                              ? "border-amber-400/45 bg-amber-500/10"
                              : "border-border/70 bg-background/80 hover:bg-muted/35",
                          )}
                          onClick={() =>
                            setColorDraft((prev) =>
                              prev ? { ...prev, mode: "color" } : prev,
                            )
                          }
                          disabled={savingColor}
                        >
                          <Palette className="size-4" />
                          <span className="text-xs font-semibold">Color</span>
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-left shadow-sm transition-colors",
                            colorDraft.mode === "white"
                              ? "border-sky-400/45 bg-sky-500/10"
                              : "border-border/70 bg-background/80 hover:bg-muted/35",
                          )}
                          onClick={() =>
                            setColorDraft((prev) =>
                              prev ? { ...prev, mode: "white" } : prev,
                            )
                          }
                          disabled={savingColor}
                        >
                          <SunMedium className="size-4" />
                          <span className="text-xs font-semibold">Blanco</span>
                        </button>
                      </div>
                    ) : null}

                    {supportsColor && colorDraft.mode === "color" ? (
                      <div className="space-y-3 rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm">
                        <div className="grid grid-cols-4 gap-2">
                          {COLOR_PRESETS.map((preset) => {
                            const active = isColorPresetActive(
                              colorDraft,
                              preset,
                            );
                            const presetColor = getDraftPreviewColor(
                              {
                                ...colorDraft,
                                mode: "color",
                                hue: preset.hue,
                                saturation: preset.saturation,
                              },
                              "on",
                            );

                            return (
                              <button
                                key={preset.label}
                                type="button"
                                className={cn(
                                  "rounded-xl border p-1.5 text-left shadow-sm transition-all",
                                  active
                                    ? "border-amber-400/45 bg-amber-500/10 shadow-[0_14px_30px_rgba(245,158,11,0.14)]"
                                    : "border-border/70 bg-background/85 hover:bg-muted/35",
                                )}
                                onClick={() =>
                                  setColorDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          mode: "color",
                                          hue: preset.hue,
                                          saturation: preset.saturation,
                                        }
                                      : prev,
                                  )
                                }
                                disabled={savingColor}
                              >
                                <span
                                  className="block h-7 rounded-lg border border-white/20 shadow-inner"
                                  style={{ background: presetColor }}
                                />
                                <span className="mt-1.5 block truncate text-[10px] font-medium">
                                  {preset.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <ColorControlSlider
                          label="Tono"
                          value={colorDraft.hue}
                          min={0}
                          max={360}
                          step={1}
                          valueLabel={`${Math.round(colorDraft.hue)}°`}
                          background={HUE_TRACK_BACKGROUND}
                          onChange={(value) =>
                            setColorDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    mode: "color",
                                    hue: value,
                                  }
                                : prev,
                            )
                          }
                        />

                        <ColorControlSlider
                          label="Saturación"
                          value={colorDraft.saturation}
                          min={0}
                          max={100}
                          step={1}
                          valueLabel={`${Math.round(colorDraft.saturation)}%`}
                          background={saturationTrackBackground}
                          onChange={(value) =>
                            setColorDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    mode: "color",
                                    saturation: value,
                                  }
                                : prev,
                            )
                          }
                        />
                      </div>
                    ) : null}

                    {supportsWhiteTemperature && colorDraft.mode === "white" ? (
                      <div className="space-y-3 rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm">
                        <div className="grid grid-cols-3 gap-2">
                          {WHITE_PRESETS.map((preset) => {
                            const active = isWhitePresetActive(
                              colorDraft,
                              preset,
                            );
                            const presetColor = getDraftPreviewColor(
                              {
                                ...colorDraft,
                                mode: "white",
                                kelvin: clampValue(
                                  preset.kelvin,
                                  minKelvin,
                                  maxKelvin,
                                ),
                              },
                              "on",
                            );

                            return (
                              <button
                                key={preset.label}
                                type="button"
                                className={cn(
                                  "rounded-xl border p-1.5 text-left shadow-sm transition-all",
                                  active
                                    ? "border-sky-400/45 bg-sky-500/10 shadow-[0_14px_30px_rgba(56,189,248,0.14)]"
                                    : "border-border/70 bg-background/85 hover:bg-muted/35",
                                )}
                                onClick={() =>
                                  setColorDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          mode: "white",
                                          kelvin: clampValue(
                                            preset.kelvin,
                                            minKelvin,
                                            maxKelvin,
                                          ),
                                        }
                                      : prev,
                                  )
                                }
                                disabled={savingColor}
                              >
                                <span
                                  className="block h-7 rounded-lg border border-white/20 shadow-inner"
                                  style={{ background: presetColor }}
                                />
                                <span className="mt-1.5 block truncate text-[10px] font-medium">
                                  {preset.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <ColorControlSlider
                          label="Temperatura"
                          value={colorDraft.kelvin}
                          min={minKelvin}
                          max={maxKelvin}
                          step={100}
                          valueLabel={`${Math.round(colorDraft.kelvin)}K`}
                          background={temperatureTrackBackground}
                          onChange={(value) =>
                            setColorDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    mode: "white",
                                    kelvin: value,
                                  }
                                : prev,
                            )
                          }
                        />
                      </div>
                    ) : null}

                    {!supportsColor && !supportsWhiteTemperature ? (
                      <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground shadow-sm">
                        Esta luz no expone controles de color ni de temperatura.
                      </div>
                    ) : null}

                    {colorError ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive shadow-sm">
                        {colorError}
                      </div>
                    ) : null}
                  </div>
                </div>

                <DialogFooter className="border-t border-border/60 bg-background/80 px-4 py-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-lg"
                    onClick={() => {
                      setIsColorDialogOpen(false);
                      setColorDraft(null);
                      setColorError(null);
                    }}
                    disabled={savingColor}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="rounded-lg px-5"
                    onClick={() => void saveColor(light, colorDraft)}
                    disabled={
                      savingColor ||
                      !light.connected ||
                      (!supportsColor && !supportsWhiteTemperature)
                    }
                  >
                    {savingColor ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : colorDraft.mode === "color" ? (
                      <Palette className="size-4" />
                    ) : (
                      <SunMedium className="size-4" />
                    )}
                    Aplicar
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ColorControlSliderProps = {
  background: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
  valueLabel: string;
};

function ColorControlSlider({
  background,
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
  valueLabel,
}: ColorControlSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className="rounded-full border border-border/70 bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">
          {valueLabel}
        </span>
      </div>
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full border border-border/70 shadow-inner">
          <div className="absolute inset-0 opacity-95" style={{ background }} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-black/10" />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={cn(
            "absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent focus:outline-none",
            "[&::-webkit-slider-runnable-track]:h-10 [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-webkit-slider-thumb]:mt-[6px] [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/70",
            "[&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-[0_6px_20px_rgba(15,23,42,0.24)]",
            "[&::-moz-range-track]:h-10 [&::-moz-range-track]:bg-transparent",
            "[&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white/70",
            "[&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow-[0_6px_20px_rgba(15,23,42,0.24)]",
          )}
        />
      </div>
    </div>
  );
}
