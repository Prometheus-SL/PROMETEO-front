import { Badge } from "@/components/ui/badge";

import { MetricBadge, WidgetShell } from "../_shared/prometeo-widget-kit";

export default function YourWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Your Widget");
  const subtitle = String(
    config["subtitle"] ?? "Replace this text with the real purpose of the module.",
  );
  const value = String(config["value"] ?? "42");
  const status = config["status"] === "warning" ? "warning" : "ready";
  const showSecondaryNote = Boolean(config["showSecondaryNote"] ?? true);

  return (
    <WidgetShell
      title={title}
      subtitle={subtitle}
      badges={[
        <MetricBadge
          key="status"
          label="status"
          value={status}
          tone={status === "warning" ? "warning" : "success"}
        />,
      ]}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Primary value
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline">
            {status === "warning" ? "Needs attention" : "Everything looks good"}
          </Badge>
          {showSecondaryNote ? (
            <p className="text-xs text-muted-foreground">
              Replace this block with actions, context, or secondary metrics.
            </p>
          ) : null}
        </div>
      </div>
    </WidgetShell>
  );
}
