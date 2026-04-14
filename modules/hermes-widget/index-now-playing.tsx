import { useMemo, useState } from "react";
import {
  ExternalLink,
  Monitor,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Tv,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  WidgetContent,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";

import { getMediaEmbedConfig } from "./embed-utils";
import { useHermesNowPlaying } from "./useHermesNowPlaying";

function formatTime(ms?: number) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function HermesNowPlayingWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const mode = String(config["mode"] ?? "auto") as "auto" | "agent";
  const title = String(config["title"] ?? "Hermes Now Playing");
  const agentId = String(config["agentId"] ?? "");
  const allowLocalEmbed = Boolean(config["allowLocalEmbed"] ?? true);
  const refreshFallbackMs = Number(config["refreshFallbackMs"] ?? 15000);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);

  const {
    loading,
    error,
    agent,
    mediaSnapshot,
    pendingCommandId,
    reload,
    sendCommand,
  } = useHermesNowPlaying({
    mode,
    agentId,
    title,
    refreshFallbackMs,
  });

  const media = mediaSnapshot?.media;
  const host = agent?.computerInfo?.hostname || agent?.name || agent?.agentId;
  const isBusy = Boolean(pendingCommandId);
  const progressValue = useMemo(() => {
    if (!media?.durationMs || media.durationMs <= 0) return 0;
    return Math.max(
      0,
      Math.min(100, ((media.positionMs || 0) / media.durationMs) * 100)
    );
  }, [media?.durationMs, media?.positionMs]);
  const embedConfig = useMemo(
    () => (allowLocalEmbed ? getMediaEmbedConfig(media) : null),
    [allowLocalEmbed, media]
  );
  const canTogglePlayback = Boolean(media?.canPause || media?.canPlay);

  async function handleCommand(command: string) {
    try {
      await sendCommand(command);
    } catch (commandError) {
      toast.error(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo enviar el comando multimedia"
      );
    }
  }

  if (loading && !agent && !mediaSnapshot) {
    return (
      <WidgetShell accent="emerald">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="emerald"
            tone="info"
            icon={<RefreshCw className="size-5 animate-spin" />}
            title={title}
            message="Cargando el estado multimedia de Hermes."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (!agent) {
    return (
      <WidgetShell accent="emerald">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="emerald"
            icon={<Monitor className="size-5" />}
            title={title}
            message={
              mode === "agent"
                ? "No encuentro el Hermes configurado para este widget."
                : "Todavia no hay un agente Hermes disponible."
            }
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (!media?.available) {
    return (
      <WidgetShell accent="emerald">
        <WidgetContent className="flex h-full flex-col gap-2 pt-2 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/12 text-emerald-200 shadow-sm">
                <Monitor className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{title}</p>
                  <WidgetStatus
                    tone={agent.status === "online" ? "success" : "warning"}
                    className="h-4 px-1.5 text-[8px]"
                  >
                    {agent.status === "online" ? "Online" : "Offline"}
                  </WidgetStatus>
                </div>
                <p className="text-muted-foreground truncate text-[11px] leading-4">
                  {host}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-background/80"
              onClick={() => void reload(true)}
              disabled={loading}
              title="Refresh media state"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <WidgetState
            accent="emerald"
            tone="neutral"
            icon={<Tv className="size-5" />}
            title="No media detected"
            message="Hermes no esta recibiendo reproduccion del navegador. Activa el bridge local y la extension para ver YouTube, Twitch o SoundCloud."
          />

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

  return (
    <>
      <WidgetShell accent="emerald">
        <WidgetContent className="flex h-full flex-col gap-2 pt-2 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/12 text-emerald-200 shadow-sm">
                <Tv className="size-4" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{title}</p>
                  <WidgetStatus
                    tone={agent.status === "online" ? "success" : "warning"}
                    className="h-4 px-1.5 text-[8px]"
                  >
                    {agent.status === "online" ? "Online" : "Offline"}
                  </WidgetStatus>
                  <WidgetStatus
                    tone={media.playbackStatus === "playing" ? "success" : "neutral"}
                    className="h-4 px-1.5 text-[8px]"
                  >
                    {media.playbackStatus === "playing" ? "Playing" : "Paused"}
                  </WidgetStatus>
                </div>

                <p className="text-muted-foreground truncate text-[11px] leading-4">
                  {media.sourceAppName || media.provider || host}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-background/80"
              onClick={() => void reload(true)}
              disabled={isBusy || loading}
              title="Refresh media state"
            >
              <RefreshCw
                className={`size-4 ${isBusy || loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          <WidgetSection
            accent="emerald"
            className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 py-3"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_40%)]" />

            <div className="relative flex items-center gap-3">
              {media.artworkUrl ? (
                <img
                  src={media.artworkUrl}
                  alt={media.title || "Artwork"}
                  className="size-8 shrink-0 rounded-2xl border border-border/60 object-cover shadow-sm"
                />
              ) : (
                <div className="grid size-8 shrink-0 place-items-center rounded-2xl border border-border/60 bg-background/80 shadow-sm">
                  <Tv className="size-4 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold leading-tight">
                  {media.title || "No title"}
                </p>
              </div>
            </div>

            <div className="relative space-y-2">
              <Progress value={progressValue} className="h-1.5" />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{formatTime(media.positionMs)}</span>
                <span>{formatTime(media.durationMs)}</span>
              </div>
            </div>

            <div className="relative flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => void handleCommand("media_previous")}
                  disabled={isBusy || !media.canPrevious || agent.status !== "online"}
                  title="Previous on PC"
                >
                  <SkipBack className="size-4" />
                </Button>

                <Button
                  type="button"
                  size="icon"
                  className="h-10 w-10 rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                  onClick={() =>
                    void handleCommand(
                      media.playbackStatus === "playing"
                        ? "media_pause"
                        : "media_play"
                    )
                  }
                  disabled={isBusy || !canTogglePlayback || agent.status !== "online"}
                  title={
                    media.playbackStatus === "playing"
                      ? "Pause on PC"
                      : "Play on PC"
                  }
                >
                  {media.playbackStatus === "playing" ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => void handleCommand("media_next")}
                  disabled={isBusy || !media.canNext || agent.status !== "online"}
                  title="Next on PC"
                >
                  <SkipForward className="size-4" />
                </Button>
              </div>

              {embedConfig ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 rounded-xl px-3 text-xs font-semibold"
                  onClick={() => setIsEmbedOpen(true)}
                >
                  <ExternalLink className="size-4" />
                  Reproducir aqui
                </Button>
              ) : null}
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

      <Dialog open={isEmbedOpen} onOpenChange={setIsEmbedOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{embedConfig?.title || media.title || title}</DialogTitle>
          </DialogHeader>

          {embedConfig ? (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-black">
              <iframe
                title={embedConfig.title}
                src={embedConfig.src}
                className="aspect-video h-auto w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Este origen no ofrece un embed compatible desde el widget.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
