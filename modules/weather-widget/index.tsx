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
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  Wind,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Meteors } from "@/components/ui/meteors";

export default function WeatherWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const city = String(config["city"] ?? "Madrid");
  const units = String(config["units"] ?? "metric");
  const [data, setData] = useState<OpenWeatherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef<OpenWeatherResponse | null>(null);

  const apiKey = String(config["apiKey"] ?? "");
  const lang = String(config["language"] ?? "en");
  const { registerAction, unregisterAction } = useSharedContext();

  const fetchWeather = useCallback(async () => {
    if (!apiKey) {
      setError("Configura la API key de OpenWeather");
      setLoading(false);
      return null;
    }
    if (!city) {
      setError("Configura una ciudad");
      setLoading(false);
      return null;
    }
    const base = "https://api.openweathermap.org/data/2.5/weather";
    const url = `${base}?q=${encodeURIComponent(
      city
    )}&units=${units}&lang=${lang}&appid=${apiKey}`;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as OpenWeatherResponse;
      setData(json);
      dataRef.current = json;
      return json;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiKey, city, units, lang]);

  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, 15 * 60 * 1000);
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
        if (!next)
          return { success: false, message: error ?? "No se pudo actualizar" };
        const desc = next.weather?.[0]?.description ?? "sin datos";
        return {
          success: true,
          message: `Clima actualizado: ${Math.round(
            next.main?.temp ?? 0
          )}º, ${desc}.`,
        };
      },
    });

    registerAction({
      id: summaryId,
      widgetId: "weather-widget",
      title: "Clima actual",
      description: "Lee el clima actual guardado",
      intentTags: ["qué tiempo hace", "clima", "tiempo"],
      run: async () => {
        const current = dataRef.current ?? (await fetchWeather());
        if (!current)
          return { success: false, message: error ?? "No hay datos de clima" };
        const desc = current.weather?.[0]?.description ?? "sin datos";
        const feels = current.main?.feels_like
          ? `, se siente como ${Math.round(current.main.feels_like)}º`
          : "";
        return {
          success: true,
          message: `${current.name}: ${Math.round(
            current.main?.temp ?? 0
          )}º${feels}, ${desc}.`,
        };
      },
    });

    return () => {
      unregisterAction(refreshId);
      unregisterAction(summaryId);
    };
  }, [fetchWeather, registerAction, unregisterAction, error]);

  const cond = data?.weather?.[0];
  const isDay = cond?.icon?.includes("d") ?? true;
  const group = cond ? Math.floor(cond.id / 100) : null;
  const preferLightText =
    !isDay || group === 2 || group === 3 || group === 5 || group === 7;
  const textClass = preferLightText ? "text-slate-50" : "text-slate-900";
  const iconWrapperClass = preferLightText
    ? "bg-white/10 text-white border-white/20"
    : "bg-white/60 text-slate-900 border-white/60";
  const iconClass = preferLightText
    ? "size-10 drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]"
    : "size-10 drop-shadow-[0_0_6px_rgba(15,23,42,0.2)]";
  const icon = getIcon(cond?.id, isDay, iconClass);

  const bg = (() => {
    // Color brutalista por grupo
    const id = cond?.id ?? 0;
    if (id === 0) return "#f3f4f6ff"; // sin datos
    const g = Math.floor(id / 100);
    switch (g) {
      case 2:
        return "#8b5cf6"; // tormenta
      case 3:
      case 5:
        return "#3b82f6"; // lluvia
      case 6:
        return "#06b6d4"; // nieve
      case 7:
        return "#64748b"; // niebla
      case 8:
        return "#9ca3af"; // nubes
      default:
        return isDay ? "#f59e0b" : "#4f46e5"; // claro / noche
    }
  })();

  type OpenWeatherResponse = {
    weather: { id: number; main: string; description: string; icon: string }[];
    main: { temp: number; feels_like?: number; humidity?: number };
    wind?: { speed?: number };
    name: string;
  };

  function getIcon(id?: number, isDay = true, className = "size-10") {
    if (!id) return <Cloud className={className} />;
    if (id === 800)
      return isDay ? (
        <Sun className={className} />
      ) : (
        <Moon className={className} />
      );
    const group = Math.floor(id / 100);
    switch (group) {
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

  return (
    <Card
      className={cn("relative h-full overflow-hidden p-4")}
      style={{ backgroundColor: bg }}
    >
      <WeatherBackdrop conditionId={cond?.id} isDay={isDay} />
      <div
        className={cn(
          "relative z-10 flex h-full flex-col justify-center",
          textClass
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "grid size-14 place-items-center rounded-full border shadow-lg shadow-black/10 backdrop-blur-sm transition-colors duration-700",
              iconWrapperClass
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">
              {data?.name ?? "Meteo"}
            </div>
            <div className="truncate text-sm capitalize opacity-80">
              {loading ? "Cargando…" : error ? error : cond?.description ?? "—"}
            </div>
          </div>
          <div className="ml-auto flex flex-col items-end justify-center text-right">
            <div className="text-3xl font-bold tabular-nums drop-shadow-[0_1px_4px_rgba(15,23,42,0.35)]">
              {typeof data?.main?.temp === "number"
                ? Math.round(data!.main!.temp) + "º"
                : "—"}
            </div>
            <div className="text-xs opacity-80">
              {typeof data?.main?.feels_like === "number" && (
                <span>ST {Math.round(data!.main!.feels_like!)}º</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
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
      <span key={`snow-${i}`} className="weather-snow-flake" style={style} />
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
