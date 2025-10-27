import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useSharedValue } from "@/hooks/useSharedContext";
import { SharedKeys } from "@/types/shared";
import type { MediaSession } from "@/types/shared";

interface LockLayoutProps {
  timeLabel: string;
  dateLabel: string;
}

function LockLayout({ timeLabel, dateLabel }: LockLayoutProps) {
  const mediaSession = useSharedValue<MediaSession>(SharedKeys.MEDIA_SESSION);

  // Mostrar fondo solo si está reproduciéndose activamente
  const showBackground = mediaSession?.isPlaying;
  // Mostrar info si hay sesión (aunque esté pausada)
  const showMediaInfo = mediaSession !== null && mediaSession !== undefined;

  return (
    <div className="absolute flex min-h-screen w-full items-center justify-center bg-black text-white overflow-hidden z-1000">
      {/* Fondo con artwork si hay música sonando */}
      {showBackground && mediaSession?.artwork && (
        <>
          {/* Imagen de fondo oscurecida */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${mediaSession.artwork})`,
              filter: "grayscale(100%) brightness(0.8) blur(4px)",
            }}
          />
          {/* Overlay adicional para más oscuridad */}
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}

      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full">
        <Card className="bg-white/10 text-white shadow-2xl backdrop-blur-lg border-white/10 border-dashed w-90">
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

        {/* Información de la canción */}
        {showMediaInfo && mediaSession && (
          <Card className="bg-white/5 text-white shadow-xl backdrop-blur-md border-white/10 animate-in fade-in duration-500 py-0 w-90">
            <CardContent className="flex items-center gap-4 p-4">
              {/* Info de la canción */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate text-white">
                  {mediaSession.title}
                </h3>
                <p className="text-sm text-white/70 truncate">
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

              {/* Badge de fuente */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/90 backdrop-blur-sm">
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
