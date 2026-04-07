import { useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useSharedValue } from "@/hooks/useSharedContext";
import { SharedKeys } from "@/types/shared";
import type { MediaSession } from "@/types/shared";

function LockLayout() {
  const mediaSession = useSharedValue<MediaSession>(SharedKeys.MEDIA_SESSION);
  const [now, setNow] = useState(() => new Date());
  const locale = useMemo(
    () => (typeof navigator !== "undefined" ? navigator.language : "es-ES"),
    []
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const timeLabel = useMemo(
    () =>
      now.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        hourCycle: "h23",
      }),
    [locale, now]
  );

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [locale, now]
  );

  const showBackground = mediaSession?.isPlaying;
  const showMediaInfo = mediaSession !== null && mediaSession !== undefined;

  return (
    <div className="absolute z-1000 flex min-h-screen w-full items-center justify-center overflow-hidden bg-black text-white">
      {showBackground && mediaSession?.artwork && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${mediaSession.artwork})`,
              filter: "grayscale(100%) brightness(0.8) blur(4px)",
            }}
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}

      <div className="relative z-10 flex w-full flex-col items-center gap-8">
        <Card className="w-90 border-dashed border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur-lg">
          <CardContent className="flex flex-col items-center gap-6">
            <time
              className="text-7xl font-semibold tabular-nums"
              aria-live="polite"
            >
              {timeLabel}
            </time>
            <Separator className="bg-white/10" />
            <span
              className="text-lg tracking-wide text-white/70"
              aria-hidden="true"
            >
              {dateLabel.replace(/^\w/, (c: string) => c.toUpperCase())}
            </span>
          </CardContent>
        </Card>

        {showMediaInfo && mediaSession && (
          <Card className="w-90 animate-in border-white/10 bg-white/5 py-0 text-white shadow-xl duration-500 fade-in backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold text-white">
                  {mediaSession.title}
                </h3>
                <p className="truncate text-sm text-white/70">
                  {mediaSession.artist}
                </p>
                {mediaSession.timestamp && mediaSession.duration && (
                  <Progress
                    value={Math.max(
                      0,
                      Math.min(
                        100,
                        (mediaSession.timestamp / mediaSession.duration) * 100
                      )
                    )}
                    max={100}
                    className="mt-2 h-2"
                  />
                )}
              </div>

              <div className="flex-shrink-0">
                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                  {mediaSession.source.toUpperCase()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default LockLayout;
