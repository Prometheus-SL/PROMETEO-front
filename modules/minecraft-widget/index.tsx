import * as React from "react";
import { Globe2, RefreshCw, Server, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSharedContext } from "@/hooks/useSharedContext";
import { cn } from "@/lib/utils";
import {
  WidgetContent,
  WidgetHeader,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";

type McStatus = {
  online: boolean;
  host?: string;
  port?: number;
  players?: {
    online?: number;
    max?: number;
    list?: Array<{ name_raw?: string }>;
  };
  motd?: { clean?: string; html?: string };
  version?: { name_raw?: string };
};

function formatTimeLabel(value: number | null) {
  if (!value) return "Sin actualizar";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRefreshLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${Math.round(seconds / 60)}m`;
}

function normalizeMotd(value?: string) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function formatPlayerSummary(
  isOnline: boolean,
  players: number,
  playerNames: string[],
) {
  if (!isOnline) return "El servidor no responde ahora mismo.";
  if (players === 0) return "No hay jugadores conectados.";
  if (playerNames.length === 0) return "Hay jugadores conectados.";
  if (playerNames.length <= 3) return playerNames.join(", ");
  return `${playerNames.slice(0, 3).join(", ")} +${playerNames.length - 3}`;
}

export default function MinecraftCard({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const ipAddress = String(config["ipAddress"] ?? "play.example.com").trim();
  const portValue = config["port"];
  const parsedPort =
    typeof portValue === "number"
      ? portValue
      : typeof portValue === "string" && portValue.trim()
        ? Number(portValue)
        : Number.NaN;
  const port =
    Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : undefined;
  const title = String(config["name"] ?? "").trim();
  const refreshSecs = Math.max(10, Number(config["refreshSecs"] ?? 600) || 600);

  const [data, setData] = React.useState<McStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<number | null>(null);
  const dataRef = React.useRef<McStatus | null>(null);
  const errorRef = React.useRef<string | null>(null);
  const inFlightRef = React.useRef(false);
  const { registerAction, unregisterAction } = useSharedContext();

  const address = port ? `${ipAddress}:${port}` : ipAddress;
  const displayName = title || "Minecraft";

  const fetchStatus = React.useCallback(async () => {
    if (inFlightRef.current) return dataRef.current;
    if (!address) {
      setError("Configura la direccion del servidor.");
      errorRef.current = "Configura la direccion del servidor.";
      setLoading(false);
      setRefreshing(false);
      return null;
    }

    const hasCachedData = Boolean(dataRef.current);
    inFlightRef.current = true;
    try {
      if (hasCachedData) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      errorRef.current = null;
      const url = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(
        address,
      )}`;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as McStatus;
      setData(json);
      dataRef.current = json;
      setLastUpdatedAt(Date.now());
      return json;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      errorRef.current = message;
      return null;
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [address]);

  React.useEffect(() => {
    dataRef.current = null;
    errorRef.current = null;
    inFlightRef.current = false;
    setData(null);
    setError(null);
    setLastUpdatedAt(null);
    setLoading(true);
    setRefreshing(false);
  }, [address]);

  React.useEffect(() => {
    void fetchStatus();
    const id = window.setInterval(() => {
      void fetchStatus();
    }, refreshSecs * 1000);
    return () => clearInterval(id);
  }, [fetchStatus, refreshSecs]);

  React.useEffect(() => {
    const refreshId = "minecraft-widget:refresh";
    const summaryId = "minecraft-widget:summary";

    registerAction({
      id: refreshId,
      widgetId: "minecraft-widget",
      title: "Actualizar servidor",
      description: "Refresca el estado del servidor Minecraft",
      intentTags: ["actualiza minecraft", "refresca servidor", "minecraft"],
      run: async () => {
        const next = await fetchStatus();
        if (!next)
          return {
            success: false,
            message: errorRef.current ?? "No se pudo actualizar",
          };
        return {
          success: true,
          message: next.online
            ? `Servidor online: ${next.players?.online ?? 0}/${
                next.players?.max ?? 0
              } jugadores.`
            : "Servidor offline.",
        };
      },
    });

    registerAction({
      id: summaryId,
      widgetId: "minecraft-widget",
      title: "Estado Minecraft",
      description: "Lee el estado guardado del servidor",
      intentTags: ["estado minecraft", "jugadores", "servidor"],
      run: async () => {
        const current = dataRef.current ?? (await fetchStatus());
        if (!current)
          return {
            success: false,
            message: errorRef.current ?? "Sin datos del servidor",
          };
        if (!current.online)
          return { success: true, message: "Servidor offline." };
        const list =
          current.players?.list?.map((p) => p.name_raw).filter(Boolean) ?? [];
        const playersText = `${current.players?.online ?? 0}/${
          current.players?.max ?? 0
        }`;
        const names = list.length ? ` Jugadores: ${list.join(", ")}.` : "";
        return {
          success: true,
          message: `Servidor online ${playersText}.${names}`,
        };
      },
    });

    return () => {
      unregisterAction(refreshId);
      unregisterAction(summaryId);
    };
  }, [fetchStatus, registerAction, unregisterAction]);

  if (!address) {
    return (
      <WidgetShell accent="amber">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="amber"
            icon={<Server className="size-3" />}
            title={displayName}
            message="Configura la direccion del servidor para consultar el estado."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (loading && !data) {
    return (
      <WidgetShell accent="amber">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="amber"
            tone="info"
            icon={<RefreshCw className="size-5 animate-spin" />}
            title={displayName}
            message="Consultando el estado del servidor."
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  if (error && !data) {
    return (
      <WidgetShell accent="rose">
        <WidgetContent className="flex items-center">
          <WidgetState
            accent="rose"
            tone="danger"
            icon={<Server className="size-3" />}
            title="No pude consultar Minecraft"
            message={error}
            action={
              <Button
                type="button"
                variant="secondary"
                className="h-9 rounded-lg px-4"
                onClick={() => void fetchStatus()}
              >
                Reintentar
              </Button>
            }
          />
        </WidgetContent>
      </WidgetShell>
    );
  }

  const isOnline = data?.online ?? false;
  const players = data?.players?.online ?? 0;
  const maxPlayers = data?.players?.max ?? 0;
  const motd = normalizeMotd(data?.motd?.clean);
  const version = data?.version?.name_raw ?? "";
  const accent = isOnline ? "emerald" : "amber";
  const playerNames =
    data?.players?.list
      ?.map((player) => player.name_raw?.trim())
      .filter((name): name is string => Boolean(name)) ?? [];
  const playerSummary = formatPlayerSummary(isOnline, players, playerNames);
  const playerFill =
    isOnline && maxPlayers > 0
      ? Math.min(100, Math.max(0, (players / maxPlayers) * 100))
      : 0;
  const motdText = isOnline
    ? motd || "Sin mensaje configurado."
    : "El servidor esta fuera de linea.";

  return (
    <WidgetShell accent={accent}>
      <WidgetHeader
        accent={accent}
        compact
        icon={<Globe2 className="size-3.5 shrink-0" />}
        title={displayName}
        description={
          <span
            className="inline-flex min-w-0 items-center gap-1 truncate"
            title={address}
          >
            <span className="truncate font-mono text-[10px]">{address}</span>
          </span>
        }
        status={
          <WidgetStatus tone={isOnline ? "success" : "warning"}>
            {isOnline ? "Online" : "Offline"}
          </WidgetStatus>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg bg-background/80"
            onClick={() => void fetchStatus()}
            disabled={loading || refreshing}
            title="Actualizar estado del servidor"
            aria-label="Actualizar estado del servidor"
          >
            <RefreshCw
              className={cn(
                "size-4",
                (loading || refreshing) && "animate-spin text-muted-foreground",
              )}
            />
          </Button>
        }
      />

      <WidgetContent className="grid min-h-0 flex-1 grid-cols-[156px_minmax(0,1fr)] gap-2 pt-0">
        <WidgetSection
          accent={accent}
          className="flex min-h-0 flex-col justify-between"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-muted-foreground" />
              <p className="text-muted-foreground text-[8px] font-medium uppercase tracking-[0.16em]">
                Jugadores
              </p>
            </div>

            <div className="flex items-end justify-between gap-2">
              <p className="text-[2rem] font-semibold leading-none tabular-nums">
                {isOnline ? players : "--"}
              </p>
              <span className="text-muted-foreground text-[12px]">
                {isOnline
                  ? maxPlayers
                    ? `/ ${maxPlayers}`
                    : "online"
                  : "sin senal"}
              </span>
            </div>

            <p className="text-muted-foreground line-clamp-2 text-[11px] leading-4">
              {playerSummary}
            </p>
          </div>

          <Progress
            value={playerFill}
            className={cn(
              "mt-2 h-1.5 bg-border/60",
              accent === "emerald"
                ? "[&_[data-slot=progress-indicator]]:bg-emerald-500"
                : "[&_[data-slot=progress-indicator]]:bg-amber-500",
            )}
          />
        </WidgetSection>

        <WidgetSection accent={accent} className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-[8px] font-medium uppercase tracking-[0.16em]">
              MOTD
            </p>
            {version ? (
              <span className="truncate text-[10px] text-muted-foreground">
                {version}
              </span>
            ) : null}
          </div>

          <p
            className={cn(
              "mt-1 line-clamp-2 text-sm leading-[1.15rem]",
              !motd && "text-muted-foreground",
            )}
          >
            {motdText}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-[10px] text-muted-foreground">
            <span className={cn("truncate", error && "text-destructive")}>
              {error
                ? "Ultimo refresh con error"
                : refreshing
                  ? "Actualizando..."
                  : `Act. ${formatTimeLabel(lastUpdatedAt)}`}
            </span>
            <span className="shrink-0">
              Auto {formatRefreshLabel(refreshSecs)}
            </span>
          </div>
        </WidgetSection>
      </WidgetContent>
    </WidgetShell>
  );
}
