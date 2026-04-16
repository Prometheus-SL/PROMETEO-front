import { useEffect, useState } from "react";
import { Radio, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import { creatorService, type CreatorStatus } from "@/services/creator";
import {
  MetricBadge,
  WidgetEmptyState,
  WidgetShell,
  formatTimestamp,
} from "../_shared/prometeo-widget-kit";

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
        setError((nextError as Error)?.message ?? "Creator status unavailable.");
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

  return (
    <WidgetShell
      title={title}
      subtitle="Live visibility across creator channels."
      badges={[
        <MetricBadge
          key="online"
          label="live"
          value={status.liveCount}
          tone={status.liveCount > 0 ? "warning" : "neutral"}
        />,
      ]}
    >
      {loading && status.sources.length === 0 ? (
        <WidgetEmptyState
          title="Loading creator sources"
          message="PROMETEO is checking your configured creator channels."
        />
      ) : status.sources.length === 0 ? (
        <WidgetEmptyState
          title="No creator sources"
          message={
            error ||
            "Configure YouTube or Twitch environment variables to unlock this widget."
          }
        />
      ) : (
        <div className="space-y-3">
          {status.sources.map((source) => (
            <div
              key={source.id}
              className="rounded-2xl border border-border/70 bg-background/60 p-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full border border-border/70 bg-background/80 p-2">
                  {source.status === "live" ? (
                    <Radio className="size-4 text-red-500" />
                  ) : (
                    <Video className="size-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {source.label ?? source.id}
                    </p>
                    <Badge
                      variant={source.status === "live" ? "default" : "outline"}
                    >
                      {source.status}
                    </Badge>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {source.headline}
                  </p>
                  {source.startedAt ? (
                    <p className="text-[11px] text-muted-foreground">
                      {formatTimestamp(source.startedAt)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
