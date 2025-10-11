import { useEffect, useState } from "react";
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

export default function WeatherWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const city = String(config["city"] ?? "Madrid,ES");
  const units = String(config["units"] ?? "metric");
  const [data, setData] = useState<OpenWeatherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const apiKey = String(config["apiKey"] ?? "");
  const lang = String(config["language"] ?? "en");

  useEffect(() => {
    async function fetchWeather() {
      if (!apiKey) {
        setError("Falta VITE_OPENWEATHER_API_KEY en .env");
        setLoading(false);
        return;
      }
      if (!city) {
        setError("Falta VITE_OPENWEATHER_CITY en .env");
        setLoading(false);
        return;
      }
      const base = "https://api.openweathermap.org/data/2.5/weather";
      const url = `${base}?q=${encodeURIComponent(
        city
      )}&units=${units}&lang=${lang}&appid=${apiKey}`;
      try {
        setLoading(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as OpenWeatherResponse;
        setData(json);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
    const id = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [apiKey, city, units, lang]);

  const cond = data?.weather?.[0];
  const isDay = cond?.icon?.includes("d") ?? true;
  const icon = getIcon(cond?.id, isDay);

  const bg = (() => {
    // Color brutalista por grupo
    const id = cond?.id ?? 800;
    if (id === 800) return isDay ? "#f59e0b" : "#4f46e5"; // sol / noche
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
        return "#22c55e";
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
        <Sun className={className} color="white" />
      ) : (
        <Moon className={className} color="white" />
      );
    const group = Math.floor(id / 100);
    switch (group) {
      case 2:
        return <CloudLightning className={className} color="white" />;
      case 3:
        return <CloudDrizzle className={className} color="white" />;
      case 5:
        return <CloudRain className={className} color="white" />;
      case 6:
        return <Snowflake className={className} color="white" />;
      case 7:
        return <Wind className={className} color="white" />;
      default:
        return <Cloud className={className} color="white" />;
    }
  }

  return (
    <Card
      className={`rounded-xl p-4 h-full`}
      style={{ backgroundColor: bg }}
    >
      <div className="h-full flex flex-col justify-center">
        <div className="flex items-center gap-4">
          <div className="text-zinc-900">{icon}</div>
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">
              {data?.name ?? "Meteo"}
            </div>
            <div className="text-sm capitalize truncate opacity-80">
              {loading ? "Cargando…" : error ? error : cond?.description ?? "—"}
            </div>
          </div>
          <div className="ml-auto text-right flex flex-col justify-center items-end">
            <div className="text-3xl font-bold tabular-nums">
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
