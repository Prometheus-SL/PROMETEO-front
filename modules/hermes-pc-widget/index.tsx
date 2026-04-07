import { Activity, Cpu, HardDrive, Monitor, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { useHermesPc } from "./useHermesPc";

function formatRelative(value?: string) {
  if (!value) return "No data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No data";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPercent(value?: number) {
  return `${Math.max(0, Math.round(Number(value) || 0))}%`;
}

function MiniMetric({
  icon: Icon,
  label,
  value,
  progress,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  progress: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-cyan-100/70">
          <Icon className="size-3.5 text-cyan-300" />
          {label}
        </span>
        <span className="text-sm font-semibold text-white">{value}</span>
      </div>
      <Progress
        value={progress}
        className="mt-2 h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-cyan-300"
      />
    </div>
  );
}

export default function HermesPcWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const mode = String(config["mode"] ?? "auto") as "auto" | "agent";
  const title = String(config["title"] ?? "Hermes System");
  const agentId = String(config["agentId"] ?? "");
  const refreshFallbackMs = Number(config["refreshFallbackMs"] ?? 30000);

  const { loading, error, agent, snapshot } = useHermesPc({
    mode,
    agentId,
    title,
    refreshFallbackMs,
  });

  const cpuUsage = snapshot?.resources?.cpu?.percent ?? 0;
  const memoryUsage = snapshot?.resources?.memory?.percent ?? 0;
  const primaryDisk = snapshot?.resources?.disks?.[0] ?? null;
  const host =
    snapshot?.system?.hostname || agent?.computerInfo?.hostname || agent?.name;
  const osLabel = [
    snapshot?.system?.os?.platform || agent?.computerInfo?.os?.platform,
    snapshot?.system?.os?.release || agent?.computerInfo?.os?.release,
  ]
    .filter(Boolean)
    .join(" ");
  const networkLabel =
    snapshot?.network?.ip || agent?.computerInfo?.network?.ip || "";

  if (loading && !agent && !snapshot) {
    return (
      <Card className="flex h-full items-center justify-center border-none bg-[radial-gradient(circle_at_top,#11253a,#030712)] px-4 text-xs text-slate-300">
        Loading Hermes system...
      </Card>
    );
  }

  if (!agent) {
    return (
      <Card className="flex h-full flex-col justify-between border-none bg-[radial-gradient(circle_at_top,#11253a,#030712)] p-3 text-slate-50">
        <div className="flex items-center gap-2 text-cyan-200">
          <Monitor className="size-4" />
          <span className="text-xs uppercase tracking-[0.22em]">{title}</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No Hermes agent available.</p>
          <p className="text-xs text-slate-400">
            {mode === "agent"
              ? "Revisa el agentId configurado."
              : "Auto mode elegirá tu Hermes online más reciente."}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative h-full py-1 overflow-hidden border-none bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.14),transparent_22%),linear-gradient(135deg,#08111d,#0b1f34_52%,#060c17)] text-slate-50 shadow-[0_18px_45px_rgba(2,6,23,0.35)]">
      <div className="flex h-full flex-col gap-2.5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-cyan-200/80">
              <Monitor className="size-4 shrink-0" />
              <span className="truncate text-[10px] uppercase tracking-[0.24em]">
                {title}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold leading-none">
                {host || agent.agentId}
              </h3>
              <Badge
                className={cn(
                  "rounded-full border-none px-2 py-0.5 text-[10px]",
                  agent.status === "online"
                    ? "bg-emerald-400/15 text-emerald-200"
                    : "bg-amber-400/15 text-amber-200",
                )}
              >
                {agent.status === "online" ? "Online" : "Offline"}
              </Badge>
            </div>
            <p className="mt-1 truncate text-[11px] text-slate-300">
              {[osLabel, networkLabel].filter(Boolean).join(" • ") ||
                "Windows agent"}
            </p>
          </div>

          <div className="hidden min-w-[84px] rounded-xl border border-white/10 bg-black/15 px-2.5 py-2 text-right md:block">
            <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
              <RefreshCw className="size-3" />
              Update
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              {formatRelative(snapshot?.timestamp || snapshot?.sampledAt)}
            </div>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-3 gap-2">
          <MiniMetric
            icon={Cpu}
            label="CPU"
            value={formatPercent(cpuUsage)}
            progress={cpuUsage}
          />
          <MiniMetric
            icon={Activity}
            label="RAM"
            value={formatPercent(memoryUsage)}
            progress={memoryUsage}
          />
          <MiniMetric
            icon={HardDrive}
            label={primaryDisk?.drive || "Disk"}
            value={formatPercent(primaryDisk?.percent)}
            progress={primaryDisk?.percent ?? 0}
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-300">
          <span className="truncate font-mono text-slate-100">
            {agent.agentId}
          </span>
          <span className="shrink-0">
            Seen {formatRelative(agent.lastSeen || agent.lastData)}
          </span>
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
