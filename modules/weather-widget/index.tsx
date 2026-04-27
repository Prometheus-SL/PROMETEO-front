import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useSharedContext } from "@/hooks/useSharedContext";
import {
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  Droplets,
  Moon,
  RefreshCw,
  Snowflake,
  Sun,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Meteors } from "@/components/ui/meteors";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  WidgetContent,
  WidgetSection,
  WidgetShell,
  WidgetState,
  type WidgetAccent,
} from "@/modules/ui/WidgetShell";

type OpenWeatherResponse = {
  weather: { id: number; main: string; description: string; icon: string }[];
  main: { temp: number; feels_like?: number; humidity?: number };
  wind?: { speed?: number };
  name: string;
};

const AUTO_REFRESH_SECONDS = 15 * 60;

function getWeatherIcon(id?: number, isDay = true, className = "size-10") {
  if (!id) return <Cloud className={className} />;
  if (id === 800) {
    return isDay ? (
      <Sun className={className} />
    ) : (
      <Moon className={className} />
    );
  }

  switch (Math.floor(id / 100)) {
    case 2:
      return <CloudLightning className={className} />;
    case 3:
      return <CloudDrizzle className={className} />;
    case 5:
      return <CloudRain className={className} />;
    case 6:
      return <Snowflake className={className} />;
    case 7:
      return <Wind className={className} />;
    default:
      return <Cloud className={className} />;
  }
}

function getWeatherAccent(id?: number, isDay = true): WidgetAccent {
  if (!id) return "sky";
  if (id === 800) return isDay ? "amber" : "violet";

  switch (Math.floor(id / 100)) {
    case 2:
      return "violet";
    case 3:
    case 5:
    case 6:
      return "sky";
    case 7:
      return "slate";
    case 8:
      return isDay ? "slate" : "violet";
    default:
      return "sky";
  }
}

function getWeatherBaseColor(id?: number, isDay = true) {
  if (!id) return "#cbd5e1";

  switch (Math.floor(id / 100)) {
    case 2:
      return "#7c3aed";
    case 3:
    case 5:
      return "#2563eb";
    case 6:
      return "#0ea5e9";
    case 7:
      return "#64748b";
    case 8:
      return id === 800 ? (isDay ? "#f59e0b" : "#4f46e5") : "#94a3b8";
    default:
      return isDay ? "#f59e0b" : "#4f46e5";
  }
}

function formatWind(speed?: number, units = "metric") {
  if (typeof speed !== "number") return "--";
  if (units === "imperial") return `${Math.round(speed)} mph`;
  return `${Math.round(speed * 3.6)} km/h`;
}

function capitalizeText(value?: string) {
  if (!value) return "Sin datos";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function WeatherWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const city = String(config["city"] ?? "Madrid").trim();
  const units = String(config["units"] ?? "metric");
  const lang = String(config["language"] ?? "es");

  const [data, setData] = useState<OpenWeatherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dataRef = useRef<OpenWeatherResponse | null>(null);
  const errorRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const { registerAction, unregisterAction } = useSharedContext();

  const fetchWeather = useCallback(async () => {
    if (inFlightRef.current) return dataRef.current;

    if (!city) {
      setError("Configura una ciudad");
      errorRef.current = "Configura una ciudad";
      setLoading(false);
      setRefreshing(false);
      return null;
    }

    inFlightRef.current = true;
    try {
      if (dataRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      errorRef.current = null;

      const params = new URLSearchParams({
        city,
        units,
        lang,
      });
      const json = await api.getData<OpenWeatherResponse>(
        `/api/v1/integrations/weather/current?${params.toString()}`,
      );
      setData(json);
      dataRef.current = json;
      return json;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      errorRef.current = message;
      return null;
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [city, units, lang]);

  useEffect(() => {
    dataRef.current = null;
    errorRef.current = null;
    inFlightRef.current = false;
    setData(null);
    setError(null);
    setLoading(true);
    setRefreshing(false);
  }, [city, units, lang]);

  useEffect(() => {
    void fetchWeather();
    const id = window.setInterval(() => {
      void fetchWeather();
    }, AUTO_REFRESH_SECONDS * 1000);
    return () => clearInterval(id);
  }, [fetchWeather]);

  useEffect(() => {
    const refreshId = "weather-widget:refresh";
    const summaryId = "weather-widget:summary";

    registerAction({
      id: refreshId,
      widgetId: "weather-widget",
      title: "Actualizar clima",
      description: "Vuelve a consultar el clima actual",
      intentTags: ["actualiza clima", "refresca clima", "tiempo"],
      run: async () => {
        const next = await fetchWeather();
        if (!next) {
          return {
            success: false,
            message: errorRef.current ?? "No se pudo actualizar",
          };
        }

        const desc = next.weather?.[0]?.description ?? "sin datos";
        return {
          success: true,
          message: `Clima actualizado: ${Math.round(
            next.main?.temp ?? 0,
          )} grados, ${desc}.`,
        };
      },
    });

    registerAction({
      id: summaryId,
      widgetId: "weather-widget",
      title: "Clima actual",
      description: "Lee el clima actual guardado",
      intentTags: ["que tiempo hace", "clima", "tiempo"],
      run: async () => {
        const current = dataRef.current ?? (await fetchWeather());
        if (!current) {
          return {
            success: false,
            message: errorRef.current ?? "No hay datos de clima",
          };
        }

        const desc = current.weather?.[0]?.description ?? "sin datos";
        const feels =
          typeof current.main?.feels_like === "number"
            ? `, se siente como ${Math.round(current.main.feels_like)} grados`
            : "";

        return {
          success: true,
          message: `${current.name}: ${Math.round(
            current.main?.temp ?? 0,
          )} grados${feels}, ${desc}.`,
        };
      },
    });

    return () => {
      unregisterAction(refreshId);
      unregisterAction(summaryId);
    };
  }, [fetchWeather, registerAction, unregisterAction]);

  if (!city) {
    return (
      <WidgetShell accent="amber">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="amber"
            title="Weather"
            message="Configura una ciudad para mostrar el clima."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (loading && !data) {
    return (
      <WidgetShell accent="sky">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="sky"
            tone="info"
            icon={<RefreshCw className="size-5 animate-spin" />}
            title={city}
            message="Consultando el clima actual."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (error && !data) {
    return (
      <WidgetShell accent="rose">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="rose"
            tone="danger"
            title="No pude consultar el tiempo"
            message={error}
            action={
              <Button
                type="button"
                variant="secondary"
                className="h-9 rounded-lg px-4"
                onClick={() => void fetchWeather()}
              >
                Reintentar
              </Button>
            }
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  const cond = data?.weather?.[0];
  const isDay = cond?.icon?.includes("d") ?? true;
  const accent = getWeatherAccent(cond?.id, isDay);
  const baseColor = getWeatherBaseColor(cond?.id, isDay);
  const iconWrapperClass =
    accent === "amber"
      ? "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-200"
      : accent === "violet"
        ? "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-200"
        : accent === "slate"
          ? "border-slate-500/25 bg-slate-500/12 text-slate-700 dark:text-slate-200"
          : "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-200";

  const description = capitalizeText(cond?.description);
  const tempValue =
    typeof data?.main?.temp === "number" ? Math.round(data.main.temp) : null;
  const feelsLikeValue =
    typeof data?.main?.feels_like === "number"
      ? Math.round(data.main.feels_like)
      : null;
  const humidityText =
    typeof data?.main?.humidity === "number"
      ? `${Math.round(data.main.humidity)}%`
      : "--";
  const windText = formatWind(data?.wind?.speed, units);
  const unitLabel = units === "imperial" ? "F" : "C";
  const locationTitle = data?.name || city || "Weather";

  return (
    <WidgetShell accent={accent}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: baseColor }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-85">
        <WeatherBackdrop conditionId={cond?.id} isDay={isDay} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/35 via-background/15 to-background/35" />

      <WidgetContent className="relative z-10 grid min-h-0 grid-cols-[minmax(0,1fr)_132px] gap-1.5 pt-1.5 pb-1.5">
        <WidgetSection
          accent={accent}
          className="flex min-w-0 items-center gap-2.5 bg-background/76 p-1.5"
        >
          <div className="flex shrink-0 items-center gap-2">
            <div
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg border shadow-sm backdrop-blur-sm",
                iconWrapperClass,
              )}
            >
              {getWeatherIcon(cond?.id, isDay, "size-4")}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-end gap-1">
                <span className="text-[1.7rem] font-semibold leading-none tabular-nums">
                  {tempValue ?? "--"}
                </span>
                <span className="pb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {unitLabel}
                </span>
              </div>
              <p className="text-[9px] leading-none text-muted-foreground">
                Sens. {feelsLikeValue ?? "--"} {unitLabel}
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-0.5 border-l border-border/40 pl-2">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[10px] font-medium">
                {locationTitle}
              </span>
              <span className="shrink-0 rounded-full border border-border/50 bg-background/60 px-1.5 py-0.5 text-[8px] leading-none text-muted-foreground">
                {refreshing ? "Ahora" : isDay ? "Dia" : "Noche"}
              </span>
            </div>
            <p className="truncate text-[10px] text-muted-foreground">
              {description}
            </p>
          </div>
        </WidgetSection>

        <WidgetSection
          accent={accent}
          className="grid min-h-0 grid-rows-2 gap-1 bg-background/76 p-1.5"
        >
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="inline-flex min-w-0 items-center gap-1 truncate text-muted-foreground">
              <Droplets className="size-3" />
              Humedad
            </span>
            <span className="shrink-0 whitespace-nowrap font-medium">
              {humidityText}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="inline-flex min-w-0 items-center gap-1 truncate text-muted-foreground">
              <Wind className="size-3" />
              Viento
            </span>
            <span className="shrink-0 whitespace-nowrap font-medium">
              {windText}
            </span>
          </div>
        </WidgetSection>
      </WidgetContent>
    </WidgetShell>
  );
}

type Rng = () => number;
type AnimatedStyle = CSSProperties &
  Record<string, string | number | undefined>;

function WeatherBackdrop({
  conditionId,
  isDay,
}: {
  conditionId?: number;
  isDay: boolean;
}) {
  const baseSeed = (conditionId ?? 0) + (isDay ? 1 : 997);

  const content = useMemo<ReactNode>(() => {
    const rng = createRng(baseSeed || 1);

    if (!conditionId) {
      return renderDefault(rng, isDay);
    }

    if (conditionId === 800) {
      return isDay ? renderSunny(rng) : renderNight(rng);
    }

    const group = Math.floor(conditionId / 100);

    switch (group) {
      case 2:
        return renderStorm(rng);
      case 3:
      case 5:
        return renderRain(rng, isDay);
      case 6:
        return renderSnow(rng, isDay);
      case 7:
        return renderFog(rng);
      case 8:
        return renderClouds(rng, isDay);
      default:
        return renderDefault(rng, isDay);
    }
  }, [baseSeed, conditionId, isDay]);

  return (
    <div className="weather-backdrop" aria-hidden="true">
      {content}
    </div>
  );
}

function renderSunny(rng: Rng): ReactNode {
  const highlightX = 20 + rng() * 40;
  const highlightY = 55 + rng() * 20;

  return (
    <>
      <div className="weather-sun-gradient" />
      <div className="weather-sun-halo" />
      <div className="weather-sun-core" />
      <div className="weather-sun-rays" />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${highlightX}% ${highlightY}%, rgba(255,255,255,0.22), transparent 62%)`,
        }}
      />
    </>
  );
}

function renderNight(rng: Rng): ReactNode {
  const stars = Array.from({ length: 36 }, (_, index) => {
    const size = 1 + rng() * 2.5;
    const left = rng() * 100;
    const top = rng() * 70;
    const duration = 4 + rng() * 6;
    const delay = rng() * 6;
    const opacity = 0.4 + rng() * 0.5;
    const style: AnimatedStyle = {
      left: `${left}%`,
      top: `${top}%`,
      width: `${size}px`,
      height: `${size}px`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
      opacity,
    };

    return (
      <span key={`star-${index}`} className="weather-star" style={style} />
    );
  });

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/90 to-indigo-900/60" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-indigo-900/70 via-transparent to-transparent" />
      {stars}
    </>
  );
}

function renderRain(rng: Rng, isDay: boolean): ReactNode {
  const highlightX = 25 + rng() * 50;

  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: isDay
            ? "linear-gradient(135deg, rgba(59,130,246,0.32), rgba(14,165,233,0.26) 45%, transparent 80%)"
            : "linear-gradient(145deg, rgba(30,64,175,0.65), rgba(6,182,212,0.4) 45%, transparent 82%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${highlightX}% 18%, rgba(255,255,255,0.28), transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <Meteors
          number={isDay ? 42 : 56}
          minDelay={0.05}
          maxDelay={0.7}
          minDuration={0.7}
          maxDuration={1.6}
          angle={195}
          className="!bg-sky-200/80 !shadow-[0_0_0_1px_rgba(186,230,253,0.35)]"
        />
      </div>
    </>
  );
}

function renderStorm(rng: Rng): ReactNode {
  const highlightX = 20 + rng() * 60;
  const highlightY = 15 + rng() * 20;
  const flashes = Array.from({ length: 2 }, (_, index) => {
    const style: AnimatedStyle = {
      animationDuration: `${4 + rng() * 3}s`,
      animationDelay: `${rng() * 6}s`,
    };

    return (
      <div key={`flash-${index}`} className="weather-flash" style={style} />
    );
  });

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/75 to-sky-900/55" />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${highlightX}% ${highlightY}%, rgba(148,163,184,0.3), transparent 65%)`,
        }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <Meteors
          number={64}
          minDelay={0.02}
          maxDelay={0.4}
          minDuration={0.6}
          maxDuration={1.2}
          angle={205}
          className="!bg-slate-200/80 !shadow-[0_0_0_1px_rgba(226,232,240,0.35)]"
        />
      </div>
      {flashes}
    </>
  );
}

function renderSnow(rng: Rng, isDay: boolean): ReactNode {
  const flakes = generateSnowFlakes(rng);

  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: isDay
            ? "linear-gradient(140deg, rgba(226,232,240,0.8), rgba(148,163,184,0.4), transparent 70%)"
            : "linear-gradient(140deg, rgba(51,65,85,0.85), rgba(148,163,184,0.45), transparent 75%)",
        }}
      />
      {flakes}
    </>
  );
}

function renderFog(rng: Rng): ReactNode {
  const bands = Array.from({ length: 3 }, (_, index) => {
    const style: AnimatedStyle = {
      top: `${20 + index * 20}%`,
      animationDuration: `${16 + rng() * 6}s`,
      animationDelay: `${-rng() * 8}s`,
      opacity: 0.2 + rng() * 0.15,
    };

    return (
      <div key={`fog-${index}`} className="weather-fog-band" style={style} />
    );
  });

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-400/30 via-slate-500/25 to-slate-400/35" />
      {bands}
    </>
  );
}

function renderClouds(rng: Rng, isDay: boolean): ReactNode {
  const clouds = Array.from({ length: 3 }, (_, index) => {
    const duration = 32 + rng() * 24;
    const style: AnimatedStyle = {
      top: `${8 + index * 22}%`,
      animationDuration: `${duration}s`,
      animationDelay: `${-rng() * duration}s`,
      opacity: 0.25 + rng() * 0.2,
      "--cloud-shift": `${20 + rng() * 20}%`,
    };

    return (
      <div key={`cloud-${index}`} className="weather-cloud" style={style} />
    );
  });

  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: isDay
            ? "linear-gradient(135deg, rgba(226,232,240,0.6), rgba(148,163,184,0.3), transparent 75%)"
            : "linear-gradient(135deg, rgba(30,41,59,0.85), rgba(71,85,105,0.5), transparent 80%)",
        }}
      />
      {clouds}
    </>
  );
}

function renderDefault(rng: Rng, isDay: boolean): ReactNode {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: isDay
            ? "linear-gradient(135deg, rgba(226,232,240,0.5), rgba(148,163,184,0.2), transparent 70%)"
            : "linear-gradient(135deg, rgba(30,41,59,0.6), rgba(51,65,85,0.45), transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${30 + rng() * 40}% ${
            40 + rng() * 40
          }%, rgba(255,255,255,0.18), transparent 65%)`,
        }}
      />
    </>
  );
}

function generateSnowFlakes(rng: Rng, count = 28): ReactNode[] {
  const flakes: ReactNode[] = [];

  for (let i = 0; i < count; i += 1) {
    const size = 4 + rng() * 8;
    const duration = 6 + rng() * 6;
    const delay = -rng() * duration;
    const left = rng() * 100;
    const drift = (rng() - 0.5) * 60;
    const opacity = 0.45 + rng() * 0.4;
    const scale = 0.7 + rng() * 0.6;
    const style: AnimatedStyle = {
      left: `${left}%`,
      width: `${size}px`,
      height: `${size}px`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
      opacity,
      "--snow-drift": `${drift}px`,
      "--snow-scale": `${scale}`,
    };

    flakes.push(
      <span key={`snow-${i}`} className="weather-snow-flake" style={style} />,
    );
  }

  return flakes;
}

function createRng(seed: number): Rng {
  let state = Math.floor(seed) % 2147483647;
  if (state <= 0) state += 2147483646;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
