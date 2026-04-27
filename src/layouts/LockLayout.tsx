import { useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSharedValue } from "@/hooks/useSharedContext";
import {
  buildLockScreenOverlayBackground,
  GLOBAL_LOCK_SCREEN_CONFIG_EVENT,
  readPersistedGlobalLockScreenConfig,
  resolveLockScreenCanvasBackground,
  resolveNasaApodImageUrl,
  resolvePlaylistImageUrl,
  type LockScreenConfig,
} from "@/layouts/lock-screen-config";
import { cn } from "@/lib/utils";
import { SharedKeys } from "@/types/shared";
import type { MediaSession } from "@/types/shared";

const NASA_APOD_CACHE_KEY = "prometeo.client.nasa-apod";

function LockLayout() {
  const mediaSession = useSharedValue<MediaSession>(SharedKeys.MEDIA_SESSION);
  const [now, setNow] = useState(() => new Date());
  const [config, setConfig] = useState<LockScreenConfig>(() =>
    readPersistedGlobalLockScreenConfig(),
  );
  const [nasaApodImageUrl, setNasaApodImageUrl] = useState<string | null>(null);

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
    if (config.backgroundMode !== "nasa-apod") {
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
  }, [config.backgroundMode]);

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
  }, [config, mediaSession?.artwork, mediaSession?.isPlaying, nasaApodImageUrl, now]);

  const canvasBackground = useMemo(
    () =>
      resolveLockScreenCanvasBackground(config) ??
      getNeutralLockBackground(config.backgroundMode),
    [config],
  );

  const showMediaInfo = mediaSession !== null && mediaSession !== undefined;

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

      <div
        className={cn(
          "relative z-10 flex w-full px-6 py-8 sm:px-10 sm:py-10",
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

          {showMediaInfo && mediaSession ? (
            <Card className="w-full border-white/10 bg-white/[0.06] py-0 text-white shadow-xl backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-semibold text-white">
                    {mediaSession.title}
                  </h3>
                  <p className="truncate text-sm text-white/70">
                    {mediaSession.artist}
                  </p>
                  {mediaSession.timestamp && mediaSession.duration ? (
                    <Progress
                      value={Math.max(
                        0,
                        Math.min(
                          100,
                          (mediaSession.timestamp / mediaSession.duration) * 100,
                        ),
                      )}
                      max={100}
                      className="mt-3 h-2 bg-white/10"
                    />
                  ) : null}
                </div>

                <div className="flex-shrink-0">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm"
                    style={{
                      backgroundColor: hexToRgba(config.accentColor, 0.16),
                      boxShadow: `0 0 0 1px ${hexToRgba(
                        config.accentColor,
                        0.22,
                      )} inset`,
                    }}
                  >
                    {mediaSession.source.toUpperCase()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
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
  if (position === "top-left") return "items-start justify-start";
  if (position === "top-right") return "items-start justify-end";
  if (position === "bottom-left") return "items-end justify-start";
  if (position === "bottom-right") return "items-end justify-end";
  return "items-center justify-center";
}

function getScaleOrigin(position: LockScreenConfig["clockPosition"]) {
  if (position === "top-left") return "top left";
  if (position === "top-right") return "top right";
  if (position === "bottom-left") return "bottom left";
  if (position === "bottom-right") return "bottom right";
  return "center center";
}

function getNeutralLockBackground(mode: LockScreenConfig["backgroundMode"]) {
  if (mode === "nasa-apod") {
    return "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 22%), radial-gradient(circle at 72% 18%, rgba(255,255,255,0.06), transparent 18%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.04), transparent 24%), linear-gradient(180deg, #000000 0%, #090909 100%)";
  }

  return "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), radial-gradient(circle at bottom right, rgba(255,255,255,0.05), transparent 26%), linear-gradient(180deg, #000000 0%, #0a0a0a 100%)";
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
