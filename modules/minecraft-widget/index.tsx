import * as React from "react";
import { Users, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type McStatus = {
  online: boolean;
  host?: string;
  port?: number;
  players?: {
    online?: number;
    max?: number;
    list?: Array<{ name_raw?: string }>;
  };
  motd?: { clean?: string };
  version?: { name_raw?: string };
};

export default function MinecraftCard({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const ipAddress = String(config["ipAddress"] ?? "play.example.com");
  const port = Number(config["port"] ?? 25565);
  const title = String(config["name"] ?? "");
  const refreshSecs = Number(config["refreshSecs"] ?? 600);
  const [data, setData] = React.useState<McStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const address = `${ipAddress}:${port}`;
  const displayName = title ?? "Minecraft";

  const fetchStatus = React.useCallback(async () => {
    if (!address) {
      setError("Falta VITE_MC_SERVER_ADDRESS en .env");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const url = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(
        address
      )}`;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as McStatus;
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [address]);

  React.useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, refreshSecs * 1000);
    return () => clearInterval(id);
  }, [fetchStatus, refreshSecs]);

  const isOnline = data?.online ?? false;
  const players = data?.players?.online ?? 0;
  const maxPlayers = data?.players?.max ?? 0;
  const motd = data?.motd?.clean ?? "";
  const version = data?.version?.name_raw ?? "";

  return (
    <Card className="rounded-xl p-4 h-full">
      <div className="h-full flex flex-col justify-center">
        <div className="flex items-center gap-4">
          <div className="min-w-0 space-y-1">
            <div className="text-lg font-semibold truncate">
              {displayName}{" "}
              {version && <span className="text-sm opacity-80">{version}</span>}
            </div>
            <div className="text-sm truncate opacity-80 flex items-center">
              {loading ? (
                "Loading..."
              ) : error ? (
                `Error: ${error}`
              ) : isOnline ? (
                <Badge className="rounded-full border-none bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 focus-visible:outline-none dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5">
                  <span
                    className="size-1.5 rounded-full bg-green-600 dark:bg-green-400"
                    aria-hidden="true"
                  />
                  {address ?? "—"}
                </Badge>
              ) : (
                <Badge className="bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive rounded-full border-none focus-visible:outline-none">
                  <span
                    className="bg-destructive size-1.5 rounded-full"
                    aria-hidden="true"
                  />
                  Offline
                </Badge>
              )}
              <button
                onClick={fetchStatus}
                className="inline-flex items-center gap-1 bg-white/20 px-2 py-1 text-xs hover:bg-white/30 ms-2 rounded-full"
                title="Refresh"
              >
                <RefreshCcw className="size-3" />
              </button>
            </div>
          </div>
          <div className="ml-auto text-right flex flex-col justify-center items-end">
            <div className="text-3xl font-bold tabular-nums">
              {isOnline ? ` ${players}/${maxPlayers}` : "—"}
            </div>
            <div className="text-xs opacity-80 flex items-center gap-1">
              <Users className="size-3" />
              <span>Players</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
          {motd && (
            <div className="col-span-3 bg-white/20 rounded-md p-2">
              <div className="text-xs opacity-80 mb-1">MOTD</div>
              <div className="font-medium truncate" title={motd}>
                {motd}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
