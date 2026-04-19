import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  CheckCircle2,
  Eye,
  ImageOff,
  Info,
  Link2,
  Lock,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Tag,
  X,
  Zap,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/providers/AuthProvider";
import { accountService } from "@/services/account";
import {
  filterMarketplaceFamilies,
  groupMarketplaceFamilies,
  type MarketplaceFamily,
  type MarketplaceFamilyStatus,
  type MarketplaceVariant,
} from "../catalog";
import { getModuleAvailability, type ModuleAvailability } from "../access";
import { useMarketplaceStore, type MarketplaceStore } from "../store";
import type { MarketplaceFilters, ModuleMeta, ModuleRole, ModuleSize } from "../types";
import { ModuleConfigModal } from "./ModuleConfigModal";

type MarketplaceListProps = {
  store?: MarketplaceStore;
};

type ModuleCardProps = {
  family: MarketplaceFamily;
  selectedVariantId?: string;
  onVariantChange: (familyId: string, moduleId: string) => void;
  onAdd: (module: ModuleMeta) => void;
  onLinkProvider: (meta: ModuleMeta, providerId: string) => void;
  onDetails: (family: MarketplaceFamily, variant: MarketplaceVariant) => void;
};

type DetailSelection = {
  familyId: string;
  variantId: string;
} | null;

type EmptyStateProps = {
  hasFilters: boolean;
  onReset: () => void;
};

type ProviderStatusMap = Record<string, { status?: string | null }>;

const STATUS_OPTIONS: Array<{
  value: MarketplaceFilters["status"];
  label: string;
  icon: typeof Tag;
}> = [
  { value: "all", label: "All", icon: Tag },
  { value: "ready", label: "Ready to add", icon: CheckCircle2 },
  { value: "needs-connection", label: "Needs connection", icon: Link2 },
  { value: "restricted", label: "Restricted", icon: Lock },
];

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
  return Array.from(map.values()).sort(
    (a, b) => a.width - b.width || a.height - b.height,
  );
}

function collectUniqueProviders(modules: ModuleMeta[]) {
  return Array.from(
    new Set(modules.flatMap((module) => module.requiredProviders ?? [])),
  ).sort((a, b) => a.localeCompare(b));
}

function getSelectedVariant(
  family: MarketplaceFamily,
  selectedVariantId?: string,
) {
  return (
    family.variants.find((variant) => variant.meta.id === selectedVariantId) ??
    family.variants[0]
  );
}

function getStatusLabel(status: MarketplaceFamilyStatus) {
  if (status === "ready") return "Ready";
  if (status === "needs-connection") return "Connect";
  return "Restricted";
}

function getStatusClassName(status: MarketplaceFamilyStatus) {
  if (status === "ready") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "needs-connection") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200";
  }
  return "border-destructive/30 bg-destructive/10 text-destructive";
}

function getPrimaryMissingProvider(variant: MarketplaceVariant) {
  return variant.availability?.missingProviders[0] ?? null;
}

function isVariantInstallable(variant: MarketplaceVariant) {
  return variant.availability?.canInstall ?? true;
}

function ProviderBadges({ providers }: { providers: string[] }) {
  if (providers.length === 0) {
    return (
      <Badge variant="outline" className="border-border/60">
        Built-in
      </Badge>
    );
  }

  return providers.map((provider) => (
    <Badge key={provider} variant="outline" className="border-border/60">
      {provider}
    </Badge>
  ));
}

function StatusBadge({ status }: { status: MarketplaceFamilyStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1", getStatusClassName(status))}
    >
      {status === "ready" ? (
        <CheckCircle2 className="size-3.5" />
      ) : status === "needs-connection" ? (
        <Link2 className="size-3.5" />
      ) : (
        <Lock className="size-3.5" />
      )}
      {getStatusLabel(status)}
    </Badge>
  );
}

function ModulePreview({
  meta,
  className,
}: {
  meta: ModuleMeta;
  className?: string;
}) {
  if (meta.preview) {
    return (
      <img
        src={meta.preview}
        alt={meta.name}
        className={cn("h-full w-full object-contain", className)}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <ImageOff className="size-5" aria-hidden="true" />
      <span className="text-xs font-medium">No preview</span>
    </div>
  );
}

function VariantAction({
  variant,
  onAdd,
  onLinkProvider,
  className,
}: {
  variant: MarketplaceVariant;
  onAdd: (module: ModuleMeta) => void;
  onLinkProvider: (meta: ModuleMeta, providerId: string) => void;
  className?: string;
}) {
  const missingProvider = getPrimaryMissingProvider(variant);
  const canInstall = isVariantInstallable(variant);
  const requiredRoleLabel = formatRole(variant.meta.requiredRole);

  if (missingProvider) {
    return (
      <Button
        size="sm"
        variant="outline"
        className={cn("gap-2", className)}
        onClick={() => onLinkProvider(variant.meta, missingProvider)}
        aria-label={`Link ${missingProvider} for ${variant.meta.name}`}
      >
        <Link2 className="size-4" />
        Link provider
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className={cn("gap-2", className)}
      onClick={() => onAdd(variant.meta)}
      aria-label={`Install ${variant.meta.name}`}
      disabled={!canInstall}
    >
      {!canInstall ? (
        <ShieldAlert className="size-4" />
      ) : (
        <Plus className="size-4" />
      )}
      {canInstall
        ? "Add"
        : requiredRoleLabel
          ? `Requires ${requiredRoleLabel}`
          : "Unavailable"}
    </Button>
  );
}

function FamilyCard({
  family,
  selectedVariantId,
  onVariantChange,
  onAdd,
  onLinkProvider,
  onDetails,
}: ModuleCardProps) {
  const variant = getSelectedVariant(family, selectedVariantId);
  const categoryLabel = capitalize(variant.meta.category);

  return (
    <Card className="group flex h-full flex-col overflow-hidden border border-border/70 bg-background/85 py-0 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <CardHeader className="space-y-3 pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {categoryLabel ? (
                <Badge variant="secondary" className="border border-border/50">
                  {categoryLabel}
                </Badge>
              ) : null}
              <StatusBadge status={variant.status} />
            </div>
            <CardTitle className="line-clamp-2 text-xl leading-tight">
              {family.name}
            </CardTitle>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onDetails(family, variant)}
                aria-label={`Open details for ${family.name}`}
              >
                <Info className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Details</TooltipContent>
          </Tooltip>
        </div>

        {variant.meta.description ? (
          <CardDescription className="line-clamp-2 min-h-[2.5rem]">
            {variant.meta.description}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <button
          type="button"
          className="aspect-[16/7] overflow-hidden rounded-lg border border-border/70 bg-muted/30 text-left transition group-hover:border-primary/30"
          onClick={() => onDetails(family, variant)}
          aria-label={`Preview ${variant.meta.name}`}
        >
          <ModulePreview meta={variant.meta} />
        </button>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Variant
            </p>
            {family.variants.length > 1 ? (
              <Select
                value={variant.meta.id}
                onValueChange={(value) => onVariantChange(family.id, value)}
              >
                <SelectTrigger className="w-full" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {family.variants.map((candidate) => (
                    <SelectItem key={candidate.meta.id} value={candidate.meta.id}>
                      {candidate.label} · {formatSize(candidate.meta.size)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="w-fit border-border/60">
                {variant.label}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Badge variant="outline" className="border-border/60">
              {formatSize(variant.meta.size)}
            </Badge>
            <Badge variant="outline" className="border-border/60">
              {formatAudience(variant.meta.audience)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ProviderBadges providers={variant.meta.requiredProviders ?? []} />
          {(variant.meta.capabilities ?? []).slice(0, 2).map((capability) => (
            <Badge key={capability} variant="secondary">
              {capability}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 bg-muted/45 px-6 py-4 dark:bg-muted/35 [.border-t]:pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => onDetails(family, variant)}
        >
          <Eye className="size-4" />
          Details
        </Button>
        <VariantAction
          variant={variant}
          onAdd={onAdd}
          onLinkProvider={onLinkProvider}
        />
      </CardFooter>
    </Card>
  );
}

function FamilyCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden border border-border/60 bg-background/60 py-0">
      <CardHeader className="space-y-3 pt-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="aspect-[16/7] w-full" />
        <Skeleton className="h-8 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between border-t border-border/60 bg-muted/35 px-6 py-4 [.border-t]:pt-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </CardFooter>
    </Card>
  );
}

function EmptyState({ hasFilters, onReset }: EmptyStateProps) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/60 p-10 text-center">
      <ImageOff className="size-10 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-lg font-semibold">No widgets found</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        {hasFilters
          ? "Adjust or clear filters to show more widget families."
          : "The catalogue is waiting for modules."}
      </p>
      {hasFilters ? (
        <Button variant="secondary" size="sm" onClick={onReset}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function MarketplaceToolbar({
  filters,
  categories,
  providers,
  sizes,
  familyCount,
  variantCount,
  totalFamilyCount,
  hasFilters,
  onQueryChange,
  onClearSearch,
  onToggleCategory,
  onClearCategories,
  onToggleProvider,
  onClearProviders,
  onToggleSize,
  onClearSizes,
  onStatusChange,
  onReset,
}: {
  filters: MarketplaceFilters;
  categories: string[];
  providers: string[];
  sizes: ModuleSize[];
  familyCount: number;
  variantCount: number;
  totalFamilyCount: number;
  hasFilters: boolean;
  onQueryChange: (query: string) => void;
  onClearSearch: () => void;
  onToggleCategory: (category: string) => void;
  onClearCategories: () => void;
  onToggleProvider: (provider: string) => void;
  onClearProviders: () => void;
  onToggleSize: (size: ModuleSize) => void;
  onClearSizes: () => void;
  onStatusChange: (status: MarketplaceFilters["status"]) => void;
  onReset: () => void;
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-border/70 bg-background/85 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0 flex-1">
          <InputGroup>
            <InputGroupAddon className="gap-2">
              <Search className="size-4" aria-hidden="true" />
              <InputGroupText className="hidden text-xs font-medium uppercase sm:inline-flex">
                Search
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={filters.query}
              autoComplete="off"
              placeholder="Search widgets, providers, categories, capabilities"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onQueryChange(event.target.value)
              }
              aria-label="Search widgets"
            />
            {filters.query ? (
              <InputGroupButton
                aria-label="Clear search"
                variant="ghost"
                size="icon-sm"
                onClick={onClearSearch}
              >
                <X className="size-4" />
              </InputGroupButton>
            ) : null}
          </InputGroup>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={filters.status === value ? "secondary" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => onStatusChange(value)}
            >
              <Icon className="size-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FilterGroup title="Categories">
          <BadgeSelectable
            key="__all"
            text="All"
            selected={filters.categories.length === 0}
            onChange={(value) => {
              if (value) onClearCategories();
            }}
            className="rounded-full"
          />
          {categories.map((category) => (
            <BadgeSelectable
              key={category}
              text={capitalize(category)}
              selected={filters.categories.includes(category)}
              onChange={() => onToggleCategory(category)}
              className="rounded-full"
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Providers">
          <BadgeSelectable
            key="__all-providers"
            text="All"
            selected={filters.providers.length === 0}
            onChange={(value) => {
              if (value) onClearProviders();
            }}
            className="rounded-full"
          />
          {providers.length > 0 ? (
            providers.map((provider) => (
              <BadgeSelectable
                key={provider}
                text={provider}
                selected={filters.providers.includes(provider)}
                onChange={() => onToggleProvider(provider)}
                className="rounded-full"
              />
            ))
          ) : (
            <Badge variant="outline" className="border-dashed border-border/50">
              No linked providers
            </Badge>
          )}
        </FilterGroup>

        <FilterGroup title="Layout sizes">
          <BadgeSelectable
            key="__all-sizes"
            text="All"
            selected={filters.sizes.length === 0}
            onChange={(value) => {
              if (value) onClearSizes();
            }}
            className="rounded-full"
          />
          {sizes.map((size) => (
            <BadgeSelectable
              key={sizeKey(size)}
              text={formatSize(size)}
              selected={filters.sizes.some((selected) => sizeKey(selected) === sizeKey(size))}
              onChange={() => onToggleSize(size)}
              className="rounded-full"
            />
          ))}
        </FilterGroup>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="gap-1">
          <Zap className="size-3.5" />
          {familyCount} famil{familyCount === 1 ? "y" : "ies"}
        </Badge>
        <Badge variant="outline" className="border-dashed border-border/60">
          {variantCount} variant{variantCount === 1 ? "" : "s"}
        </Badge>
        <Badge variant="outline" className="border-dashed border-border/60">
          {totalFamilyCount} total families
        </Badge>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto gap-2"
            onClick={onReset}
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
        <SlidersHorizontal className="size-3.5" />
        {title}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function DetailSheet({
  family,
  selectedVariantId,
  onVariantChange,
  onOpenChange,
  onAdd,
  onLinkProvider,
}: {
  family: MarketplaceFamily | null;
  selectedVariantId?: string;
  onVariantChange: (familyId: string, moduleId: string) => void;
  onOpenChange: (open: boolean) => void;
  onAdd: (module: ModuleMeta) => void;
  onLinkProvider: (meta: ModuleMeta, providerId: string) => void;
}) {
  const variant = family ? getSelectedVariant(family, selectedVariantId) : null;

  return (
    <Sheet open={Boolean(family)} onOpenChange={onOpenChange}>
      <SheetContent className="w-[92vw] overflow-hidden p-0 sm:max-w-xl">
        {family && variant ? (
          <>
            <SheetHeader className="border-b border-border/70 p-5 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                {variant.meta.category ? (
                  <Badge variant="secondary">
                    {capitalize(variant.meta.category)}
                  </Badge>
                ) : null}
                <StatusBadge status={variant.status} />
              </div>
              <SheetTitle className="text-2xl">{family.name}</SheetTitle>
              <SheetDescription>{variant.meta.description}</SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="aspect-[16/9] overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                <ModulePreview meta={variant.meta} />
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Variants</h3>
                <div className="grid gap-2">
                  {family.variants.map((candidate) => (
                    <button
                      key={candidate.meta.id}
                      type="button"
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition hover:border-primary/40",
                        candidate.meta.id === variant.meta.id
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/70 bg-background",
                      )}
                      onClick={() =>
                        onVariantChange(family.id, candidate.meta.id)
                      }
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">
                          {candidate.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatSize(candidate.meta.size)} ·{" "}
                          {getStatusLabel(candidate.status)}
                        </span>
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(getStatusClassName(candidate.status))}
                      >
                        {candidate.status === "ready"
                          ? "Ready"
                          : candidate.status === "needs-connection"
                            ? "Connect"
                            : "Restricted"}
                      </Badge>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <DetailBlock title="Providers">
                  <ProviderBadges providers={variant.meta.requiredProviders ?? []} />
                </DetailBlock>
                <DetailBlock title="Capabilities">
                  {(variant.meta.capabilities ?? []).length > 0 ? (
                    (variant.meta.capabilities ?? []).map((capability) => (
                      <Badge key={capability} variant="secondary">
                        {capability}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">None</Badge>
                  )}
                </DetailBlock>
                <DetailBlock title="Layout">
                  <Badge variant="outline">{formatSize(variant.meta.size)}</Badge>
                  <Badge variant="outline">
                    {formatAudience(variant.meta.audience)}
                  </Badge>
                </DetailBlock>
                <DetailBlock title="Technical">
                  <Badge variant="outline" className="max-w-full truncate">
                    ID: {variant.meta.id}
                  </Badge>
                </DetailBlock>
              </section>
            </div>

            <SheetFooter className="border-t border-border/70 p-5">
              <VariantAction
                variant={variant}
                onAdd={onAdd}
                onLinkProvider={onLinkProvider}
                className="w-full justify-center"
              />
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function MarketplaceList({ store }: MarketplaceListProps) {
  const fallbackStore = useMarketplaceStore();
  const marketplace = store ?? fallbackStore;
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const {
    state,
    setQuery,
    installModule,
    installModuleTo,
    createDashboard,
    toggleCategory,
    clearCategories,
    toggleSize,
    clearSizes,
    toggleProvider,
    clearProviders,
    setStatus,
    resetFilters,
  } = marketplace;
  const [selected, setSelected] = useState<ModuleMeta | null>(null);
  const [detailSelection, setDetailSelection] = useState<DetailSelection>(null);
  const [selectedVariantByFamily, setSelectedVariantByFamily] = useState<
    Record<string, string>
  >({});
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusMap>({});

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
      new Map<string, ModuleAvailability>(
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

  const visibleModules = useMemo(
    () =>
      state.modules.filter(
        (module) => availabilityById.get(module.id)?.isVisibleOnSurface ?? true,
      ),
    [availabilityById, state.modules],
  );

  const allFamilies = useMemo(
    () => groupMarketplaceFamilies(visibleModules, availabilityById),
    [availabilityById, visibleModules],
  );

  const filteredFamilies = useMemo(
    () => filterMarketplaceFamilies(allFamilies, state.filters),
    [allFamilies, state.filters],
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          visibleModules
            .map((module) => module.category)
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [visibleModules],
  );

  const sizes = useMemo(() => collectUniqueSizes(visibleModules), [visibleModules]);
  const providers = useMemo(
    () => collectUniqueProviders(visibleModules),
    [visibleModules],
  );

  const variantCount = filteredFamilies.reduce(
    (count, family) => count + family.variants.length,
    0,
  );
  const hasFilters =
    state.filters.status !== "all" ||
    state.filters.categories.length > 0 ||
    state.filters.sizes.length > 0 ||
    state.filters.providers.length > 0 ||
    Boolean(state.filters.query);

  const detailFamily = detailSelection
    ? allFamilies.find((family) => family.id === detailSelection.familyId) ?? null
    : null;

  const handleResetFilters = () => {
    if (!hasFilters) return;
    resetFilters();
  };

  const handleClearSearch = () => {
    if (state.filters.query) {
      setQuery("");
    }
  };

  const handleVariantChange = (familyId: string, moduleId: string) => {
    setSelectedVariantByFamily((current) => ({
      ...current,
      [familyId]: moduleId,
    }));
    setDetailSelection((current) =>
      current?.familyId === familyId
        ? { familyId, variantId: moduleId }
        : current,
    );
  };

  const handleOpenDetails = (
    family: MarketplaceFamily,
    variant: MarketplaceVariant,
  ) => {
    setSelectedVariantByFamily((current) => ({
      ...current,
      [family.id]: variant.meta.id,
    }));
    setDetailSelection({ familyId: family.id, variantId: variant.meta.id });
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
    <div className="space-y-6">
      <MarketplaceToolbar
        filters={state.filters}
        categories={categories}
        providers={providers}
        sizes={sizes}
        familyCount={filteredFamilies.length}
        variantCount={variantCount}
        totalFamilyCount={allFamilies.length}
        hasFilters={hasFilters}
        onQueryChange={setQuery}
        onClearSearch={handleClearSearch}
        onToggleCategory={toggleCategory}
        onClearCategories={clearCategories}
        onToggleProvider={toggleProvider}
        onClearProviders={clearProviders}
        onToggleSize={toggleSize}
        onClearSizes={clearSizes}
        onStatusChange={setStatus}
        onReset={handleResetFilters}
      />

      {state.error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Could not load the catalogue</p>
          <p className="text-destructive/80">{state.error}</p>
        </div>
      ) : null}

      {state.loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <FamilyCardSkeleton key={index} />
          ))}
        </div>
      ) : filteredFamilies.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredFamilies.map((family) => (
            <FamilyCard
              key={family.id}
              family={family}
              selectedVariantId={selectedVariantByFamily[family.id]}
              onVariantChange={handleVariantChange}
              onAdd={handleAddModule}
              onLinkProvider={handleLinkProvider}
              onDetails={handleOpenDetails}
            />
          ))}
        </div>
      ) : (
        <EmptyState hasFilters={hasFilters} onReset={handleResetFilters} />
      )}

      <DetailSheet
        family={detailFamily}
        selectedVariantId={
          detailSelection
            ? selectedVariantByFamily[detailSelection.familyId] ??
              detailSelection.variantId
            : undefined
        }
        onVariantChange={handleVariantChange}
        onOpenChange={(open) => {
          if (!open) setDetailSelection(null);
        }}
        onAdd={handleAddModule}
        onLinkProvider={handleLinkProvider}
      />

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
              setDetailSelection(null);
            } catch (error) {
              toast.error(
                (error as Error)?.message || "Could not add the widget",
              );
            }
          }}
        />
      ) : null}
    </div>
  );
}
