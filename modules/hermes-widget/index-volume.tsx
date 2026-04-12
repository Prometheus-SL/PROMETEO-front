import { useEffect, useRef, useState } from "react";
import { RefreshCw, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

import TallHorizontalSlider from "@/components/ui/big-slider";
import { Button } from "@/components/ui/button";
import {
  WidgetContent,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";

import { useHermesPc } from "./useHermesPc";

export default function HermesVolumeWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const mode = String(config["mode"] ?? "auto") as "auto" | "agent";
  const title = String(config["title"] ?? "Hermes Volume");
  const agentId = String(config["agentId"] ?? "");
  const refreshFallbackMs = Number(config["refreshFallbackMs"] ?? 15000);

  const {
    loading,
    error,
    agent,
    snapshot,
    pendingCommandId,
    lastCommandResult,
    reload,
    sendCommand,
  } = useHermesPc({
    mode,
    agentId,
    title,
    refreshFallbackMs,
  });

  const audio = snapshot?.audio;
  const host =
    snapshot?.system?.hostname || agent?.computerInfo?.hostname || agent?.name;
  const isBusy = Boolean(pendingCommandId);
  const volumeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sliderValue, setSliderValue] = useState<number[]>([
    Math.max(0, Math.min(100, audio?.volumePercent ?? 0)),
  ]);

  useEffect(() => {
    setSliderValue([Math.max(0, Math.min(100, audio?.volumePercent ?? 0))]);
  }, [audio?.volumePercent]);

  useEffect(() => {
    return () => {
      if (volumeDebounceRef.current) {
        clearTimeout(volumeDebounceRef.current);
        volumeDebounceRef.current = null;
      }
    };
  }, []);

  async function handleVolumeCommit(level: number) {
    try {
      await sendCommand("volume_set", { level });
    } catch (commandError) {
      toast.error(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo cambiar el volumen",
      );
    }
  }

  function handleVolumeChange(nextValue: number) {
    const next = Math.max(0, Math.min(100, Math.round(nextValue)));
    setSliderValue([next]);

    if (volumeDebounceRef.current) {
      clearTimeout(volumeDebounceRef.current);
    }

    volumeDebounceRef.current = setTimeout(() => {
      void handleVolumeCommit(next);
      volumeDebounceRef.current = null;
    }, 180);
  }

  async function handleMuteToggle() {
    try {
      await sendCommand(audio?.muted ? "volume_unmute" : "volume_mute");
    } catch (commandError) {
      toast.error(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo cambiar el mute",
      );
    }
  }

  async function handleCycleOutput() {
    const devices = audio?.outputDevices ?? [];
    if (devices.length <= 1) return;

    const currentIndex = Math.max(
      0,
      devices.findIndex((device) => device.id === audio?.defaultOutputId),
    );
    const nextDevice = devices[(currentIndex + 1) % devices.length];
    if (!nextDevice) return;

    try {
      await sendCommand("audio_output_set", { deviceId: nextDevice.id });
    } catch (commandError) {
      toast.error(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo cambiar la salida de audio",
      );
    }
  }

  if (loading && !agent && !snapshot) {
    return (
      <WidgetShell accent="sky">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="sky"
            tone="info"
            icon={<RefreshCw className="size-5 animate-spin" />}
            title={title}
            message="Cargando audio del equipo Hermes."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (!agent) {
    return (
      <WidgetShell accent="sky">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="sky"
            icon={<Volume2 className="size-5" />}
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

  if (!audio?.available) {
    return (
      <WidgetShell accent="sky">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="sky"
            tone="warning"
            icon={<VolumeX className="size-5" />}
            title="Audio no disponible"
            message={audio?.error || "Este equipo no expone control de audio."}
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  const outputDevices = audio.outputDevices ?? [];
  const currentOutputIndex = Math.max(
    0,
    outputDevices.findIndex((device) => device.id === audio.defaultOutputId),
  );
  const outputLabel = audio.defaultOutputName || "No playback output";
  const canCycleOutput =
    outputDevices.length > 1 && !isBusy && agent.status === "online";
  const controlTone =
    lastCommandResult?.success === false
      ? "danger"
      : isBusy
        ? "info"
        : audio.muted
          ? "warning"
          : agent.status === "online"
            ? "success"
            : "warning";
  const controlLabel =
    lastCommandResult?.success === false
      ? "Error"
      : isBusy
        ? "Syncing"
        : audio.muted
          ? "Muted"
          : agent.status === "online"
            ? "Ready"
            : "Offline";

  return (
    <WidgetShell accent="sky">
      <WidgetContent className="flex h-full flex-col gap-2 pt-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/12 text-sky-200 shadow-sm">
              {audio.muted ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
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
                {host || agent.agentId}
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
            title="Refresh audio state"
          >
            <RefreshCw
              className={`size-4 ${isBusy || loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <WidgetSection
          accent="sky"
          className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 py-3"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_40%)]" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/75 shadow-sm">
                {audio.muted ? (
                  <VolumeX className="size-5 text-muted-foreground" />
                ) : (
                  <Volume2 className="size-5 text-muted-foreground" />
                )}
              </div>

              <div>
                <p className="text-muted-foreground text-[8px] font-medium uppercase tracking-[0.16em]">
                  Volume
                </p>
                <p className="mt-1 text-[1.55rem] font-semibold leading-none">
                  {sliderValue[0] ?? 0}%
                </p>
              </div>
            </div>

            <div className="min-w-0 text-right">
              <WidgetStatus tone={controlTone} className="h-5 px-2 text-[10px]">
                {controlLabel}
              </WidgetStatus>
              <p className="text-muted-foreground mt-2 max-w-44 truncate text-[11px]">
                {outputLabel}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-10 min-w-12 rounded-xl px-2 text-[10px] font-semibold leading-none"
              onClick={() => void handleCycleOutput()}
              disabled={!canCycleOutput}
              title={
                outputDevices.length > 1
                  ? "Cambiar salida de audio"
                  : "Solo hay una salida disponible"
              }
            >
              <div className="flex flex-col items-center gap-0.5">
                <span>OUT</span>
                <span className="text-[9px] text-muted-foreground">
                  {outputDevices.length ? currentOutputIndex + 1 : 0}/
                  {outputDevices.length}
                </span>
              </div>
            </Button>

            <div className="min-w-0 flex-1">
              <TallHorizontalSlider
                value={sliderValue[0] ?? 0}
                onChange={handleVolumeChange}
                disabled={isBusy || agent.status !== "online"}
                theme="custom"
                customTheme={{
                  track: "bg-muted border border-border",
                  fill: "bg-sky-500",
                  thumb:
                    "bg-background border border-sky-200 dark:border-sky-900 shadow-sm",
                  thumbRing: "ring-4 ring-sky-500/15",
                  valueBadge:
                    "bg-background/95 border border-sky-200 dark:border-sky-900 shadow-sm backdrop-blur",
                  valueText: "text-foreground",
                  label: "text-foreground",
                  helper: "text-muted-foreground",
                }}
                heightClassName="h-10"
                showValueInside
                showPercentage
              />
            </div>

            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-xl"
              onClick={() => void handleMuteToggle()}
              disabled={isBusy || agent.status !== "online"}
              title={audio.muted ? "Unmute" : "Mute"}
            >
              {audio.muted ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Button>
          </div>

          <div className="relative flex items-center justify-between gap-3 text-[11px]">
            <span className="text-muted-foreground">Output</span>
            <span className="truncate text-right text-muted-foreground">
              {outputLabel}
            </span>
          </div>
        </WidgetSection>

        {error ? (
          <WidgetSection
            accent="sky"
            className="border-destructive/25 bg-destructive/5"
          >
            <p className="text-sm text-destructive">{error}</p>
          </WidgetSection>
        ) : null}
      </WidgetContent>
    </WidgetShell>
  );
}
