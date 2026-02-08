import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSharedContext } from "@/hooks/useSharedContext";
import { Power, Palette, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GridPattern } from "@/components/ui/grid-pattern";
import LifxApi from "./lifx-api";
import type { LifxLight } from "./types";

function shouldUpdateLights(prev: LifxLight[], next: LifxLight[]) {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (
      a.id !== b.id ||
      a.label !== b.label ||
      a.power !== b.power ||
      a.connected !== b.connected ||
      a.color.hue !== b.color.hue ||
      a.color.saturation !== b.color.saturation ||
      a.color.kelvin !== b.color.kelvin
    ) {
      return true;
    }
  }
  return false;
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
  const updatingRef = useRef<Set<string>>(new Set());
  const isTogglingRef = useRef(false);
  const isFetchingRef = useRef(false);
  const primaryLightRef = useRef<LifxLight | null>(null);
  const lightsRef = useRef<LifxLight[]>([]);
  const { registerAction, unregisterAction } = useSharedContext();

  const api = useMemo(
    () => (apiToken ? new LifxApi(apiToken) : null),
    [apiToken]
  );

  const fetchLights = useCallback(async () => {
    if (!api) {
      setError("API token no configurado");
      setLoading(false);
      return;
    }

    // No actualizar si hay un toggle en curso o un fetch activo.
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al obtener las luces";
      setError(message);
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, [api, groupFilter]);

  useEffect(() => {
    fetchLights();
    const interval = setInterval(fetchLights, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchLights, refreshInterval]);
  const toggleLight = useCallback(
    async (light: LifxLight) => {
      if (!api || updatingRef.current.has(light.id) || isTogglingRef.current)
        return;

      isTogglingRef.current = true;
      const newPowerState = light.power === "on" ? "off" : "on";

      setUpdating((prev) => {
        const next = new Set([...prev, light.id]);
        updatingRef.current = next;
        return next;
      });

      try {
        await api.toggleLight(light.id);
        setLights((prev) => {
          const next = prev.map((l) =>
            l.id === light.id ? { ...l, power: newPowerState } : l
          );
          lightsRef.current = next;
          return next;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cambiar el estado"
        );
      } finally {
        setUpdating((prev) => {
          const newSet = new Set(prev);
          newSet.delete(light.id);
          updatingRef.current = newSet;
          return newSet;
        });
        setTimeout(() => {
          isTogglingRef.current = false;
        }, 300);
      }
    },
    [api]
  );

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
        if (!apiToken || !api)
          return { success: false, message: "Configura el token de LIFX" };
        const light = primaryLightRef.current;
        if (!light)
          return { success: false, message: "No hay luces disponibles" };
        await toggleLight(light);
        return {
          success: true,
          message: `Luz ${light.label} alternada`,
        };
      },
    });

    registerAction({
      id: onId,
      widgetId: "lifx-widget",
      title: "Encender luz",
      description: "Enciende la primera luz",
      intentTags: ["enciende luz", "prende luz", "luz on"],
      run: async () => {
        if (!apiToken || !api)
          return { success: false, message: "Configura el token de LIFX" };
        const light = primaryLightRef.current;
        if (!light)
          return { success: false, message: "No hay luces disponibles" };
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
        if (!apiToken || !api)
          return { success: false, message: "Configura el token de LIFX" };
        const light = primaryLightRef.current;
        if (!light)
          return { success: false, message: "No hay luces disponibles" };
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
        if (!light)
          return {
            success: true,
            message: "Actualizado. Sin luces disponibles",
          };
        const onCount = lightsRef.current.filter((l) => l.power === "on").length;
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
    unregisterAction,
    toggleLight,
  ]);

  if (!apiToken) {
    return (
      <Card className="relative border border-border/60 bg-background/90 shadow-lg shadow-primary/10">
        <GridPattern
          width={30}
          height={30}
          x={-1}
          y={-1}
          strokeDasharray="4 2"
          className="pointer-events-none opacity-40 [mask-image:radial-gradient(360px_circle_at_center,white,transparent)]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/15 via-primary/10 to-background" />

        <div className="relative h-full flex items-center justify-center p-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="relative border border-border/60 bg-background/90 shadow-lg shadow-primary/10">
        <GridPattern
          width={30}
          height={30}
          x={-1}
          y={-1}
          strokeDasharray="4 2"
          className="pointer-events-none opacity-40 [mask-image:radial-gradient(360px_circle_at_center,white,transparent)]"
        />
        <div className="relative h-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="relative border border-border/60 bg-background/90 shadow-lg shadow-primary/10">
        <GridPattern
          width={30}
          height={30}
          x={-1}
          y={-1}
          strokeDasharray="4 2"
          className="pointer-events-none opacity-40 [mask-image:radial-gradient(360px_circle_at_center,white,transparent)]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/15 via-primary/10 to-background" />

        <div className="relative h-full flex items-center justify-center p-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
      </Card>
    );
  }

  if (lights.length === 0) {
    return (
      <Card className="relative border border-border/60 bg-background/90 shadow-lg shadow-primary/10">
        <GridPattern
          width={30}
          height={30}
          x={-1}
          y={-1}
          strokeDasharray="4 2"
          className="pointer-events-none opacity-40 [mask-image:radial-gradient(360px_circle_at_center,white,transparent)]"
        />
        <div className="relative h-full flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Sin luces</p>
        </div>
      </Card>
    );
  }

  // Mostrar solo la primera luz
  const light = lights[0];

  // LIFX API returns: hue (0-360), saturation (0-1), kelvin (2500-9000)
  // Si saturation = 0, la luz está en modo temperatura, no color RGB
  const hasColor = light.color.saturation > 0.05;

  let bulbColor: string;

  if (hasColor) {
    // Modo color RGB - usar HSL directo
    const hue = light.color.hue % 360;
    const saturation = Math.max(
      0,
      Math.min(100, Math.round(light.color.saturation * 100))
    );
    const lightness = light.power === "on" ? 55 : 20;
    bulbColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  } else {
    // Modo temperatura - convertir kelvin a color aproximado
    const kelvin = light.color.kelvin;
    let tempHue: number;
    let tempSat: number;

    if (kelvin < 3000) {
      tempHue = 30;
      tempSat = 80;
    } else if (kelvin < 4000) {
      tempHue = 35;
      tempSat = 70;
    } else if (kelvin < 5500) {
      tempHue = 50;
      tempSat = 60;
    } else if (kelvin < 7000) {
      tempHue = 60;
      tempSat = 40;
    } else {
      tempHue = 220;
      tempSat = 50;
    }

    const lightness = light.power === "on" ? 55 : 20;
    bulbColor = `hsl(${tempHue}, ${tempSat}%, ${lightness}%)`;
  }

  return (
    <Card className="relative h-full overflow-hidden border border-border/60 bg-background/95 shadow-lg shadow-primary/10">
      <style>{`
        @keyframes pulse-ring {
          0% {
            r: 24px;
            stroke-width: 1px;
            opacity: 0.4;
          }
          100% {
            r: 32px;
            stroke-width: 0px;
            opacity: 0;
          }
        }
      `}</style>

      {/* Fondo dinámico */}
      {light.power === "on" && (
        <>
          <div
            className="absolute left-0 right-10 top-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl transition-all duration-500"
            style={{
              width: "520px",
              height: "520px",
              background: `radial-gradient(circle, ${bulbColor}, transparent)`,
            }}
          />
        </>
      )}

      {/* Fondo gradiente base */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{
          background:
            light.power === "on"
              ? `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, ${bulbColor}15 50%, rgba(0,0,0,0.1) 100%)`
              : "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.05) 100%)",
        }}
      />

      <CardHeader className="relative h-full flex flex-row items-center gap-4 p-4">
        {/* Bombilla visual mejorada */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          {/* Bombilla SVG funcional */}
          <svg
            width="50"
            height="60"
            viewBox="0 0 70 70"
            className="relative z-10 drop-shadow-xl transition-transform duration-300"
            style={{
              filter:
                light.power === "on"
                  ? `drop-shadow(0 0 12px ${bulbColor})`
                  : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              transform: light.power === "on" ? "scale(1.05)" : "scale(1)",
            }}
          >
            <defs>
              <radialGradient id={`bulbGrad-${light.id}`} cx="40%" cy="30%">
                <stop offset="0%" stopColor={bulbColor} stopOpacity="1" />
                <stop offset="60%" stopColor={bulbColor} stopOpacity="0.85" />
                <stop offset="100%" stopColor={bulbColor} stopOpacity="0.5" />
              </radialGradient>

              <radialGradient id={`highlight-${light.id}`} cx="35%" cy="25%">
                <stop offset="0%" stopColor="white" stopOpacity="0.8" />
                <stop offset="50%" stopColor="white" stopOpacity="0.3" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>

              <linearGradient
                id={`base-grad-${light.id}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#999" />
                <stop offset="50%" stopColor="#666" />
                <stop offset="100%" stopColor="#444" />
              </linearGradient>
            </defs>

            {/* Casquillo roscado superior */}
            <rect x="25" y="48" width="20" height="4" fill="#888" rx="1" />
            <rect x="24" y="52" width="22" height="2" fill="#777" />
            <rect x="24" y="54" width="22" height="2" fill="#666" />

            {/* Cristal principal de la bombilla */}
            <circle
              cx="35"
              cy="28"
              r="26"
              fill={`url(#bulbGrad-${light.id})`}
            />

            {/* Sombra interior para profundidad */}
            <circle cx="35" cy="28" r="26" fill="black" opacity="0.1" />

            {/* Highlights principales */}
            {light.power === "on" && (
              <>
                <circle
                  cx="22"
                  cy="16"
                  r="8"
                  fill={`url(#highlight-${light.id})`}
                />
                <circle cx="22" cy="16" r="4" fill="white" opacity="0.6" />
                <circle cx="22" cy="16" r="2" fill="white" opacity="0.8" />
              </>
            )}

            {/* Rosca base de la bombilla */}
            <rect
              x="28"
              y="56"
              width="14"
              height="3"
              fill={`url(#base-grad-${light.id})`}
              rx="1"
            />
            <rect x="27" y="60" width="16" height="2.5" fill="#666" rx="1" />
            <rect x="27" y="63" width="16" height="2.5" fill="#555" rx="1" />
            <rect x="27" y="66" width="16" height="2.5" fill="#666" rx="1" />
            <rect x="29" y="70" width="12" height="2" fill="#777" rx="0.5" />

            {/* Efecto de encendido - pulso interior */}
            {light.power === "on" && (
              <circle
                cx="35"
                cy="28"
                r="24"
                fill="none"
                stroke={bulbColor}
                strokeWidth="0.5"
                opacity="0.4"
                style={{
                  animation: "pulse-ring 2s ease-out infinite",
                }}
              />
            )}
          </svg>
        </div>
        {/* Info y controles */}
        <div className="flex-1 min-w-0 flex flex-row gap-3">
          {/* Columna izquierda: Nombre y datos */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
            <h3 className="truncate text-sm font-bold text-foreground drop-shadow-md">
              {light.label}
            </h3>
            <p className="text-xs text-muted-foreground">
              {light.power === "on" ? "Encendida" : "Apagada"}
              {light.connected ? "" : " • Desconectada"}
            </p>
          </div>

          {/* Columna derecha: Controles */}
          <div className="flex gap-1.5 justify-center">
            <Button
              variant="outline"
              size="lg"
              className="text-xs transition-all duration-300 hover:bg-primary/10"
              disabled={light.power === "off" || !light.connected}
            >
              <Palette className="w-3 h-3 mr-1" />
            </Button>
            <Button
              onClick={() => toggleLight(light)}
              disabled={updating.has(light.id) || !light.connected}
              variant={light.power === "on" ? "default" : "outline"}
              size="lg"
              className="text-xs transition-all duration-300"
            >
              {updating.has(light.id) ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Power className="w-3 h-3 mr-1" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

