import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Music2,
  Volume2,
  VolumeX,
  Monitor,
  Smartphone,
  Tablet,
  Speaker,
  Tv,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSpotifyState } from "./useSpotifyState";
import * as React from "react";

export default function SpotifyWidgetQueue({
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
    queue,
    error,
    volume,
    isTransitioning,
    playPause,
    skipNext,
    skipPrevious,
    toggleShuffle,
    toggleRepeat,
    seekToPosition,
    setVolumeLevel,
    fetchQueue,
    playTrack,
    startOAuthFlow,
  } = useSpotifyState(config);

  // Cargar la cola cuando se autentique o cuando cambie la canción
  React.useEffect(() => {
    if (auth.isAuthenticated) {
      fetchQueue();
    }
  }, [auth.isAuthenticated, playbackState?.item?.id, fetchQueue]);

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

  // Función para obtener el icono según el tipo de dispositivo
  const getDeviceIcon = (deviceType?: string) => {
    if (!deviceType) return <Speaker className="size-3" />;

    const type = deviceType.toLowerCase();
    switch (type) {
      case "computer":
        return <Monitor className="size-3" />;
      case "smartphone":
        return <Smartphone className="size-3" />;
      case "tablet":
        return <Tablet className="size-3" />;
      case "speaker":
        return <Speaker className="size-3" />;
      case "tv":
      case "cast_video":
      case "chromecast":
        return <Tv className="size-3" />;
      default:
        return <Speaker className="size-3" />;
    }
  };

  if (!auth.isAuthenticated) {
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
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 via-primary/10 to-background" />

        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <Music2 className="size-5" />
            Spotify Queue
          </CardTitle>
          <CardDescription>
            Connect your Spotify account to view playback queue
          </CardDescription>
        </CardHeader>

        <CardContent className="relative flex flex-col items-center justify-center gap-4">
          <p className="text-center text-sm text-muted-foreground">
            Authenticate with Spotify to display your current playback and
            queue.
          </p>
          <Button
            onClick={() => startOAuthFlow(onConfigChange)}
            variant="default"
            size="lg"
          >
            Connect Spotify
          </Button>
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative h-full overflow-hidden border border-border/60 bg-background/90 shadow-lg shadow-primary/10 py-0">
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
            ? `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url(${albumArt})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {albumArt && (
        <div className="absolute inset-0 backdrop-blur-xs bg-background/40 rounded-xl" />
      )}

      <div className="relative flex h-full gap-3 p-0">
        {/* Columna izquierda: Player principal */}
        <div className="flex-1 flex flex-col min-w-0 my-4 ms-4">
          {/* Álbum y info de canción */}
          <div className="mb-4 flex items-center gap-4">
            {albumArt ? (
              <img
                src={albumArt}
                alt="Album art"
                className={cn(
                  "size-28 rounded-xl shadow-2xl transition-all duration-500 ease-in-out",
                  isTransitioning
                    ? "scale-90 opacity-40 blur-sm"
                    : "scale-100 opacity-100 blur-0"
                )}
              />
            ) : (
              <div className="grid size-32 place-items-center rounded-xl border border-border/40 bg-muted">
                <Music2 className="size-16 text-muted-foreground" />
              </div>
            )}

            <div
              className={cn(
                "min-w-0 flex-1 transition-all duration-500 ease-in-out",
                isTransitioning
                  ? "opacity-30 translate-x-3"
                  : "opacity-100 translate-x-0"
              )}
            >
              <h3 className="truncate text-xl font-bold text-foreground drop-shadow-md mb-1">
                {track?.name ?? "No track playing"}
              </h3>
              <p className="truncate text-base text-foreground/80 drop-shadow-sm mb-2">
                {track?.artists?.map((a) => a.name).join(", ") ??
                  "Unknown artist"}
              </p>
              <Badge
                variant="secondary"
                className="bg-background/80 text-xs px-2 py-1 flex items-center gap-1.5 w-fit"
              >
                {getDeviceIcon(playbackState?.device?.type)}
                <span className="truncate max-w-[150px]">
                  {playbackState?.device?.name ?? "No device"}
                </span>
              </Badge>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mb-3">
            <Slider
              value={[progress]}
              max={duration}
              step={1000}
              onValueChange={([value]) => seekToPosition(value)}
              className="mb-2"
              disabled={!track}
            />
            <div className="flex justify-between text-xs text-foreground/70">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              disabled={!track}
              className={cn(
                "size-9",
                playbackState?.shuffle_state && "text-green-400"
              )}
              title="Shuffle"
            >
              <Shuffle className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={skipPrevious}
              disabled={!track}
              className="size-9"
              title="Previous"
            >
              <SkipBack className="size-4" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={playPause}
              disabled={!track}
              className="size-12"
              title={playbackState?.is_playing ? "Pause" : "Play"}
            >
              {playbackState?.is_playing ? (
                <Pause className="size-5" />
              ) : (
                <Play className="size-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={skipNext}
              disabled={!track}
              className="size-9"
              title="Next"
            >
              <SkipForward className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              disabled={!track}
              className={cn(
                "size-9",
                playbackState?.repeat_state !== "off" && "text-green-400"
              )}
              title={
                playbackState?.repeat_state === "track"
                  ? "Repeat track"
                  : playbackState?.repeat_state === "context"
                  ? "Repeat playlist"
                  : "Repeat off"
              }
            >
              {playbackState?.repeat_state === "track" ? (
                <Repeat1 className="size-4" />
              ) : (
                <Repeat className="size-4" />
              )}
            </Button>
          </div>

          {/* Control de volumen */}
          <div className="flex items-center gap-3">
            {volume === 0 ? (
              <VolumeX className="size-4 text-foreground/70 shrink-0" />
            ) : (
              <Volume2 className="size-4 text-foreground/70 shrink-0" />
            )}
            <Slider
              value={[volume]}
              max={100}
              step={1}
              onValueChange={([value]) => setVolumeLevel(value)}
              className="flex-1"
              disabled={!track}
            />
            <span className="text-xs text-foreground/70 w-10 text-right font-medium">
              {Math.round(volume)}%
            </span>
          </div>
        </div>

        {/* Columna derecha: Cola de reproducción */}
        <div className="w-64 flex flex-col bg-background/70 backdrop-blur-sm border border-border/40 shadow-md rounded-exl">
          <div className="p-3 border-b border-border/40">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="size-4" />
              Queue
              <span className="text-muted-foreground font-normal">
                ({queue.length})
              </span>
            </h4>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Music2 className="size-8 mb-2 opacity-50" />
                  <p className="text-sm">No tracks in queue</p>
                </div>
              ) : (
                queue.map((queueTrack, index) => (
                  <button
                    key={`${queueTrack.id}-${index}`}
                    onClick={() => playTrack(queueTrack.uri)}
                    className="w-full flex items-center gap-2 p-0.5 rounded-md hover:bg-accent/50 transition-colors group text-left"
                  >
                    {queueTrack.album?.images?.[0]?.url ? (
                      <img
                        src={queueTrack.album.images[0].url}
                        alt={queueTrack.name}
                        className="size-10 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted grid place-items-center shrink-0">
                        <Music2 className="size-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate group-hover:text-foreground">
                        {queueTrack.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {queueTrack.artists.map((a) => a.name).join(", ")}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(queueTrack.duration_ms)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
}
