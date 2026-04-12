import { useMemo, useState, type ChangeEvent } from "react";
import { Search, X, RotateCcw, Tag, ImageOff, Plus } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import BadgeSelectable from "@/components/common/badgeSelect";
import { useMarketplaceStore, type MarketplaceStore } from "../store";
import type { ModuleMeta, ModuleSize } from "../types";
import { ModuleConfigModal } from "./ModuleConfigModal";
import { Separator } from "@/components/ui/separator";

function capitalize(str?: string | null) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function ModuleCard({ meta, onAdd }: ModuleCardProps) {
  const categoryLabel = capitalize(meta.category);
  const hasPreview = Boolean(meta.preview);

  return (
    <Card className="group flex h-full flex-col overflow-hidden border border-border/70 bg-background/80 shadow-sm transition hover:border-primary/50 hover:shadow-md">
      <div className="relative h-36 w-full">
        {hasPreview ? (
          <img
            src={meta.preview}
            alt={meta.name}
            className="h-full w-full transition duration-300 group-hover:scale-[1.03] object-contain "
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <ImageOff className="size-5" aria-hidden="true" />
            <span className="text-xs font-medium">No preview available</span>
          </div>
        )}
        {categoryLabel && (
          <Badge
            variant="secondary"
            className="absolute left-3 top-3 border border-border/60 px-2 py-1 text-xs shadow-sm backdrop-blur"
          >
            {categoryLabel}
          </Badge>
        )}

        <Badge
          variant="secondary"
          className="border-border/50 absolute right-3 top-3 "
        >
          ID: {meta.id}
        </Badge>
      </div>

      <CardHeader className="space-y-2 pb-0">
        <CardTitle className="text-lg font-semibold leading-tight">
          {meta.name}
        </CardTitle>
        {meta.description && (
          <CardDescription className="line-clamp-2">
            {meta.description}
          </CardDescription>
        )}
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
            {meta.size && (
              <Badge variant="outline" className="border-border/50">
                {formatSize(meta.size)}
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1"
          onClick={() => onAdd(meta)}
          aria-label={`Install ${meta.name}`}
        >
          <Plus className="size-4" />
          Add
        </Button>
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
        <Skeleton className="h-8 w-16" />
      </CardFooter>
    </Card>
  );
}

function EmptyState({ hasFilters, onReset }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 border border-dashed border-border/60 bg-background/60 p-10 text-center shadow-none mx-6">
      <ImageOff className="size-10 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-lg font-semibold">No modules found</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting or clearing the filters to discover more modules."
          : "The marketplace catalogue is coming soon. Check back later for new integrations."}
      </p>
      {hasFilters && (
        <Button variant="secondary" size="sm" onClick={onReset}>
          Clear filters
        </Button>
      )}
    </Card>
  );
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

function sizeKey(size: ModuleSize) {
  return `${size.width}x${size.height}`;
}

function formatSize(size: ModuleSize | undefined) {
  if (!size) return "";
  return `${size.width} × ${size.height}`;
}

type MarketplaceListProps = {
  store?: MarketplaceStore;
};

type ModuleCardProps = {
  meta: ModuleMeta;
  onAdd: (m: ModuleMeta) => void;
};

type EmptyStateProps = {
  hasFilters: boolean;
  onReset: () => void;
};

export function MarketplaceList({ store }: MarketplaceListProps) {
  const fallbackStore = useMarketplaceStore();
  const marketplace = store ?? fallbackStore;
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

  const categories = useMemo(
    () =>
      Array.from(
        new Set(state.modules.map((module) => module.category).filter(Boolean))
      ) as string[],
    [state.modules]
  );

  const sizes = useMemo(
    () => collectUniqueSizes(state.modules),
    [state.modules]
  );

  const totalModules = state.modules.length;
  const filteredCount = filtered.length;
  const hasFilters =
    state.filters.categories.length > 0 ||
    state.filters.sizes.length > 0 ||
    Boolean(state.filters.query);

  const selectedCategoryLabels = useMemo(
    () => state.filters.categories.map(capitalize).filter(Boolean),
    [state.filters.categories]
  );
  const selectedSizeLabels = useMemo(
    () => state.filters.sizes.map(formatSize).filter(Boolean),
    [state.filters.sizes]
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
              <InputGroupText className="hidden sm:inline-flex text-xs font-medium uppercase tracking-wide">
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
            {state.filters.query && (
              <InputGroupButton
                aria-label="Clear search"
                variant="ghost"
                size="icon-sm"
                onClick={handleClearSearch}
              >
                <X className="size-4" />
              </InputGroupButton>
            )}
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
              {!state.loading && categories.length === 0 && (
                <Badge
                  variant="outline"
                  className="border-dashed border-border/50"
                >
                  Categories will appear as the catalogue grows
                </Badge>
              )}
            </div>
          </div>

          {sizes.length > 0 && (
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
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Tag className="size-3.5" />
              {state.loading
                ? "Loading catalogue…"
                : `${filteredCount} result${filteredCount === 1 ? "" : "s"}`}
            </Badge>
            <Badge variant="outline" className="border-dashed border-border/50">
              {state.loading
                ? "Scanning modules"
                : `${totalModules} in catalogue`}
            </Badge>
            {state.filters.categories.length > 0 && (
              <Badge variant="outline" className="border-border/50">
                {state.filters.categories.length} categor
                {state.filters.categories.length === 1 ? "y" : "ies"} active
              </Badge>
            )}
            {state.filters.sizes.length > 0 && (
              <Badge variant="outline" className="border-border/50">
                {state.filters.sizes.length} size
                {state.filters.sizes.length === 1 ? "" : "s"} selected
              </Badge>
            )}
          </div>

          {hasFilters && (
            <div className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-primary me-1">Filters:</div>
                <div>
                  {state.filters.query && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-primary">Search:</span>
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary"
                      >
                        “{state.filters.query}”
                      </Badge>
                    </div>
                  )}
                  {selectedCategoryLabels.length > 0 && (
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
                  )}
                  {selectedSizeLabels.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-primary">Sizes:</span>
                      {selectedSizeLabels.map((size) => (
                        <Badge key={size} variant="secondary">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-auto flex-shrink-0">
                  {hasFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full gap-2 sm:mt-0 sm:w-auto"
                      onClick={handleResetFilters}
                    >
                      <RotateCcw className="size-4" />
                      Reset filters
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {state.error && (
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              Could not load the catalogue
            </CardTitle>
            <CardDescription className="text-destructive/80">
              {state.error}
            </CardDescription>
          </CardHeader>
        )}

        <Separator />

        <CardContent>
          {state.loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ModuleCardSkeleton key={index} />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 ">
              {filtered.map((module) => (
                <ModuleCard key={module.id} meta={module} onAdd={setSelected} />
              ))}
            </div>
          ) : (
            <EmptyState hasFilters={hasFilters} onReset={handleResetFilters} />
          )}

          {selected && (
            <ModuleConfigModal
              meta={selected}
              open={Boolean(selected)}
              onClose={() => setSelected(null)}
              pages={state.pages}
              currentPageId={state.currentPageId}
              onCreatePage={async (name) =>
                createDashboard({ name, active: false })
              }
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
                    (error as Error)?.message || "Could not add the widget"
                  );
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
