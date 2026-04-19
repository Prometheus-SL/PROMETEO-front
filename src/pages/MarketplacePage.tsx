import { useMemo } from "react";
import {
  CheckCircle2,
  Layers,
  LayoutGrid,
  PackagePlus,
  type LucideIcon,
} from "lucide-react";

import { MarketplaceList } from "@/modules/ui/MarketplaceList";
import { useMarketplaceStore } from "@/modules/store";

export default function MarketplacePage() {
  const store = useMarketplaceStore();
  const { state } = store;

  const categories = useMemo(
    () =>
      Array.from(
        new Set(state.modules.map((module) => module.category).filter(Boolean)),
      ) as string[],
    [state.modules],
  );
  const familyEstimate = useMemo(
    () =>
      new Set(
        state.modules.map(
          (module) => module.marketplace?.familyId?.trim() || module.id,
        ),
      ).size,
    [state.modules],
  );
  const installedModules = state.installed.length;

  return (
    <div className="space-y-6">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Marketplace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Widget library
            </h1>
            <p className="text-base text-muted-foreground">
              A compact catalogue for dashboard widgets, variants, providers,
              and availability.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <MetricPill
              icon={PackagePlus}
              label="Widgets"
              value={state.loading ? "..." : `${familyEstimate}`}
            />
            <MetricPill
              icon={Layers}
              label="Variants"
              value={state.loading ? "..." : `${state.modules.length}`}
            />
            <MetricPill
              icon={CheckCircle2}
              label="Installed"
              value={state.loading ? "..." : `${installedModules}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <MetricBadge icon={LayoutGrid} label={`${categories.length} categories`} />
          <MetricBadge
            icon={Layers}
            label={
              categories.length > 0
                ? categories.slice(0, 4).map(formatCategory).join(", ")
                : "Ready for modules"
            }
          />
        </div>
      </section>

      <MarketplaceList store={store} />
    </div>
  );
}

type MetricPillProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

function MetricPill({ icon: Icon, label, value }: MetricPillProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
      <span className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium uppercase text-muted-foreground">
          {label}
        </span>
        <span className="block text-lg font-semibold">{value}</span>
      </span>
    </div>
  );
}

function MetricBadge({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

function formatCategory(value?: string | null) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
