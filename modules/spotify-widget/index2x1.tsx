import { Music2 } from "lucide-react";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";
import { useSpotifyState } from "./useSpotifyState";

export default function SpotifyWidgetCompact({
  config,
  onConfigChange,
}: {
  config: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}) {
  // Usar el hook compartido
  const {
    auth,
    playbackState,
    isTransitioning,
    startOAuthFlow,
  } = useSpotifyState(config);

  const track = playbackState?.item;
  const albumArt = track?.album?.images?.[0]?.url;
  const progress = playbackState?.progress_ms ?? 0;
  const duration = track?.duration_ms ?? 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!auth.isAuthenticated) {
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
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 via-primary/10 to-background" />

        <CardHeader className="relative pb-2 flex flex-col">
          <CardDescription className="text-xs flex justify-center">
            <Button
              onClick={() => startOAuthFlow(onConfigChange)}
              variant="default"
              size="sm"
            >
              Connect Spotify
            </Button>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="relative h-full overflow-hidden border border-border/60 bg-background/90 shadow-lg shadow-primary/10">
      <GridPattern
        width={30}
        height={30}
        x={-1}
        y={-1}
        strokeDasharray="4 2"
        className="pointer-events-none opacity-40 [mask-image:radial-gradient(360px_circle_at_center,white,transparent)]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-green-500/15 via-primary/10 to-background"
        style={{
          backgroundImage: albumArt
            ? `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.85)), url(${albumArt})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {albumArt && (
        <div className="absolute inset-0 backdrop-blur-xs bg-background/40 rounded-xl" />
      )}

      <div className="relative flex h-full items-center gap-3 p-3">
        {/* Álbum */}
        {albumArt ? (
          <img
            src={albumArt}
            alt="Album art"
            className={cn(
              "size-16 rounded-lg shadow-xl transition-all duration-500 ease-in-out shrink-0",
              isTransitioning
                ? "scale-90 opacity-40 blur-sm"
                : "scale-100 opacity-100 blur-0"
            )}
          />
        ) : (
          <div className="grid size-16 place-items-center rounded-lg border border-border/40 bg-muted shrink-0">
            <Music2 className="size-8 text-muted-foreground" />
          </div>
        )}

        {/* Info y controles */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* Título y artista */}
          <div
            className={cn(
              "min-w-0 transition-all duration-500 ease-in-out",
              isTransitioning
                ? "opacity-30 translate-x-2"
                : "opacity-100 translate-x-0"
            )}
          >
            <h3 className="truncate text-sm font-bold text-foreground drop-shadow-md">
              {track?.name ?? "No track playing"}
            </h3>
            <p className="truncate text-xs text-foreground/80 drop-shadow-sm">
              {track?.artists?.map((a) => a.name).join(", ") ??
                "Unknown artist"}
            </p>
          </div>

          {/* Barra de progreso */}
          <div className="flex items-center gap-2 mx-0">
            <span className="text-[10px] text-foreground/70 w-9 text-right">
              {formatTime(progress)}
            </span>
            <Slider
              value={[progress]}
              max={duration}
              step={1000}
              className="flex-1"
              disabled
            />
            <span className="text-[10px] text-foreground/70 w-9">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
