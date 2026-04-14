import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  Search,
  X,
  RotateCcw,
  Tag,
  ImageOff,
  Plus,
  Link2,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import BadgeSelectable from "@/components/common/badgeSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/providers/AuthProvider";
import { accountService } from "@/services/account";
import { getModuleAvailability, type ModuleAvailability } from "../access";
import { useMarketplaceStore, type MarketplaceStore } from "../store";
import type { ModuleMeta, ModuleRole, ModuleSize } from "../types";
import { ModuleConfigModal } from "./ModuleConfigModal";

function capitalize(str?: string | null) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function sizeKey(size: ModuleSize) {
  return `${size.width}x${size.height}`;
}

function formatSize(size: ModuleSize | undefined) {
  if (!size) return "";
  return `${size.width} x ${size.height}`;
}

function formatAudience(audience?: ModuleMeta["audience"]) {
  const currentAudience = audience ?? "dashboard";
  if (currentAudience === "ops") return "Ops";
  if (currentAudience === "client") return "Client";
  if (currentAudience === "all") return "All surfaces";
  return "Dashboard";
}

function formatRole(role?: ModuleRole | null) {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function collectUniqueSizes(modules: ModuleMeta[]): ModuleSize[] {
  const map = new Map<string, ModuleSize>();
  modules.forEach((module) => {
    if (!module.size) return;
    const key = sizeKey(module.size);
    if (!map.has(key)) {
      map.set(key, module.size);
    }
  });
  return Array.from(map.values());
}

function ModuleCard({
  meta,
  availability,
  onAdd,
  onLinkProvider,
}: ModuleCardProps) {
  const categoryLabel = capitalize(meta.category);
  const hasPreview = Boolean(meta.preview);
  const requiredRoleLabel = formatRole(meta.requiredRole);
  const primaryMissingProvider = availability.missingProviders[0] ?? null;

  return (
    <Card className="group flex h-full flex-col overflow-hidden border border-border/70 bg-background/80 shadow-sm transition hover:border-primary/50 hover:shadow-md">
      <div className="relative h-36 w-full">
        {hasPreview ? (
          <img
            src={meta.preview}
            alt={meta.name}
            className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <ImageOff className="size-5" aria-hidden="true" />
            <span className="text-xs font-medium">No preview available</span>
          </div>
        )}
        {categoryLabel ? (
          <Badge
            variant="secondary"
            className="absolute left-3 top-3 border border-border/60 px-2 py-1 text-xs shadow-sm backdrop-blur"
          >
            {categoryLabel}
          </Badge>
        ) : null}
        <Badge
          variant="secondary"
          className="absolute right-3 top-3 border-border/50"
        >
          ID: {meta.id}
        </Badge>
      </div>

      <CardHeader className="space-y-2 pb-0">
        <CardTitle className="text-lg font-semibold leading-tight">
          {meta.name}
        </CardTitle>
        {meta.description ? (
          <CardDescription className="line-clamp-2">
            {meta.description}
          </CardDescription>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline" className="border-border/50">
            {formatAudience(meta.audience)}
          </Badge>
          {requiredRoleLabel ? (
            <Badge variant="outline" className="border-border/50">
              Requires {requiredRoleLabel}
            </Badge>
          ) : null}
          {meta.requiredProviders?.map((providerId) => (
            <Badge
              key={`${meta.id}-${providerId}`}
              variant="outline"
              className={cn(
                "border-border/50",
                availability.missingProviders.includes(providerId)
                  ? "border-amber-500/30 text-amber-700 dark:text-amber-200"
                  : "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
              )}
            >
              {providerId}
            </Badge>
          ))}
          {meta.capabilities?.slice(0, 2).map((capability) => (
            <Badge
              key={`${meta.id}-${capability}`}
              variant="secondary"
              className="bg-primary/10 text-primary"
            >
              {capability}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 bg-background/70">
        <div className="min-w-0 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className="border-dashed border-primary/40 text-primary"
            >
              {meta.configSchema ? "Configurable" : "Quick install"}
            </Badge>
            {meta.size ? (
              <Badge variant="outline" className="border-border/50">
                {formatSize(meta.size)}
              </Badge>
            ) : null}
            {!availability.canInstall && primaryMissingProvider ? (
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-700 dark:text-amber-200"
              >
                Link {primaryMissingProvider}
              </Badge>
            ) : null}
            {!availability.canInstall &&
            !primaryMissingProvider &&
            !availability.hasRequiredRole ? (
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-700 dark:text-amber-200"
              >
                Restricted
              </Badge>
            ) : null}
          </div>
        </div>
        {primaryMissingProvider ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => onLinkProvider(meta, primaryMissingProvider)}
            aria-label={`Link ${primaryMissingProvider} for ${meta.name}`}
          >
            <Link2 className="size-4" />
            Link provider
          </Button>
        ) : (
          <Button
            size="sm"
            className="gap-1"
            onClick={() => onAdd(meta)}
            aria-label={`Install ${meta.name}`}
            disabled={!availability.canInstall}
          >
            {!availability.canInstall && !availability.hasRequiredRole ? (
              <ShieldAlert className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {availability.canInstall
              ? "Add"
              : requiredRoleLabel
                ? `Requires ${requiredRoleLabel}`
                : "Unavailable"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function ModuleCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden border border-border/60 bg-background/60">
      <Skeleton className="h-36 w-full" />
      <CardHeader className="space-y-2 pb-0">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-20" />
      </CardFooter>
    </Card>
  );
}

function EmptyState({ hasFilters, onReset }: EmptyStateProps) {
  return (
    <Card className="mx-6 flex flex-col items-center justify-center gap-3 border border-dashed border-border/60 bg-background/60 p-10 text-center shadow-none">
      <ImageOff className="size-10 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-lg font-semibold">No modules found</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting or clearing the filters to discover more modules."
          : "The marketplace catalogue is coming soon. Check back later for new integrations."}
      </p>
      {hasFilters ? (
        <Button variant="secondary" size="sm" onClick={onReset}>
          Clear filters
        </Button>
      ) : null}
    </Card>
  );
}

type MarketplaceListProps = {
  store?: MarketplaceStore;
};

type ModuleCardProps = {
  meta: ModuleMeta;
  availability: ModuleAvailability;
  onAdd: (module: ModuleMeta) => void;
  onLinkProvider: (meta: ModuleMeta, providerId: string) => void;
};

type EmptyStateProps = {
  hasFilters: boolean;
  onReset: () => void;
};

export function MarketplaceList({ store }: MarketplaceListProps) {
  const fallbackStore = useMarketplaceStore();
  const marketplace = store ?? fallbackStore;
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const {
    state,
    filtered,
    setQuery,
    installModule,
    installModuleTo,
    createDashboard,
    toggleCategory,
    clearCategories,
    toggleSize,
    clearSizes,
    resetFilters,
  } = marketplace;
  const [selected, setSelected] = useState<ModuleMeta | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<
    Record<string, { status?: string | null }>
  >({});

  useEffect(() => {
    let cancelled = false;

    void accountService
      .listProviders()
      .then((providers) => {
        if (cancelled) return;
        setProviderStatuses(
          Object.fromEntries(
            providers.map((provider) => [provider.id, { status: provider.status }]),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setProviderStatuses({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const availabilityById = useMemo(
    () =>
      new Map(
        state.modules.map((module) => [
          module.id,
          getModuleAvailability(module, {
            surface: "dashboard",
            role: user?.role,
            linkedProviders: providerStatuses,
          }),
        ]),
      ),
    [providerStatuses, state.modules, user?.role],
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(state.modules.map((module) => module.category).filter(Boolean)),
      ) as string[],
    [state.modules],
  );

  const sizes = useMemo(() => collectUniqueSizes(state.modules), [state.modules]);

  const filteredModules = useMemo(
    () =>
      filtered.filter(
        (module) => availabilityById.get(module.id)?.isVisibleOnSurface ?? true,
      ),
    [availabilityById, filtered],
  );

  const totalModules = state.modules.length;
  const filteredCount = filteredModules.length;
  const hasFilters =
    state.filters.categories.length > 0 ||
    state.filters.sizes.length > 0 ||
    Boolean(state.filters.query);

  const selectedCategoryLabels = useMemo(
    () => state.filters.categories.map(capitalize).filter(Boolean),
    [state.filters.categories],
  );
  const selectedSizeLabels = useMemo(
    () => state.filters.sizes.map(formatSize).filter(Boolean),
    [state.filters.sizes],
  );

  const handleResetFilters = () => {
    if (!hasFilters) return;
    resetFilters();
  };

  const handleClearSearch = () => {
    if (state.filters.query) {
      setQuery("");
    }
  };

  const handleAddModule = (meta: ModuleMeta) => {
    const availability = availabilityById.get(meta.id);
    if (!availability?.canInstall) {
      if (availability?.missingProviders.length) {
        navigate("/account");
        return;
      }

      if (!availability?.hasRequiredRole) {
        toast.error(
          meta.requiredRole
            ? `This module requires the ${formatRole(meta.requiredRole)} role.`
            : "This module cannot be installed with your current permissions.",
        );
        return;
      }
    }

    setSelected(meta);
  };

  const handleLinkProvider = (_meta: ModuleMeta, providerId: string) => {
    toast.message(`Link ${providerId} from Account to unlock this module.`);
    navigate("/account");
  };

  return (
    <div className="space-y-8">
      <Card className="border border-border/70 bg-background/80 shadow-sm">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Catalogue</CardTitle>
            <CardDescription>
              Filter, explore, and deploy widgets tailored to your dashboards.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <InputGroup>
            <InputGroupAddon className="gap-2">
              <Search className="size-4" aria-hidden="true" />
              <InputGroupText className="hidden text-xs font-medium uppercase tracking-wide sm:inline-flex">
                Search
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={state.filters.query}
              autoComplete="off"
              placeholder="Search modules by name, category, or description"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setQuery(event.target.value)
              }
              aria-label="Search modules"
            />
            {state.filters.query ? (
              <InputGroupButton
                aria-label="Clear search"
                variant="ghost"
                size="icon-sm"
                onClick={handleClearSearch}
              >
                <X className="size-4" />
              </InputGroupButton>
            ) : null}
          </InputGroup>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Categories
            </p>
            <div className="flex flex-wrap gap-2">
              <BadgeSelectable
                key="__all"
                text="All categories"
                selected={state.filters.categories.length === 0}
                onChange={(value) => {
                  if (value) {
                    clearCategories();
                  }
                }}
                className="rounded-full"
              />
              {categories.map((category) => (
                <BadgeSelectable
                  key={category}
                  text={capitalize(category)}
                  selected={state.filters.categories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="rounded-full"
                />
              ))}
              {!state.loading && categories.length === 0 ? (
                <Badge variant="outline" className="border-dashed border-border/50">
                  Categories will appear as the catalogue grows
                </Badge>
              ) : null}
            </div>
          </div>

          {sizes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Layout sizes
              </p>
              <div className="flex flex-wrap gap-2">
                <BadgeSelectable
                  key="__all-sizes"
                  text="All sizes"
                  selected={state.filters.sizes.length === 0}
                  onChange={(value) => {
                    if (value) {
                      clearSizes();
                    }
                  }}
                  className="rounded-full"
                />
                {sizes.map((size) => (
                  <BadgeSelectable
                    key={sizeKey(size)}
                    text={formatSize(size)}
                    selected={state.filters.sizes.includes(size)}
                    onChange={() => toggleSize(size)}
                    className="rounded-full"
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Tag className="size-3.5" />
              {state.loading
                ? "Loading catalogue..."
                : `${filteredCount} result${filteredCount === 1 ? "" : "s"}`}
            </Badge>
            <Badge variant="outline" className="border-dashed border-border/50">
              {state.loading ? "Scanning modules" : `${totalModules} in catalogue`}
            </Badge>
            {state.filters.categories.length > 0 ? (
              <Badge variant="outline" className="border-border/50">
                {state.filters.categories.length} categor
                {state.filters.categories.length === 1 ? "y" : "ies"} active
              </Badge>
            ) : null}
            {state.filters.sizes.length > 0 ? (
              <Badge variant="outline" className="border-border/50">
                {state.filters.sizes.length} size
                {state.filters.sizes.length === 1 ? "" : "s"} selected
              </Badge>
            ) : null}
          </div>

          {hasFilters ? (
            <div className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <div className="me-1 font-medium text-primary">Filters:</div>
                <div>
                  {state.filters.query ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-primary">Search:</span>
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary"
                      >
                        "{state.filters.query}"
                      </Badge>
                    </div>
                  ) : null}
                  {selectedCategoryLabels.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-primary">
                        Categories:
                      </span>
                      {selectedCategoryLabels.map((category) => (
                        <Badge key={category} variant="secondary">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {selectedSizeLabels.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-primary">Sizes:</span>
                      {selectedSizeLabels.map((size) => (
                        <Badge key={size} variant="secondary">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="ml-auto flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full gap-2 sm:mt-0 sm:w-auto"
                    onClick={handleResetFilters}
                  >
                    <RotateCcw className="size-4" />
                    Reset filters
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>

        {state.error ? (
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              Could not load the catalogue
            </CardTitle>
            <CardDescription className="text-destructive/80">
              {state.error}
            </CardDescription>
          </CardHeader>
        ) : null}

        <Separator />

        <CardContent>
          {state.loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ModuleCardSkeleton key={index} />
              ))}
            </div>
          ) : filteredModules.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  meta={module}
                  availability={
                    availabilityById.get(module.id) ??
                    getModuleAvailability(module, {
                      surface: "dashboard",
                      role: user?.role,
                      linkedProviders: providerStatuses,
                    })
                  }
                  onAdd={handleAddModule}
                  onLinkProvider={handleLinkProvider}
                />
              ))}
            </div>
          ) : (
            <EmptyState hasFilters={hasFilters} onReset={handleResetFilters} />
          )}

          {selected ? (
            <ModuleConfigModal
              meta={selected}
              open={Boolean(selected)}
              onClose={() => setSelected(null)}
              pages={state.pages}
              currentPageId={state.currentPageId}
              onCreatePage={async (name) => createDashboard({ name, active: false })}
              onSave={async (config, pageId) => {
                const moduleMeta = selected;
                if (!moduleMeta) return;
                try {
                  if (pageId) {
                    await installModuleTo(pageId, moduleMeta, config);
                  } else {
                    await installModule(moduleMeta, config);
                  }
                  setSelected(null);
                } catch (error) {
                  toast.error(
                    (error as Error)?.message || "Could not add the widget",
                  );
                }
              }}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
