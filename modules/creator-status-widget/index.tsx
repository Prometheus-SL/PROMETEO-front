import { useEffect, useState } from "react";
import { Loader2, Radio, Tv, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import {
  WidgetContent,
  WidgetHeader,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import { creatorService, type CreatorStatus } from "@/services/creator";
import { formatTimestamp } from "../_shared/prometeo-widget-kit";

const EMPTY_STATUS: CreatorStatus = {
  online: false,
  liveCount: 0,
  sources: [],
};

export default function CreatorStatusWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Creator Status");
  const pollMs = Math.max(5000, Number(config["pollMs"] ?? 30000));
  const { setShared } = useSharedContext();
  const [status, setStatus] = useState<CreatorStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const nextStatus = await creatorService.getStatus();
        if (cancelled) return;
        setStatus(nextStatus);
        setShared(SHARED_NAMESPACES.providerCreatorStatus, nextStatus);
        setError(null);
      } catch (nextError) {
        if (cancelled) return;
        setError(
          (nextError as Error)?.message ?? "Creator status unavailable.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pollMs, setShared]);

  const accent = status.liveCount > 0 ? ("rose" as const) : ("slate" as const);

  return (
    <WidgetShell accent={accent}>
      <WidgetHeader
        accent={accent}
        icon={<Tv className="size-4" />}
        title={title}
        description="Live visibility across creator channels"
        status={
          <WidgetStatus tone={status.liveCount > 0 ? "danger" : "neutral"}>
            {status.liveCount > 0 ? `${status.liveCount} Live` : "Offline"}
          </WidgetStatus>
        }
      />
      <WidgetContent>
        {loading && status.sources.length === 0 ? (
          <WidgetState
            accent={accent}
            icon={<Loader2 className="size-5 animate-spin" />}
            title="Loading sources"
            message="Checking your creator channels."
          />
        ) : status.sources.length === 0 ? (
          <WidgetState
            accent={accent}
            icon={<Tv className="size-5" />}
            title="No creator sources"
            message={
              error || "Configure YouTube or Twitch to unlock this widget."
            }
          />
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1.5">
              {status.sources.map((source) => (
                <WidgetSection
                  key={source.id}
                  accent={accent}
                  className="space-y-1 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {source.status === "live" ? (
                        <Radio className="size-3.5 shrink-0 text-red-500" />
                      ) : (
                        <Video className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <p className="truncate text-[0.82rem] font-semibold leading-tight">
                        {source.label ?? source.id}
                      </p>
                    </div>
                    <Badge
                      className={
                        source.status === "live"
                          ? "h-4 px-1.5 bg-red-500/20 text-[9px] text-red-700 dark:text-red-200 hover:bg-red-500/20"
                          : "h-4 px-1.5 text-[9px]"
                      }
                      variant={source.status === "live" ? "default" : "outline"}
                    >
                      {source.status}
                    </Badge>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground leading-tight">
                    {source.headline}
                  </p>
                  {source.startedAt ? (
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {formatTimestamp(source.startedAt)}
                    </p>
                  ) : null}
                </WidgetSection>
              ))}
            </div>
          </ScrollArea>
        )}
      </WidgetContent>
    </WidgetShell>
  );
}
