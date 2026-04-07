import { useMemo } from "react";
import {
  Sparkles,
  Puzzle,
  Layers,
  Filter,
  Rocket,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Meteors } from "@/components/ui/meteors";
import { MarketplaceList } from "@/modules/ui/MarketplaceList";
import { useMarketplaceStore } from "@/modules/store";

export default function MarketplacePage() {
  const store = useMarketplaceStore();
  const { state, filtered } = store;

  const totalModules = state.modules.length;
  const installedModules = state.installed.length;
  const categories = useMemo(
    () =>
      Array.from(
        new Set(state.modules.map((module) => module.category).filter(Boolean))
      ) as string[],
    [state.modules]
  );
  const activeFilters = state.filters.categories.length;
  const heroStats = useMemo(
    () => [
      {
        icon: Puzzle,
        label: "Modules available",
        value: state.loading ? "Loading…" : `${totalModules}`,
        helper: state.loading ? "Fetching catalog" : "Ready to deploy",
      },
      {
        icon: Layers,
        label: "Categories",
        value: state.loading ? "—" : `${categories.length}`,
        helper:
          categories.length > 0
            ? `${categories.slice(0, 3).map(formatCategory).join(", ")}${
                categories.length > 3 ? " +" : ""
              }`
            : "Keep modules organized",
      },
      {
        icon: Rocket,
        label: "Installed in dashboards",
        value: state.loading ? "—" : `${installedModules}`,
        helper:
          installedModules > 0
            ? `${installedModules === 1 ? "Module" : "Modules"} active today`
            : "Ready for launch",
      },
      {
        icon: Filter,
        label: "Current results",
        value: state.loading ? "—" : `${filtered.length}`,
        helper:
          activeFilters > 0 || state.filters.query
            ? `Filtered by ${formatFilters(activeFilters, state.filters.query)}`
            : "Showing the full catalogue",
      },
    ],
    [
      state.loading,
      totalModules,
      categories,
      installedModules,
      filtered.length,
      activeFilters,
      state.filters.query,
    ]
  );

  return (
    <div className="space-y-12 ">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-background/60 to-transparent p-6 shadow-lg shadow-primary/5 lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <Meteors number={40} className="opacity-70" />
        </div>

        <div className="relative grid gap-10 lg:grid-cols-[1.3fr,0.7fr] lg:items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl xl:text-5xl">
                  Module Marketplace
                </h1>
                <p className="text-base text-muted-foreground sm:text-lg">
                  Here at the Marketplace, you can explore and discover
                  additional modules to enhance your agents' capabilities.
                  Easily install and manage modules from this catalog.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-sm">
                <a href="#modules">
                  <Sparkles className="size-5" />
                  Browse catalogue
                </a>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {heroStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
          </div>

          <section id="modules" className="space-y-6">
            <MarketplaceList store={store} />
          </section>
        </div>
      </section>
    </div>
  );
}

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
};

function StatCard({ icon: Icon, label, value, helper }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-primary/40 bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </div>
      {helper && <p className="mt-3 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function formatCategory(value?: string | null) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatFilters(count: number, query?: string) {
  if (query && count > 0) {
    return `${count} categor${count === 1 ? "y" : "ies"} & “${query}”`;
  }
  if (query) {
    return `search “${query}”`;
  }
  if (count > 0) {
    return `${count} categor${count === 1 ? "y" : "ies"}`;
  }
  return "no active filters";
}
