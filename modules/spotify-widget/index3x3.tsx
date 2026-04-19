import * as React from "react";
import { Music2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  WidgetContent,
  WidgetSection,
  WidgetShell,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import { cn } from "@/lib/utils";

import { useSpotifyState } from "./useSpotifyState";
import {
  formatSpotifyTime,
  SpotifyArtwork,
  SpotifyTransportControls,
  SpotifyVolumeControl,
} from "./widget-ui";

function SpotifyQueueConnectState({
  error,
  action,
  isClientSurface,
}: {
  error?: string | null;
  action?: React.ReactNode;
  isClientSurface: boolean;
}) {
  return (
    <WidgetShell accent="emerald">
      <WidgetContent className="flex h-full flex-col gap-3 pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/12 text-emerald-200 shadow-sm">
              <Music2 className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-[1.05rem] font-semibold leading-none">
                  Spotify Queue
                </p>
                <WidgetStatus tone="neutral" className="h-4 px-1.5 text-[8px]">
                  Offline
                </WidgetStatus>
              </div>
              <p className="text-muted-foreground mt-1 truncate text-[11px] leading-4">
                Playback queue
              </p>
            </div>
          </div>

          <WidgetStatus tone="neutral" className="h-5 px-2 text-[10px]">
            Managed in Account
          </WidgetStatus>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.95fr)] gap-3">
          <WidgetSection
            accent="emerald"
            className="relative flex min-h-0 flex-col overflow-hidden p-4"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_40%)]" />

            <div className="relative flex h-full flex-col justify-between gap-4">
              <div className="flex items-start gap-4">
                <SpotifyArtwork
                  className="size-28 rounded-[1.5rem] bg-background/95"
                  iconClassName="size-10"
                />

                <div className="min-w-0 flex-1 space-y-3 pt-1">
                  <div className="space-y-2">
                    <p className="text-[1.6rem] font-semibold leading-tight">
                      Link Spotify in Account
                    </p>
                    <p className="text-muted-foreground text-sm leading-6">
                      {error ||
                        (isClientSurface
                          ? "This client reuses the Spotify account linked in Account. It cannot start the login flow from here."
                          : "Open Account to link Spotify once and reuse it across every dashboard widget.")}
                    </p>
                  </div>

                  <WidgetStatus tone="neutral" className="h-5 px-2 text-[10px]">
                    Playback queue
                  </WidgetStatus>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 opacity-60">
                  <Slider value={[0]} max={100} step={1} disabled />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>0:00</span>
                    <span>0:00</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <SpotifyTransportControls
                    canControl={false}
                    isPlaying={false}
                    repeatState="off"
                    onToggleShuffle={() => undefined}
                    onPrevious={() => undefined}
                    onTogglePlay={() => undefined}
                    onNext={() => undefined}
                    onToggleRepeat={() => undefined}
                  />

                  {action}
                </div>
              </div>
            </div>
          </WidgetSection>

          <WidgetSection
            accent="emerald"
            className="flex min-h-0 flex-col overflow-hidden p-0"
          >
            <div className="border-b border-border/50 px-3 py-3">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.2em]">
                Queue
              </p>
              <p className="mt-1 text-sm font-semibold">
                Up next will appear here
              </p>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-center">
              <p className="text-muted-foreground text-sm leading-6">
                The upcoming tracks list appears automatically once Spotify is
                linked to this account.
              </p>
            </div>
          </WidgetSection>
        </div>
      </WidgetContent>
    </WidgetShell>
  );
}

export default function SpotifyWidgetQueue({
  config,
}: {
  config: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}) {
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
    advanceToQueueIndex,
  } = useSpotifyState(config);
  const location = useLocation();

  React.useEffect(() => {
    if (auth.isAuthenticated) {
      void fetchQueue();
    }
  }, [auth.isAuthenticated, fetchQueue, playbackState?.item?.id]);

  const track = playbackState?.item;
  const albumArt = track?.album?.images?.[0]?.url;
  const progress = playbackState?.progress_ms ?? 0;
  const duration = track?.duration_ms ?? 0;
  const albumName = track?.album?.name;
  const isClientSurface = location.pathname.startsWith("/client");

  if (!auth.isAuthenticated) {
    return (
      <SpotifyQueueConnectState
        error={error}
        isClientSurface={isClientSurface}
        action={
          !isClientSurface ? (
            <Button asChild type="button" className="h-11 rounded-2xl px-5">
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
      <WidgetContent className="flex h-full flex-col gap-3 pt-3 pb-3">
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.95fr)] gap-3">
          <WidgetSection className="relative flex min-h-0 flex-col overflow-hidden p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_40%)]" />

            <div className="relative flex h-full flex-col justify-between gap-4">
              <div className="relative flex items-center gap-3">
                <SpotifyArtwork
                  src={albumArt}
                  alt="Album art"
                  className="size-28 rounded-[1.5rem]"
                  iconClassName="size-10"
                  isTransitioning={isTransitioning}
                />

                <div className="min-w-0 flex-1 space-y-1 gap-3">
                  <p className="line-clamp-2 text-[1.3rem] font-semibold leading-tight">
                    {track?.name ?? "No track playing"}
                  </p>
                  <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                    {track?.artists?.map((artist) => artist.name).join(", ") || "No active artists"}
                  </p>
                  {albumName && (
                    <p className="text-muted-foreground mt-1 line-clamp-1 text-[11px]">
                      {albumName}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
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
                    className="w-44 rounded-2xl px-3"
                    heightClassName="h-7"
                  />
                </div>
              </div>
            </div>
          </WidgetSection>

          <WidgetSection
            accent="emerald"
            className="flex min-h-0 flex-col overflow-hidden p-0"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-1.5">
              <div>
                <p className="text-sm font-semibold">Queue</p>
              </div>
              <WidgetStatus tone="neutral" className="h-5 px-2 text-[10px]">
                {queue.length} tracks
              </WidgetStatus>
            </div>

            {queue.length ? (
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-1 p-1">
                  {queue.map((item, index) => {
                    return (
                      <button
                        type="button"
                        key={`${item.uri}-${index}`}
                        onClick={() => void advanceToQueueIndex(index)}
                        className={cn(
                          "grid w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_3.25rem] items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-background/85 p-2.5 text-left transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                        )}
                      >
                        <SpotifyArtwork
                          src={item.album.images?.[0]?.url}
                          alt=""
                          className="size-8 rounded-sm"
                          iconClassName="size-5"
                        />

                        <div className="min-w-0 overflow-hidden">
                          <p className="truncate text-sm font-semibold">
                            {item.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.artists
                              .map((artist) => artist.name)
                              .join(", ")}
                          </p>
                        </div>

                        <span className="w-[3.25rem] shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {formatSpotifyTime(item.duration_ms)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-center">
                <p className="text-muted-foreground text-sm leading-6">
                  Start playback and Spotify will fill this queue automatically.
                </p>
              </div>
            )}
          </WidgetSection>
        </div>
      </WidgetContent>
    </WidgetShell>
  );
}
