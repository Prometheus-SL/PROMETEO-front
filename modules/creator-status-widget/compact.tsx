import { useEffect, useState } from "react";
import { Loader2, Radio, Tv, Video } from "lucide-react";

import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import { WidgetShell, WidgetStatus } from "@/modules/ui/WidgetShell";
import { creatorService, type CreatorStatus } from "@/services/creator";

const EMPTY_STATUS: CreatorStatus = {
  online: false,
  liveCount: 0,
  sources: [],
};

export default function CreatorStatusCompactWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 30000));
  const { setShared } = useSharedContext();
  const [status, setStatus] = useState<CreatorStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const nextStatus = await creatorService.getStatus();
        if (cancelled) return;
        setStatus(nextStatus);
        setShared(SHARED_NAMESPACES.providerCreatorStatus, nextStatus);
      } catch {
        /* swallow in compact */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const intervalId = window.setInterval(() => void load(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pollMs, setShared]);

  const liveSource = status.sources.find((s) => s.status === "live");
  const accent = liveSource ? ("rose" as const) : ("slate" as const);

  return (
    <WidgetShell accent={accent}>
      <div className="relative flex h-full flex-col justify-center gap-0.5 px-3 py-2">
        {loading && status.sources.length === 0 ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-[10px]">Syncing</span>
          </div>
        ) : status.sources.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Tv className="size-4 shrink-0" />
            <span className="truncate text-[11px]">No creator sources</span>
          </div>
        ) : (
          <>
            {/* Top: icon + label + badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {liveSource ? (
                  <Radio className="size-3 text-red-500" />
                ) : (
                  <Video className="size-3 text-muted-foreground" />
                )}
                <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {liveSource ? "Live" : "Offline"}
                </span>
              </div>
              <WidgetStatus tone={liveSource ? "danger" : "neutral"}>
                {status.liveCount > 0
                  ? `${status.liveCount} Live`
                  : `${status.sources.length} ch`}
              </WidgetStatus>
            </div>

            {/* Source name */}
            <p className="truncate text-[0.82rem] font-semibold leading-tight">
              {liveSource
                ? (liveSource.label ?? liveSource.id)
                : (status.sources[0]?.label ??
                  status.sources[0]?.id ??
                  "No channels")}
            </p>

            {/* Headline */}
            <p className="truncate text-[10px] text-muted-foreground">
              {liveSource
                ? liveSource.headline
                : (status.sources[0]?.headline ?? "All channels offline")}
            </p>
          </>
        )}
      </div>
    </WidgetShell>
  );
}
