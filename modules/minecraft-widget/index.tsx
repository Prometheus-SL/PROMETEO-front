import * as React from "react";
import { Globe2, RefreshCcw } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";

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
  const port = Number(config["port"] ?? null);
  const title = String(config["name"] ?? "");
  const refreshSecs = Number(config["refreshSecs"] ?? 600);
  const [data, setData] = React.useState<McStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const address = port ? `${ipAddress}:${port}` : ipAddress;
  const displayName = title ?? "Minecraft";

  const fetchStatus = React.useCallback(async () => {
    if (!address) {
      setError("No address configured");
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
    <Card
      className={cn(
        "relative h-full overflow-hidden gap-0 border border-border/60 bg-background/90 p-0 shadow-lg shadow-primary/10 transition-shadow",
        isOnline ? "hover:shadow-emerald-500/20" : "hover:shadow-destructive/20"
      )}
    >
      <GridPattern
        width={30}
        height={30}
        x={-1}
        y={-1}
        strokeDasharray="4 2"
        className={cn(
          "pointer-events-none opacity-40 [mask-image:radial-gradient(360px_circle_at_center,white,transparent)]"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br ",
          isOnline
            ? "from-emerald-500/15 via-primary/10 to-background"
            : "from-destructive/20 via-primary/10 to-background"
        )}
      />

      <CardHeader className="relative z-10 py-4 pb-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
              {displayName || "Minecraft"}
              {version && (
                <Badge
                  className="bg-background/60 text-foreground"
                  variant="secondary"
                >
                  {version}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
              <Badge
                variant="outline"
                className="bg-background/70 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/50"
              >
                <Globe2 className="size-3.5" />
                {address ?? "N/A"}
              </Badge>
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-2 align-items-">
            <Badge
              variant={isOnline ? "secondary" : "destructive"}
              className={cn(
                "px-3 py-1 text-xs uppercase tracking-wide",
                isOnline
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/20"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  isOnline
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-destructive"
                )}
                aria-hidden="true"
              />
              {loading ? "Refreshing..." : isOnline ? "Online" : "Offline"}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchStatus}
              disabled={loading}
              className="border-border/40 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50"
            >
              <RefreshCcw
                className={cn(
                  "size-4",
                  loading && "animate-spin text-muted-foreground"
                )}
              />
            </Button>
          </CardAction>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 flex flex-col gap-6 pb-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,100px)_1fr] sm:items-center">
          <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Players
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums text-foreground">
                {isOnline ? players : "--"}
              </span>
              {maxPlayers ? (
                <span className="text-sm text-muted-foreground">
                  of {maxPlayers}
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3 shadow-sm h-full">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              MOTD
            </div>
            <div className="mt-1 flex items-baseline gap-2 mt-4">
              <div className="font-medium text-foreground text-xl leading-snug">
                {loading
                  ? "Obtaining server status..."
                  : error
                  ? "Could not obtain server status."
                  : motd || "Server has no message of the day."}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm text-destructive">
            Error: {error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
