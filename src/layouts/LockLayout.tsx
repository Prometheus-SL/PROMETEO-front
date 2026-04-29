import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Loader2,
  Music2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSharedValue } from "@/hooks/useSharedContext";
import { api } from "@/lib/api";
import {
  buildLockScreenOverlayBackground,
  GLOBAL_LOCK_SCREEN_CONFIG_EVENT,
  hasLockScreenConfig,
  isLockScreenSleepScheduleActive,
  persistGlobalLockScreenConfig,
  readLockScreenConfig,
  readPersistedGlobalLockScreenConfig,
  resolveLockScreenCanvasBackground,
  resolveNasaApodImageUrl,
  resolvePlaylistImageUrl,
  type LockScreenConfig,
} from "@/layouts/lock-screen-config";
import { cn } from "@/lib/utils";
import { dashboardService } from "@/services/dashboards";
import { SharedKeys } from "@/types/shared";
import type { MediaSession } from "@/types/shared";

const NASA_APOD_CACHE_KEY = "prometeo.client.nasa-apod";
const LOCK_SCREEN_WEATHER_REFRESH_MS = 15 * 60 * 1000;

type LockScreenWeatherResponse = {
  weather: { id: number; main: string; description: string; icon: string }[];
  main: { temp: number; feels_like?: number; humidity?: number };
  wind?: { speed?: number };
  name: string;
};

type LockScreenWeatherState = {
  data: LockScreenWeatherResponse | null;
  loading: boolean;
  error: string | null;
};

function LockLayout() {
  const mediaSession = useSharedValue<MediaSession>(SharedKeys.MEDIA_SESSION);
  const [now, setNow] = useState(() => new Date());
  const [config, setConfig] = useState<LockScreenConfig>(() =>
    readPersistedGlobalLockScreenConfig(),
  );
  const [nasaApodImageUrl, setNasaApodImageUrl] = useState<string | null>(null);
  const [weatherState, setWeatherState] = useState<LockScreenWeatherState>({
    data: null,
    loading: false,
    error: null,
  });
  const isSleepModeActive = isLockScreenSleepScheduleActive(
    config.sleepSchedule,
    now,
  );
  const isWeatherWidgetEnabled =
    !isSleepModeActive && config.enabledWidgets.includes("weather");

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      setConfig(readPersistedGlobalLockScreenConfig());
    };

    syncFromStorage();
    window.addEventListener(GLOBAL_LOCK_SCREEN_CONFIG_EVENT, syncFromStorage);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(
        GLOBAL_LOCK_SCREEN_CONFIG_EVENT,
        syncFromStorage,
      );
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateRemoteConfig = async () => {
      try {
        const page = await dashboardService.getActivePage();
        if (cancelled || !page || !hasLockScreenConfig(page.style)) return;

        const remoteConfig = readLockScreenConfig(page.style);
        setConfig(remoteConfig);
        persistGlobalLockScreenConfig(remoteConfig);
      } catch (error) {
        if (!cancelled) {
          console.error("[lock-screen] config-hydrate-error", error);
        }
      }
    };

    void hydrateRemoteConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isWeatherWidgetEnabled) {
      setWeatherState({ data: null, loading: false, error: null });
      return;
    }

    const city = config.weatherCity.trim();
    if (!city) {
      setWeatherState({
        data: null,
        loading: false,
        error: "Weather city is not configured.",
      });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const hydrateWeather = async (isRefresh = false) => {
      setWeatherState((current) => ({
        data: current.data,
        loading: !isRefresh || !current.data,
        error: null,
      }));

      try {
        const params = new URLSearchParams({
          city,
          units: config.weatherUnits,
          lang: config.weatherLanguage,
        });
        const data = await api.getData<LockScreenWeatherResponse>(
          `/api/v1/integrations/weather/current?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!cancelled) {
          setWeatherState({ data, loading: false, error: null });
        }
      } catch (error) {
        if (cancelled) return;
        setWeatherState((current) => ({
          data: current.data,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not load weather data.",
        }));
      }
    };

    void hydrateWeather();
    const interval = window.setInterval(() => {
      void hydrateWeather(true);
    }, LOCK_SCREEN_WEATHER_REFRESH_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [
    isWeatherWidgetEnabled,
    config.weatherCity,
    config.weatherLanguage,
    config.weatherUnits,
  ]);

  useEffect(() => {
    if (isSleepModeActive || config.backgroundMode !== "nasa-apod") {
      setNasaApodImageUrl(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const hydrateNasaApod = async () => {
      const cached = readNasaApodCache();
      const today = new Date().toISOString().slice(0, 10);

      if (cached?.date === today && cached.imageUrl) {
        setNasaApodImageUrl(cached.imageUrl);
        return;
      }

      try {
        const apiKey = String(import.meta.env.VITE_NASA_APOD_API_KEY || "").trim();
        const response = await fetch(
          `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(
            apiKey || "DEMO_KEY",
          )}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`NASA APOD returned ${response.status}`);
        }

        const payload = await response.json();
        const imageUrl = resolveNasaApodImageUrl(payload);

        if (!cancelled) {
          setNasaApodImageUrl(imageUrl);
        }

        if (imageUrl) {
          writeNasaApodCache({ date: today, imageUrl });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[lock-screen] nasa-apod-error", error);
          setNasaApodImageUrl(null);
        }
      }
    };

    void hydrateNasaApod();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [config.backgroundMode, isSleepModeActive]);

  const timeLabel = useMemo(
    () =>
      now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: config.showSeconds ? "2-digit" : undefined,
        hour12: !config.use24Hour,
      }),
    [config.showSeconds, config.use24Hour, now],
  );

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [now],
  );

  const backgroundImageUrl = useMemo(() => {
    if (isSleepModeActive) {
      return null;
    }

    if (
      config.backgroundMode === "media-artwork" &&
      mediaSession?.isPlaying &&
      mediaSession.artwork
    ) {
      return mediaSession.artwork;
    }

    if (config.backgroundMode === "single-image" && config.imageUrl) {
      return config.imageUrl;
    }

    if (config.backgroundMode === "playlist") {
      return resolvePlaylistImageUrl(
        config.playlist,
        now.getTime(),
        config.playlistIntervalSeconds,
      );
    }

    if (config.backgroundMode === "nasa-apod") {
      return nasaApodImageUrl;
    }

    return null;
  }, [
    config,
    isSleepModeActive,
    mediaSession?.artwork,
    mediaSession?.isPlaying,
    nasaApodImageUrl,
    now,
  ]);

  const canvasBackground = useMemo(
    () =>
      isSleepModeActive
        ? "#000000"
        : resolveLockScreenCanvasBackground(config) ??
          getNeutralLockBackground(config.backgroundMode),
    [config, isSleepModeActive],
  );

  const showNowPlayingWidget =
    !isSleepModeActive &&
    config.enabledWidgets.includes("now-playing") &&
    mediaSession?.isPlaying === true;
  const hasLockWidgets = isWeatherWidgetEnabled || showNowPlayingWidget;

  if (isSleepModeActive) {
    return (
      <div
        className="absolute inset-0 z-[1000] grid min-h-screen w-full place-items-center overflow-hidden bg-black text-white"
        aria-label="Sleep hours lock screen"
      >
        <time
          className="max-w-[90vw] text-center text-[5rem] font-semibold leading-none tracking-normal opacity-[0.16] sm:text-[6.5rem]"
          aria-live="polite"
        >
          {timeLabel}
        </time>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[1000] flex min-h-screen w-full overflow-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: canvasBackground }}
      />

      {backgroundImageUrl ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-105 bg-cover bg-center"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            filter: `grayscale(6%) brightness(0.82) blur(${config.blurPx}px)`,
          }}
        />
      ) : null}

      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: buildLockScreenOverlayBackground(config.overlayOpacity),
        }}
      />

      <div className="relative z-10 h-full w-full">
        <div
          className={cn(
            "absolute inset-0 flex px-6 py-8 sm:px-10 sm:py-10",
            getLayoutPositionClass(config.clockPosition),
          )}
        >
          <div
            className={cn(
              "flex w-full max-w-[38rem] flex-col gap-6",
              config.clockPosition.includes("right") && "items-end text-right",
              config.clockPosition === "center" && "items-center text-center",
            )}
          >
            <div
              style={{
                transform: `scale(${config.clockScale / 100})`,
                transformOrigin: getScaleOrigin(config.clockPosition),
              }}
              className="w-full max-w-[22rem]"
            >
              <LockClockPanel
                config={config}
                timeLabel={timeLabel}
                dateLabel={dateLabel}
              />
            </div>
          </div>
        </div>

        {hasLockWidgets ? (
          <LockWidgetRail
            config={config}
            mediaSession={mediaSession}
            weatherState={weatherState}
          />
        ) : null}
      </div>
    </div>
  );
}

function LockWidgetRail({
  config,
  mediaSession,
  weatherState,
}: {
  config: LockScreenConfig;
  mediaSession?: MediaSession | null;
  weatherState: LockScreenWeatherState;
}) {
  return (
    <aside
      className="absolute bottom-4 right-4 z-20 flex w-[min(calc(100vw-2rem),28rem)] max-h-[calc(100dvh-2rem)] flex-col-reverse gap-3 overflow-visible sm:bottom-6 sm:right-6 lg:bottom-10 lg:right-10 lg:w-[min(36vw,28rem)]"
      aria-label="Lock screen information widgets"
    >
      {config.enabledWidgets.includes("now-playing") &&
      mediaSession?.isPlaying === true ? (
        <NowPlayingInfoBox config={config} mediaSession={mediaSession} />
      ) : null}
      {config.enabledWidgets.includes("weather") ? (
        <WeatherInfoBox config={config} weatherState={weatherState} />
      ) : null}
    </aside>
  );
}

function WeatherInfoBox({
  config,
  weatherState,
}: {
  config: LockScreenConfig;
  weatherState: LockScreenWeatherState;
}) {
  const data = weatherState.data;
  const condition = data?.weather?.[0];
  const temp =
    typeof data?.main?.temp === "number" ? Math.round(data.main.temp) : null;
  const feelsLike =
    typeof data?.main?.feels_like === "number"
      ? Math.round(data.main.feels_like)
      : null;
  const location = data?.name || config.weatherCity;
  const unitLabel = config.weatherUnits === "imperial" ? "F" : "C";

  return (
    <LockInfoBox
      accent="#60a5fa"
      config={config}
      label={`Weather - ${location}`}
    >
      {weatherState.loading && !data ? (
        <LockWidgetState
          icon={<Loader2 className="size-4 animate-spin" />}
          title="Loading weather"
          message={`Checking ${config.weatherCity}.`}
        />
      ) : weatherState.error && !data ? (
        <LockWidgetState
          icon={<AlertTriangle className="size-4" />}
          title="Weather unavailable"
          message={weatherState.error}
        />
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex items-start gap-1">
            <span className="text-[2.55rem] font-semibold leading-none tracking-[-0.08em] tabular-nums text-white">
              {temp ?? "--"}°
            </span>
            <span className="pt-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/52">
              {unitLabel}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-white">
              {capitalizeText(condition?.description)}
            </p>
            <p className="truncate text-sm text-white/62">
              Feels {feelsLike ?? "--"}° · wind{" "}
              {formatWind(data?.wind?.speed, config.weatherUnits)}
            </p>
          </div>
        </div>
      )}
    </LockInfoBox>
  );
}

function NowPlayingInfoBox({
  config,
  mediaSession,
}: {
  config: LockScreenConfig;
  mediaSession?: MediaSession | null;
}) {
  if (!mediaSession?.isPlaying) {
    return null;
  }

  const progressValue =
    mediaSession.timestamp && mediaSession.duration
      ? Math.max(
          0,
          Math.min(100, (mediaSession.timestamp / mediaSession.duration) * 100),
        )
      : 0;
  const sourceLabel = String(
    mediaSession.sourceAppName ||
      mediaSession.provider ||
      mediaSession.source ||
      "media",
  ).toUpperCase();

  return (
    <LockInfoBox
      accent="#34d399"
      config={config}
      label={`Now playing - ${sourceLabel}`}
    >
      <div className="flex items-center gap-4">
        {mediaSession.artwork ? (
          <img
            src={mediaSession.artwork}
            alt={`${mediaSession.title} artwork`}
            className="size-14 shrink-0 rounded-2xl border border-white/10 object-cover shadow-[0_16px_40px_rgba(0,0,0,0.38)]"
          />
        ) : (
          <div
            className="grid size-14 shrink-0 place-items-center rounded-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.28)]"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(
                config.accentColor,
                0.5,
              )}, rgba(255,255,255,0.08))`,
            }}
          >
            <Music2 className="size-5 text-white/80" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">
            {mediaSession.title || "Untitled"}
          </p>
          <p className="truncate text-sm text-white/62">
            {mediaSession.artist || mediaSession.album || sourceLabel}
          </p>
        </div>
      </div>

      {mediaSession.timestamp && mediaSession.duration ? (
        <div className="mt-4 space-y-2">
          <Progress
            value={progressValue}
            max={100}
            className="h-1.5 bg-white/12"
          />
          <div className="flex items-center justify-between text-xs text-white/55">
            <span>{formatMediaTime(mediaSession.timestamp)}</span>
            <span>{formatMediaTime(mediaSession.duration)}</span>
          </div>
        </div>
      ) : null}
    </LockInfoBox>
  );
}

function LockInfoBox({
  accent,
  config,
  label,
  children,
}: {
  accent: string;
  config: LockScreenConfig;
  label: string;
  children: ReactNode;
}) {
  const widgetStyle = getLockInfoBoxStyle(config, accent);

  return (
    <section
      className={widgetStyle.className}
      style={widgetStyle.style}
    >
      <div className={widgetStyle.labelClassName}>
        {label}
      </div>
      {children}
    </section>
  );
}

function LockWidgetState({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-white">{title}</p>
        <p className="text-sm text-white/62">{message}</p>
      </div>
    </div>
  );
}

function LockClockPanel({
  config,
  timeLabel,
  dateLabel,
}: {
  config: LockScreenConfig;
  timeLabel: string;
  dateLabel: string;
}) {
  if (config.clockStyle === "minimal") {
    return (
      <div className="space-y-3">
        <time
          className="block text-[clamp(4rem,10vw,6rem)] font-semibold leading-none tracking-[-0.09em] tabular-nums"
          aria-live="polite"
          style={{
            textShadow: `0 22px 60px ${hexToRgba(config.accentColor, 0.22)}`,
          }}
        >
          {timeLabel}
        </time>
        {config.showDate ? (
          <span
            className="block text-sm uppercase tracking-[0.34em] text-white/72"
            aria-hidden="true"
          >
            {dateLabel}
          </span>
        ) : null}
      </div>
    );
  }

  if (config.clockStyle === "poster") {
    return (
      <div
        className="w-full rounded-[30px] border border-white/10 bg-black/20 p-7 backdrop-blur-xl"
        style={{
          boxShadow: `0 24px 90px rgba(0, 0, 0, 0.46), 0 0 0 1px ${hexToRgba(
            config.accentColor,
            0.22,
          )}`,
        }}
      >
        <div
          className="mb-5 h-1.5 w-20 rounded-full"
          style={{ backgroundColor: config.accentColor }}
        />
        <div className="text-xs uppercase tracking-[0.42em] text-white/60">
          LOCK SCREEN
        </div>
        <time
          className="mt-4 block text-[clamp(4rem,9vw,5.7rem)] font-semibold leading-none tracking-[-0.1em] tabular-nums"
          aria-live="polite"
        >
          {timeLabel}
        </time>
        {config.showDate ? (
          <span className="mt-5 block text-lg text-white/80" aria-hidden="true">
            {dateLabel}
          </span>
        ) : null}
      </div>
    );
  }

  if (config.clockStyle === "terminal") {
    return (
      <div
        className="w-full rounded-[24px] border border-emerald-400/35 bg-black/82 p-6 font-mono text-emerald-300 shadow-2xl"
        style={{
          boxShadow: `0 0 0 1px ${hexToRgba(config.accentColor, 0.15)}, 0 24px 80px rgba(0, 0, 0, 0.52)`,
        }}
      >
        <div className="mb-3 text-xs uppercase tracking-[0.35em] text-emerald-400/78">
          SYSTEM IDLE
        </div>
        <time className="text-[3.2rem] font-semibold leading-none tabular-nums">
          {timeLabel}
        </time>
        {config.showDate ? (
          <div className="mt-4 text-sm text-emerald-300/74">{dateLabel}</div>
        ) : null}
      </div>
    );
  }

  if (config.clockStyle === "capsule") {
    return (
      <div
        className="w-full rounded-full border border-white/12 bg-white/10 px-8 py-7 text-center shadow-2xl backdrop-blur-xl"
        style={{
          boxShadow: `0 28px 90px rgba(0, 0, 0, 0.42), 0 0 0 1px ${hexToRgba(
            config.accentColor,
            0.22,
          )}`,
        }}
      >
        <div
          className="mb-2 text-xs uppercase tracking-[0.34em]"
          style={{ color: hexToRgba(config.accentColor, 0.94) }}
        >
          PROMETEO
        </div>
        <time className="text-[3rem] font-semibold leading-none tracking-[-0.08em] tabular-nums">
          {timeLabel}
        </time>
        {config.showDate ? (
          <div className="mt-3 text-sm text-white/72">{dateLabel}</div>
        ) : null}
      </div>
    );
  }

  return (
    <Card
      className="w-full border-white/10 bg-white/10 py-0 text-white shadow-2xl backdrop-blur-xl"
      style={{
        boxShadow: `0 28px 100px rgba(0, 0, 0, 0.5), 0 0 0 1px ${hexToRgba(
          config.accentColor,
          0.18,
        )}`,
      }}
    >
      <CardContent className="flex flex-col gap-6 px-8 py-8">
        <div
          className="text-xs uppercase tracking-[0.32em]"
          style={{ color: hexToRgba(config.accentColor, 0.92) }}
        >
          Prometeo Client
        </div>
        <time
          className="text-[clamp(4rem,9vw,5.8rem)] font-semibold leading-none tracking-[-0.09em] tabular-nums"
          aria-live="polite"
        >
          {timeLabel}
        </time>
        {config.showDate ? (
          <span className="text-lg tracking-wide text-white/72" aria-hidden="true">
            {dateLabel}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getLayoutPositionClass(position: LockScreenConfig["clockPosition"]) {
  if (position === "center-left") return "items-center justify-start";
  if (position === "center-right") return "items-center justify-end";
  if (position === "top-left") return "items-start justify-start";
  if (position === "top-right") return "items-start justify-end";
  if (position === "bottom-left") return "items-end justify-start";
  if (position === "bottom-right") return "items-end justify-end";
  return "items-center justify-center";
}

function getScaleOrigin(position: LockScreenConfig["clockPosition"]) {
  if (position === "center-left") return "center left";
  if (position === "center-right") return "center right";
  if (position === "top-left") return "top left";
  if (position === "top-right") return "top right";
  if (position === "bottom-left") return "bottom left";
  if (position === "bottom-right") return "bottom right";
  return "center center";
}

function getLockInfoBoxStyle(
  config: Pick<LockScreenConfig, "accentColor" | "clockStyle">,
  accent: string,
): {
  className: string;
  labelClassName: string;
  style: CSSProperties;
} {
  const baseClassName =
    "border px-5 py-4 text-left transition-colors duration-200";
  const baseLabelClassName =
    "mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.36em]";

  if (config.clockStyle === "minimal") {
    return {
      className: cn(
        baseClassName,
        "rounded-[20px] border-white/12 bg-black/42 shadow-[0_22px_70px_rgba(0,0,0,0.32)] backdrop-blur-md",
      ),
      labelClassName: cn(baseLabelClassName, "text-white/45"),
      style: {
        boxShadow: `0 22px 70px rgba(0, 0, 0, 0.32), inset 0 1px 0 ${hexToRgba(
          accent,
          0.16,
        )}`,
      },
    };
  }

  if (config.clockStyle === "poster") {
    return {
      className: cn(
        baseClassName,
        "rounded-[30px] border-white/10 bg-black/24 shadow-[0_24px_90px_rgba(0,0,0,0.46)] backdrop-blur-xl",
      ),
      labelClassName: cn(baseLabelClassName, "text-white/56"),
      style: {
        borderColor: hexToRgba(config.accentColor, 0.22),
        boxShadow: `0 24px 90px rgba(0, 0, 0, 0.46), 0 0 0 1px ${hexToRgba(
          config.accentColor,
          0.16,
        )}`,
      },
    };
  }

  if (config.clockStyle === "terminal") {
    return {
      className: cn(
        baseClassName,
        "rounded-[24px] border-emerald-400/35 bg-black/82 font-mono text-emerald-200 shadow-2xl [&_p]:text-emerald-200 [&_span]:text-emerald-300 [&_svg]:text-emerald-300",
      ),
      labelClassName: cn(baseLabelClassName, "text-emerald-400/72"),
      style: {
        boxShadow: `0 0 0 1px ${hexToRgba(
          config.accentColor,
          0.15,
        )}, 0 24px 80px rgba(0, 0, 0, 0.52)`,
      },
    };
  }

  if (config.clockStyle === "capsule") {
    return {
      className: cn(
        baseClassName,
        "rounded-[32px] border-white/12 bg-white/10 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl",
      ),
      labelClassName: cn(baseLabelClassName, "text-white/52"),
      style: {
        boxShadow: `0 28px 90px rgba(0, 0, 0, 0.42), 0 0 0 1px ${hexToRgba(
          config.accentColor,
          0.18,
        )}`,
      },
    };
  }

  return {
    className: cn(
      baseClassName,
      "rounded-[24px] shadow-[0_28px_80px_rgba(0,0,0,0.36)] backdrop-blur-xl",
    ),
    labelClassName: cn(baseLabelClassName, "text-white/48"),
    style: {
      borderColor: hexToRgba(accent, 0.32),
      background: `linear-gradient(135deg, ${hexToRgba(
        accent,
        0.12,
      )}, rgba(8, 9, 13, 0.76))`,
    },
  };
}

function getNeutralLockBackground(mode: LockScreenConfig["backgroundMode"]) {
  if (mode === "nasa-apod") {
    return "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 22%), radial-gradient(circle at 72% 18%, rgba(255,255,255,0.06), transparent 18%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.04), transparent 24%), linear-gradient(180deg, #000000 0%, #090909 100%)";
  }

  return "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), radial-gradient(circle at bottom right, rgba(255,255,255,0.05), transparent 26%), linear-gradient(180deg, #000000 0%, #0a0a0a 100%)";
}

function capitalizeText(value?: string) {
  if (!value) return "No data";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatWind(speed?: number, units: LockScreenConfig["weatherUnits"] = "metric") {
  if (typeof speed !== "number") return "--";
  if (units === "imperial") return `${Math.round(speed)} mph`;
  return `${Math.round(speed * 3.6)} km/h`;
}

function formatMediaTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = normalizeColor(hex).replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const parsed = Number.parseInt(full, 16);
  const red = (parsed >> 16) & 255;
  const green = (parsed >> 8) & 255;
  const blue = parsed & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function normalizeColor(color: string) {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)
    ? color
    : "#f8fafc";
}

function readNasaApodCache():
  | {
      date: string;
      imageUrl: string;
    }
  | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(NASA_APOD_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      date?: string;
      imageUrl?: string;
    };

    if (
      typeof parsed.date === "string" &&
      typeof parsed.imageUrl === "string" &&
      parsed.imageUrl
    ) {
      return { date: parsed.date, imageUrl: parsed.imageUrl };
    }
  } catch {
    return null;
  }

  return null;
}

function writeNasaApodCache(entry: { date: string; imageUrl: string }) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(NASA_APOD_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // noop
  }
}

export default LockLayout;
