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
import { useSpotifyState } from "./useSpotifyState";

export default function SpotifyWidget({
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
    contextInfo,
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

  // Función para obtener el icono según el tipo de dispositivo
  const getDeviceIcon = (deviceType?: string) => {
    if (!deviceType) return <Speaker className="size-3" />;

    const type = deviceType.toLowerCase();
    switch (type) {
      case "computer":
        return <Monitor size={1} />;
      case "smartphone":
        return <Smartphone size={1} />;
      case "tablet":
        return <Tablet size={1} />;
      case "speaker":
        return <Speaker size={1} />;
      case "tv":
      case "cast_video":
      case "chromecast":
        return <Tv size={1} />;
      case "avr":
      case "stb":
      case "audio_dongle":
      case "game_console":
        return <Speaker size={1} />;
      default:
        return <Speaker size={1} />;
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
            Spotify
          </CardTitle>
          <CardDescription>Connect your Spotify account</CardDescription>
        </CardHeader>

        <CardContent className="relative flex flex-col items-center justify-center gap-4">
          <p className="text-center text-sm text-muted-foreground">
            Authenticate with Spotify to display your current playback.
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
    <Card className="relative h-full overflow-hidden border border-border/60 bg-background/90 shadow-lg shadow-primary/10 py-1">
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

      <div className="relative flex h-full flex-col p-2 mx-2">
        {/* Información del contexto (playlist/álbum) */}
        {contextInfo && (
          <div className="absolute top-1 right-1 flex items-center gap-1.5 bg-background/70 backdrop-blur-sm rounded-lg px-2 py-1 border border-border/40 shadow-md max-w-[45%]">
            {contextInfo.images?.[0]?.url && (
              <img
                src={contextInfo.images[0].url}
                alt={contextInfo.name}
                className="size-5 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-muted-foreground uppercase font-medium">
                {contextInfo.type === "playlist"
                  ? "Playlist"
                  : contextInfo.type === "album"
                  ? "Álbum"
                  : contextInfo.type === "artist"
                  ? "Artista"
                  : "Contexto"}
              </p>
              <p className="text-[10px] font-semibold text-foreground truncate">
                {contextInfo.name}
              </p>
            </div>
          </div>
        )}

        {/* Header con álbum */}
        <div className="mb-4 flex items-center gap-3">
          {albumArt ? (
            <img
              src={albumArt}
              alt="Album art"
              className={cn(
                "size-14 rounded-xl shadow-xl transition-all duration-500 ease-in-out",
                isTransitioning
                  ? "scale-90 opacity-40 blur-sm"
                  : "scale-100 opacity-100 blur-0"
              )}
            />
          ) : (
            <div className="grid size-14 place-items-center rounded-lg border border-border/40 bg-muted">
              <Music2 className="size-7 text-muted-foreground" />
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
            <h3 className="truncate text-sm font-bold text-foreground drop-shadow-md">
              {track?.name ?? "No track playing"}
            </h3>
            <p className="truncate text-xs text-foreground/80 drop-shadow-sm">
              {track?.artists?.map((a) => a.name).join(", ") ??
                "Unknown artist"}
            </p>
            <Badge
              variant="secondary"
              className="mt-1 bg-background/80 text-[10px] px-1.5 py-0 flex items-center gap-1"
            >
              {getDeviceIcon(playbackState?.device?.type)}
              <span className="truncate max-w-[120px]">
                {playbackState?.device?.name ?? "No device"}
              </span>
            </Badge>
          </div>
        </div>

        <div className="mb-2 mx-1">
          <Slider
            value={[progress]}
            max={duration}
            step={1000}
            onValueCommit={([value]) => seekToPosition(value)}
            className="mb-1"
            disabled={!track}
          />
          <div className="flex justify-between text-[10px] text-foreground/70">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 mb-1">
          {/* Controles */}
          <div className="flex items-center gap-1 mb-1 grow">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              disabled={!track}
              className={cn(
                "size-8",
                playbackState?.shuffle_state && "text-green-400"
              )}
              title="Shuffle"
            >
              <Shuffle className="size-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={skipPrevious}
              disabled={!track}
              className="size-8"
              title="Previous"
            >
              <SkipBack className="size-3" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={playPause}
              disabled={!track}
              className="size-10"
              title={playbackState?.is_playing ? "Pause" : "Play"}
            >
              {playbackState?.is_playing ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={skipNext}
              disabled={!track}
              className="size-8"
              title="Next"
            >
              <SkipForward className="size-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              disabled={!track}
              className={cn(
                "size-8",
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
                <Repeat1 className="size-3" />
              ) : (
                <Repeat className="size-3" />
              )}
            </Button>
          </div>

          {/* Control de volumen */}
          <div className="mx-1 flex items-center gap-2 flex-none w-50">
            {volume === 0 ? (
              <VolumeX className="size-3.5 text-foreground/70 shrink-0" />
            ) : (
              <Volume2 className="size-3.5 text-foreground/70 shrink-0" />
            )}
            <Slider
              value={[volume]}
              max={100}
              step={1}
              onValueCommit={([value]) => setVolumeLevel(value)}
              className="flex-1"
              disabled={!track}
            />
            <span className="text-[10px] text-foreground/70 w-7 text-right font-medium">
              {Math.round(volume)}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
