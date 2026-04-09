import {
  Monitor,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Speaker,
  Smartphone,
  Tablet,
  Tv,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  WidgetContent,
  WidgetHeader,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import { cn } from "@/lib/utils";

type SpotifyTransportControlsProps = {
  canControl: boolean;
  isPlaying: boolean;
  shuffleEnabled?: boolean;
  repeatState?: "off" | "track" | "context";
  compact?: boolean;
  onToggleShuffle: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onToggleRepeat: () => void;
};

type SpotifyConnectStateProps = {
  title: string;
  message: string;
  error?: string | null;
  compact?: boolean;
  onConnect: () => void;
};

type SpotifyArtworkProps = {
  alt?: string;
  className?: string;
  iconClassName?: string;
  isTransitioning?: boolean;
  src?: string | null;
};

function formatSpotifyTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getSpotifyDeviceIcon(deviceType?: string, className = "size-3.5") {
  if (!deviceType) return <Speaker className={className} />;

  const type = deviceType.toLowerCase();
  switch (type) {
    case "computer":
      return <Monitor className={className} />;
    case "smartphone":
      return <Smartphone className={className} />;
    case "tablet":
      return <Tablet className={className} />;
    case "speaker":
      return <Speaker className={className} />;
    case "tv":
    case "cast_video":
    case "chromecast":
      return <Tv className={className} />;
    default:
      return <Speaker className={className} />;
  }
}

function SpotifyArtwork({
  alt = "Album art",
  className,
  iconClassName,
  isTransitioning = false,
  src,
}: SpotifyArtworkProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(
          "shrink-0 rounded-[1rem] border border-border/60 object-cover shadow-sm transition-all duration-300",
          isTransitioning ? "scale-95 opacity-60" : "scale-100 opacity-100",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-[1rem] border border-border/60 bg-background/90 shadow-sm",
        className,
      )}
    >
      <Music2 className={cn("text-muted-foreground", iconClassName)} />
    </div>
  );
}

function SpotifyConnectState({
  title,
  message,
  error,
  compact = false,
  onConnect,
}: SpotifyConnectStateProps) {
  if (compact) {
    return (
      <WidgetShell accent="emerald">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="emerald"
            tone={error ? "danger" : "neutral"}
            icon={<Music2 className="size-5" />}
            title={title}
            message={error || "Conecta Spotify para usar el widget."}
            className="gap-2 px-3 py-2.5"
            action={
              <Button
                type="button"
                className="h-8 rounded-lg px-3 text-xs"
                onClick={onConnect}
              >
                Connect
              </Button>
            }
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell accent="emerald">
      <WidgetHeader
        accent="emerald"
        icon={<Music2 className="size-5" />}
        title={title}
        description="Spotify"
      />
      <WidgetContent className="flex items-center">
        <WidgetState
          accent="emerald"
          tone={error ? "danger" : "neutral"}
          icon={<Music2 className="size-5" />}
          title="Spotify no conectado"
          message={error || message}
          action={
            <Button
              type="button"
              className="h-9 rounded-lg px-4"
              onClick={onConnect}
            >
              Connect Spotify
            </Button>
          }
        />
      </WidgetContent>
    </WidgetShell>
  );
}

function SpotifyTransportControls({
  canControl,
  isPlaying,
  shuffleEnabled,
  repeatState = "off",
  compact = false,
  onToggleShuffle,
  onPrevious,
  onTogglePlay,
  onNext,
  onToggleRepeat,
}: SpotifyTransportControlsProps) {
  const secondarySize = "icon-sm";
  const primaryClassName = compact
    ? "h-9 w-9 rounded-xl bg-foreground text-background shadow-sm hover:bg-foreground/90"
    : "h-11 w-11 rounded-2xl bg-foreground text-background shadow-[0_14px_28px_rgba(15,23,42,0.18)] hover:bg-foreground/92";
  const secondaryClassName = compact
    ? "rounded-lg text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground"
    : "rounded-xl text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground";

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size={secondarySize}
          className={secondaryClassName}
          onClick={onPrevious}
          disabled={!canControl}
          title="Previous"
        >
          <SkipBack className="size-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          className={primaryClassName}
          onClick={onTogglePlay}
          disabled={!canControl}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size={secondarySize}
          className={secondaryClassName}
          onClick={onNext}
          disabled={!canControl}
          title="Next"
        >
          <SkipForward className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size={secondarySize}
        className={cn(
          secondaryClassName,
          shuffleEnabled && "bg-emerald-500/10 text-emerald-600",
        )}
        onClick={onToggleShuffle}
        disabled={!canControl}
        title="Shuffle"
      >
        <Shuffle className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size={secondarySize}
        className={secondaryClassName}
        onClick={onPrevious}
        disabled={!canControl}
        title="Previous"
      >
        <SkipBack className="size-4" />
      </Button>

      <Button
        type="button"
        size="icon"
        className={primaryClassName}
        onClick={onTogglePlay}
        disabled={!canControl}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size={secondarySize}
        className={secondaryClassName}
        onClick={onNext}
        disabled={!canControl}
        title="Next"
      >
        <SkipForward className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size={secondarySize}
        className={cn(
          secondaryClassName,
          repeatState !== "off" && "bg-emerald-500/10 text-emerald-600",
        )}
        onClick={onToggleRepeat}
        disabled={!canControl}
        title="Repeat"
      >
        {repeatState === "track" ? (
          <Repeat1 className="size-4" />
        ) : (
          <Repeat className="size-4" />
        )}
      </Button>
    </div>
  );
}

function SpotifyDeviceStatus({
  deviceName,
  deviceType,
}: {
  deviceName?: string | null;
  deviceType?: string | null;
}) {
  if (!deviceName) return null;

  return (
    <WidgetStatus tone="neutral" className="max-w-full">
      {getSpotifyDeviceIcon(deviceType ?? undefined, "size-3")}
      <span className="max-w-32 truncate">{deviceName}</span>
    </WidgetStatus>
  );
}

export {
  formatSpotifyTime,
  getSpotifyDeviceIcon,
  SpotifyArtwork,
  SpotifyConnectState,
  SpotifyTransportControls,
  SpotifyDeviceStatus,
};
