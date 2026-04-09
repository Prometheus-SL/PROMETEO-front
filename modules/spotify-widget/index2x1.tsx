import { Progress } from "@/components/ui/progress";
import {
  WidgetContent,
  WidgetSection,
  WidgetShell,
} from "@/modules/ui/WidgetShell";

import { useSpotifyState } from "./useSpotifyState";
import {
  SpotifyArtwork,
  SpotifyConnectState,
  SpotifyTransportControls,
} from "./widget-ui";

export default function SpotifyWidgetCompact({
  config,
  onConfigChange,
}: {
  config: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}) {
  const {
    auth,
    playbackState,
    isTransitioning,
    playPause,
    skipNext,
    skipPrevious,
    toggleShuffle,
    toggleRepeat,
    startOAuthFlow,
  } = useSpotifyState(config);

  const track = playbackState?.item;
  const albumArt = track?.album?.images?.[0]?.url;
  const progress = playbackState?.progress_ms ?? 0;
  const duration = track?.duration_ms ?? 0;
  const progressPercent = duration
    ? Math.max(0, Math.min(100, (progress / duration) * 100))
    : 0;

  if (!auth.isAuthenticated) {
    return (
      <SpotifyConnectState
        title="Spotify Compact"
        message="Conecta tu cuenta para ver la reproduccion actual."
        compact
        onConnect={() => startOAuthFlow(onConfigChange)}
      />
    );
  }

  return (
    <WidgetShell >
      <div
        className="absolute inset-0 bg-black/40"
        style={{
          backgroundImage: `url(${albumArt})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(5px) brightness(0.5)",
        }}
      />
      <WidgetContent className="flex h-full flex-col pt-1.5 pb-1.5">
        <WidgetSection
          accent="emerald"
          className="flex min-h-0 flex-1 items-center gap-2.5 bg-background/82 px-2 py-2"
        >
          <SpotifyArtwork
            src={albumArt}
            alt="Album art"
            className="size-12 rounded-xl"
            iconClassName="size-5"
            isTransitioning={isTransitioning}
          />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {track?.name ?? "No track playing"}
              </p>
              <p className="text-muted-foreground truncate text-[11px]">
                {track?.artists?.map((artist) => artist.name).join(", ") ||
                  "Start playback to see music here"}
              </p>
            </div>

            <Progress
              value={progressPercent}
              className="h-1.5 bg-emerald-500/10 [&_[data-slot=progress-indicator]]:bg-emerald-500"
            />
          </div>

          <SpotifyTransportControls
            compact
            canControl={Boolean(track)}
            isPlaying={Boolean(playbackState?.is_playing)}
            shuffleEnabled={playbackState?.shuffle_state}
            repeatState={playbackState?.repeat_state}
            onToggleShuffle={toggleShuffle}
            onPrevious={skipPrevious}
            onTogglePlay={playPause}
            onNext={skipNext}
            onToggleRepeat={toggleRepeat}
          />
        </WidgetSection>
      </WidgetContent>
    </WidgetShell>
  );
}
