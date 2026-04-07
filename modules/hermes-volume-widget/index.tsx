import { useEffect, useState } from "react";
import { RefreshCw, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

import { useHermesPc } from "../hermes-pc-widget/useHermesPc";

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
  const host = snapshot?.system?.hostname || agent?.computerInfo?.hostname || agent?.name;
  const [sliderValue, setSliderValue] = useState<number[]>([
    audio?.volumePercent ?? 0,
  ]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    audio?.defaultOutputId ?? ""
  );

  useEffect(() => {
    setSliderValue([audio?.volumePercent ?? 0]);
  }, [audio?.volumePercent]);

  useEffect(() => {
    setSelectedDeviceId(audio?.defaultOutputId ?? "");
  }, [audio?.defaultOutputId]);

  const isBusy = Boolean(pendingCommandId);

  async function handleVolumeCommit(nextValue: number[]) {
    const next = Math.max(0, Math.min(100, Math.round(nextValue[0] ?? 0)));
    setSliderValue([next]);

    try {
      await sendCommand("volume_set", { level: next });
    } catch (commandError) {
      toast.error(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo cambiar el volumen"
      );
    }
  }

  async function handleMuteToggle() {
    try {
      await sendCommand(audio?.muted ? "volume_unmute" : "volume_mute");
    } catch (commandError) {
      toast.error(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo cambiar el mute"
      );
    }
  }

  async function handleOutputChange(deviceId: string) {
    setSelectedDeviceId(deviceId);
    try {
      await sendCommand("audio_output_set", { deviceId });
    } catch (commandError) {
      toast.error(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo cambiar la salida de audio"
      );
    }
  }

  if (loading && !agent && !snapshot) {
    return (
      <Card className="flex h-full items-center justify-center border-none bg-[radial-gradient(circle_at_top,#1d2438,#050816)] px-4 text-xs text-slate-300">
        Loading Hermes volume...
      </Card>
    );
  }

  if (!agent) {
    return (
      <Card className="flex h-full flex-col justify-between border-none bg-[radial-gradient(circle_at_top,#1d2438,#050816)] p-3 text-slate-50">
        <div className="flex items-center gap-2 text-sky-200">
          <Volume2 className="size-4" />
          <span className="text-xs uppercase tracking-[0.22em]">{title}</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No Hermes agent available.</p>
          <p className="text-xs text-slate-400">
            Añade un Hermes conectado o selecciona un agentId válido.
          </p>
        </div>
      </Card>
    );
  }

  if (!audio?.available) {
    return (
      <Card className="flex h-full flex-col justify-between border-none bg-[radial-gradient(circle_at_top,#1d2438,#050816)] p-3 text-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sky-200">
              <Volume2 className="size-4" />
              <span className="text-xs uppercase tracking-[0.22em]">{title}</span>
            </div>
            <h3 className="mt-1 text-base font-semibold">{host || agent.agentId}</h3>
          </div>
          <Badge className="rounded-full border-none bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-200">
            Unavailable
          </Badge>
        </div>
        <p className="text-xs text-slate-300">
          {audio?.error || "Audio control no disponible en este equipo."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="relative h-full py-1 overflow-hidden border-none bg-[radial-gradient(circle_at_10%_10%,rgba(56,189,248,0.2),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(14,165,233,0.15),transparent_26%),linear-gradient(135deg,#071019,#102033_55%,#060b14)] text-slate-50 shadow-[0_18px_45px_rgba(2,6,23,0.35)]">
      <div className="flex h-full flex-col gap-2.5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sky-200/80">
              {audio.muted ? (
                <VolumeX className="size-4 shrink-0" />
              ) : (
                <Volume2 className="size-4 shrink-0" />
              )}
              <span className="truncate text-[10px] uppercase tracking-[0.24em]">
                {title}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h3 className="truncate text-base font-semibold leading-none">
                {host || agent.agentId}
              </h3>
              <Badge
                className={cn(
                  "rounded-full border-none px-2 py-0.5 text-[10px]",
                  agent.status === "online"
                    ? "bg-emerald-400/15 text-emerald-200"
                    : "bg-amber-400/15 text-amber-200"
                )}
              >
                {agent.status === "online" ? "Online" : "Offline"}
              </Badge>
            </div>
            <p className="mt-1 truncate text-[11px] text-slate-300">
              {audio.defaultOutputName || "No playback output"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Badge className="rounded-full border-none bg-white/10 px-2 py-0.5 text-[10px] text-slate-100">
              {audio.muted ? "Muted" : `${audio.volumePercent ?? 0}%`}
            </Badge>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-slate-200 hover:bg-white/10 hover:text-white"
              onClick={() => void reload(true)}
              disabled={isBusy}
              title="Refresh audio state"
            >
              <RefreshCw className={cn("size-4", isBusy && "animate-spin")} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="shrink-0 bg-white/10 text-white hover:bg-white/15"
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

          <div className="min-w-0 flex-1">
            <Slider
              value={sliderValue}
              max={100}
              step={1}
              className="[&_[data-slot=slider-range]]:bg-sky-400 [&_[data-slot=slider-thumb]]:border-sky-300/60 [&_[data-slot=slider-thumb]]:bg-white"
              onValueChange={setSliderValue}
              onValueCommit={(value) => {
                void handleVolumeCommit(value);
              }}
              disabled={isBusy || agent.status !== "online"}
            />
          </div>

          <span className="w-10 text-right text-sm font-semibold text-white">
            {sliderValue[0] ?? 0}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedDeviceId || audio.defaultOutputId || undefined}
            onValueChange={(value) => {
              void handleOutputChange(value);
            }}
            disabled={
              isBusy ||
              agent.status !== "online" ||
              !audio.outputDevices?.length
            }
          >
            <SelectTrigger
              size="sm"
              className="w-full border-white/10 bg-white/[0.04] text-xs text-slate-100"
            >
              <SelectValue placeholder="Select output device" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-slate-950 text-slate-100">
              {(audio.outputDevices ?? []).map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {lastCommandResult?.success === false ? (
            <Badge className="rounded-full border-none bg-rose-400/15 px-2 py-0.5 text-[10px] text-rose-200">
              Error
            </Badge>
          ) : isBusy ? (
            <Badge className="rounded-full border-none bg-sky-400/15 px-2 py-0.5 text-[10px] text-sky-100">
              Syncing
            </Badge>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg bg-rose-400/10 px-2.5 py-1.5 text-[11px] text-rose-100">
            {error}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
