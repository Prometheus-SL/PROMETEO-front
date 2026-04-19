import { Link, useLocation } from "react-router-dom";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  WidgetContent,
  WidgetSection,
  WidgetShell,
} from "@/modules/ui/WidgetShell";

import { useSpotifyState } from "./useSpotifyState";
import {
  formatSpotifyTime,
  SpotifyArtwork,
  SpotifyConnectState,
  SpotifyTransportControls,
  SpotifyVolumeControl,
} from "./widget-ui";

export default function SpotifyWidget({
  config,
}: {
  config: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}) {
  const {
    auth,
    playbackState,
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
  } = useSpotifyState(config);
  const location = useLocation();

  const track = playbackState?.item;
  const albumArt = track?.album?.images?.[0]?.url;
  const progress = playbackState?.progress_ms ?? 0;
  const duration = track?.duration_ms ?? 0;
  const artists = track?.artists?.map((artist) => artist.name).join(", ");
  const isClientSurface = location.pathname.startsWith("/client");

  const emptyMessage = isClientSurface
    ? auth.status === "reauth_required"
      ? "Spotify necesita reconexion desde Account. El widget no puede iniciar sesion desde este cliente."
      : "Spotify se vincula desde Account. Este cliente reutilizara la cuenta automaticamente."
    : auth.status === "reauth_required"
    ? "Spotify necesita reconexion. Abre Account para restaurar la vinculacion."
    : "Vincula tu cuenta desde Account para controlar la reproduccion actual.";

  if (!auth.isAuthenticated) {
    return (
      <SpotifyConnectState
        title="Spotify Player"
        message={emptyMessage}
        error={error}
        action={
          !isClientSurface ? (
            <Button asChild type="button" className="h-9 rounded-lg px-4">
              <Link to="/account">
                {auth.status === "reauth_required"
                  ? "Reconnect in Account"
                  : "Open Account"}
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <WidgetShell>
      <div
        className="absolute inset-0 bg-black/40"
        style={{
          backgroundImage: `url(${albumArt})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(5px) brightness(0.5)",
        }}
      />
      <WidgetContent className="flex h-full flex-col gap-2 pt-2">
        <WidgetSection
          accent="emerald"
          className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 py-3"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_40%)]" />

          <div className="relative flex items-center gap-3">
            <SpotifyArtwork
              src={albumArt}
              alt="Album art"
              className={
                track
                  ? "size-[3.5rem] rounded-[1.1rem]"
                  : "size-14 rounded-[1rem]"
              }
              iconClassName={track ? "size-7" : "size-6"}
              isTransitioning={isTransitioning}
            />

            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[1.1rem] font-semibold leading-tight">
                {track?.name ?? "No track playing"}
              </p>
              <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                {artists || "No active artists"}
              </p>
            </div>
          </div>

          <div className="relative mt-auto">
            <div className="space-y-2">
              <Slider
                value={[progress]}
                max={duration || 1}
                step={1000}
                onValueCommit={([value]) => seekToPosition(value)}
                disabled={!track}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatSpotifyTime(progress)}</span>
                <span>{formatSpotifyTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <SpotifyTransportControls
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

              <SpotifyVolumeControl
                volume={volume}
                onVolumeChange={setVolumeLevel}
                disabled={!track}
                className="w-44"
              />
            </div>
          </div>
        </WidgetSection>

        {error ? (
          <WidgetSection
            accent="emerald"
            className="border-destructive/25 bg-destructive/5"
          >
            <p className="text-sm text-destructive">{error}</p>
          </WidgetSection>
        ) : null}
      </WidgetContent>
    </WidgetShell>
  );
}
