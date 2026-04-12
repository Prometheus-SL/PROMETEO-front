import type { ReactNode } from "react";
import { Activity, Cpu, HardDrive, Monitor, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  WidgetContent,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";

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

function HermesMetricRow({
  icon,
  label,
  value,
  progress,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  progress: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <span className="shrink-0 text-sm font-semibold leading-none">
          {value}
        </span>
      </div>

      <Progress
        value={progress}
        className="h-1.5 bg-sky-500/10 [&_[data-slot=progress-indicator]]:bg-sky-500"
      />
    </div>
  );
}

function HermesInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
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

  const { loading, error, agent, snapshot, reload } = useHermesPc({
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
  const lastUpdate = formatRelative(snapshot?.timestamp || snapshot?.sampledAt);
  const lastSeen = formatRelative(agent?.lastSeen || agent?.lastData);

  if (loading && !agent && !snapshot) {
    return (
      <WidgetShell accent="sky">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="sky"
            tone="info"
            icon={<RefreshCw className="size-5 animate-spin" />}
            title={title}
            message="Cargando estado del agente Hermes."
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

  return (
    <WidgetShell accent="sky">
      <WidgetContent className="flex h-full flex-col gap-2 pt-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/12 text-sky-200 shadow-sm">
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
            disabled={loading}
            title="Refresh Hermes status"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <WidgetSection
          accent="sky"
          className="relative flex min-h-0 flex-1 overflow-hidden px-3 py-3"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_42%)]" />

          <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(9.5rem,0.85fr)] gap-3">
            <div className="min-w-0 space-y-2">
              <HermesMetricRow
                icon={<Cpu className="size-3.5" />}
                label="CPU"
                value={formatPercent(cpuUsage)}
                progress={cpuUsage}
              />
              <HermesMetricRow
                icon={<Activity className="size-3.5" />}
                label="RAM"
                value={formatPercent(memoryUsage)}
                progress={memoryUsage}
              />
              <HermesMetricRow
                icon={<HardDrive className="size-3.5" />}
                label={primaryDisk?.drive || "Disk"}
                value={formatPercent(primaryDisk?.percent)}
                progress={primaryDisk?.percent ?? 0}
              />
            </div>

            <div className="flex min-h-0 min-w-0 flex-col justify-center rounded-xl border border-border/50 bg-background/70 px-2.5 py-2 shadow-sm">
              <div className="flex flex-col justify-center space-y-1.5">
                <HermesInfoRow label="OS" value={osLabel || "Windows agent"} />
                <HermesInfoRow label="Agent" value={agent.agentId} />
                <HermesInfoRow label="Seen" value={lastSeen} />
                <HermesInfoRow label="Upd" value={lastUpdate} />
              </div>
            </div>
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
