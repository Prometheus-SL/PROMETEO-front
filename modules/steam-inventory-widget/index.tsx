import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  WidgetContent,
  WidgetHeader,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import { ApiError } from "@/lib/api";
import {
  steamService,
  type SteamCurrency,
  type SteamInventoryItem,
  type SteamInventorySortBy,
  type SteamInventorySummary,
} from "@/services/steam";
import { APP_ID_LABELS } from "./config";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; summary: SteamInventorySummary }
  | { kind: "private" }
  | { kind: "empty"; appName: string }
  | { kind: "error"; message: string; rateLimited: boolean };

const CURRENCY_SYMBOL: Record<SteamCurrency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
};

const VALID_CURRENCIES: readonly SteamCurrency[] = ["EUR", "USD", "GBP"];
const VALID_SORT_BY: readonly SteamInventorySortBy[] = [
  "priceDesc",
  "priceAsc",
  "name",
  "dateDesc",
  "dateAsc",
];
const ACCENT = "violet" as const;
const PAGE_SIZE = 30;
const POLL_INTERVAL_MS = 30 * 60_000;

function formatCurrency(value: number, currency: SteamCurrency): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${CURRENCY_SYMBOL[currency]}${value.toFixed(2)}`;
  }
}

function appNameForCode(appId: string): string {
    return APP_ID_LABELS[appId as keyof typeof APP_ID_LABELS] ?? `Steam app ${appId}`;
}

function mapErrorToState(error: unknown, appId: string): LoadState {
  if (error instanceof ApiError) {
    if (error.code === "STEAM_INVENTORY_PRIVATE") return { kind: "private" };
    if (error.code === "STEAM_INVENTORY_EMPTY") {
      return { kind: "empty", appName: appNameForCode(appId) };
    }
    if (error.code === "STEAM_RATE_LIMITED") {
      return {
        kind: "error",
        rateLimited: true,
        message: "Steam rate-limited the request. Please wait a minute and refresh.",
      };
    }
    return { kind: "error", rateLimited: false, message: error.message };
  }
  return {
    kind: "error",
    rateLimited: false,
    message:
      error instanceof Error ? error.message : "Steam is temporarily unavailable.",
  };
}

function ItemPriceLabel({
    item,
    currency,
    pricesPending,
}: {
    item: SteamInventoryItem;
    currency: SteamCurrency;
    pricesPending: boolean;
}) {
    if (!item.marketable) {
        return <span className="text-muted-foreground">—</span>;
    }
    if (item.price) {
        return (
            <span className="font-semibold">
                {formatCurrency(item.price.lowest, currency)}
            </span>
        );
    }
    if (pricesPending) {
        return (
            <span className="animate-pulse text-muted-foreground">
                Loading price…
            </span>
        );
    }
    return <span className="text-muted-foreground">Price unavailable</span>;
}

function ItemCard({
    item,
    currency,
    pricesPending,
    onClick,
}: {
    item: SteamInventoryItem;
    currency: SteamCurrency;
    pricesPending: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex aspect-square flex-col overflow-hidden rounded-md border border-border bg-card text-left transition hover:scale-[1.02] hover:ring-2 hover:ring-violet-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
            style={{
                boxShadow: item.rarityColor
                    ? `inset 0 0 0 2px ${item.rarityColor}`
                    : undefined,
            }}
        >
            <div
                className="relative flex flex-1 items-center justify-center"
                style={{
                    backgroundColor: item.rarityColor
                        ? `${item.rarityColor}22`
                        : undefined,
                }}
            >
                {item.iconUrl ? (
                    <img
                        src={item.iconUrl}
                        alt=""
                        className="max-h-full max-w-full object-contain p-1"
                        loading="lazy"
                    />
                ) : (
                    <Package className="size-6 text-muted-foreground" />
                )}
                {item.quantity > 1 ? (
                    <span className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[9px] font-semibold text-white">
                        ×{item.quantity}
                    </span>
                ) : null}
                {!item.marketable ? (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[8px] font-medium text-white">
                        Not marketable
                    </span>
                ) : null}
            </div>
            <div className="flex flex-col gap-0.5 px-1 py-0.5 text-[10px]">
                <span className="line-clamp-1 font-medium">{item.marketName}</span>
                <ItemPriceLabel item={item} currency={currency} pricesPending={pricesPending} />
            </div>
        </button>
    );
}

function stripHtml(value: string): string {
    return value
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .trim();
}

function ItemDetailModal({
    item,
    currency,
    open,
    onOpenChange,
}: {
    item: SteamInventoryItem | null;
    currency: SteamCurrency;
    open: boolean;
    onOpenChange: (next: boolean) => void;
}) {
    if (!item) return null;
    const accent = item.rarityColor ?? "rgb(124,58,237)";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl overflow-hidden p-0">
                <div className="h-1 w-full" style={{ backgroundColor: accent }} />
                <DialogHeader className="px-6 pt-4">
                    <DialogTitle className="truncate">{item.marketName}</DialogTitle>
                    {item.type ? (
                        <DialogDescription>{item.type}</DialogDescription>
                    ) : null}
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 px-6 py-2 sm:grid-cols-2">
                    <div
                        className="flex aspect-square items-center justify-center rounded-md"
                        style={{ backgroundColor: `${accent}22` }}
                    >
                        {item.iconUrlLarge ? (
                            <img
                                src={item.iconUrlLarge}
                                alt=""
                                className="max-h-full max-w-full object-contain p-2"
                            />
                        ) : (
                            <Package className="size-8 text-muted-foreground" />
                        )}
                    </div>

                    <div className="flex flex-col gap-3 text-sm">
                        {item.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {item.tags.map((tag, i) => (
                                    <span
                                        key={`${tag.category}-${tag.name}-${i}`}
                                        className="rounded-full border px-2 py-0.5 text-[10px]"
                                        style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        ) : null}

                        {item.descriptions.length > 0 ? (
                            <div className="space-y-1 text-xs text-muted-foreground">
                                {item.descriptions.map((desc, i) => {
                                    const text = stripHtml(desc.value);
                                    if (!text) return null;
                                    return (
                                        <p key={i} style={desc.color ? { color: desc.color } : undefined}>
                                            {text}
                                        </p>
                                    );
                                })}
                            </div>
                        ) : null}

                        <div className="rounded-md border bg-muted/40 p-3 text-xs">
                            {item.marketable && item.price ? (
                                <dl className="grid grid-cols-3 gap-2">
                                    <div>
                                        <dt className="text-muted-foreground">Lowest</dt>
                                        <dd className="font-semibold">
                                            {formatCurrency(item.price.lowest, currency)}
                                        </dd>
                                    </div>
                                    {item.price.median !== null ? (
                                        <div>
                                            <dt className="text-muted-foreground">Median</dt>
                                            <dd className="font-semibold">
                                                {formatCurrency(item.price.median, currency)}
                                            </dd>
                                        </div>
                                    ) : null}
                                    {item.price.volume !== null ? (
                                        <div>
                                            <dt className="text-muted-foreground">Volume</dt>
                                            <dd className="font-semibold">{item.price.volume}</dd>
                                        </div>
                                    ) : null}
                                </dl>
                            ) : (
                                <p className="text-muted-foreground">
                                    {item.marketable
                                        ? "No market data available right now."
                                        : "This item is not marketable."}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-muted/30 px-6 py-3">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                    <Button variant="ghost" asChild>
                        <a href={item.marketUrl} target="_blank" rel="noopener noreferrer">
                            View on Steam Market
                            <ExternalLink className="ml-1 size-3.5" />
                        </a>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function SteamInventoryWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Steam Inventory");
  const appId = String(config["appId"] ?? "730");
  const rawCurrency = config["currency"];
  const currency: SteamCurrency = VALID_CURRENCIES.includes(rawCurrency as SteamCurrency)
    ? (rawCurrency as SteamCurrency)
    : "EUR";
  const rawSortBy = config["sortBy"];
  const sortBy: SteamInventorySortBy = VALID_SORT_BY.includes(rawSortBy as SteamInventorySortBy)
    ? (rawSortBy as SteamInventorySortBy)
    : "priceDesc";
  const hideUnmarketable = Boolean(config["hideUnmarketable"] ?? false);

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SteamInventoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (force: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const summary = await steamService.getInventory({
          appId,
          currency,
          sortBy,
          force,
        });
        if (controller.signal.aborted) return;
        setState({ kind: "ready", summary });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState(mapErrorToState(error, appId));
      } finally {
        if (!controller.signal.aborted) setRefreshing(false);
      }
    },
    [appId, currency, sortBy],
  );

  useEffect(() => {
    setState({ kind: "loading" });
    void load(false);
    const intervalId = window.setInterval(() => {
      void load(false);
    }, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [load]);

  const handleManualRefresh = useCallback(() => {
    setRefreshing(true);
    void load(true);
  }, [load]);

  const visibleItems = useMemo<SteamInventoryItem[]>(() => {
    if (state.kind !== "ready") return [];
    return hideUnmarketable
      ? state.summary.items.filter((item) => item.marketable)
      : state.summary.items;
  }, [state, hideUnmarketable]);

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pagedItems = useMemo<SteamInventoryItem[]>(
    () => visibleItems.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [visibleItems, safePage],
  );

  useEffect(() => {
    if (currentPage >= totalPages) setCurrentPage(0);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(0);
  }, [appId, currency, sortBy, hideUnmarketable]);

  return (
    <WidgetShell accent={ACCENT}>
      <WidgetHeader
        accent={ACCENT}
        icon={<Package className="size-4" />}
        title={title}
        description={
          state.kind === "ready"
            ? `${state.summary.appName} · ${state.summary.totalItems} items`
            : appNameForCode(appId)
        }
        status={
          state.kind === "ready" ? (
            <WidgetStatus tone="neutral">
              {formatCurrency(state.summary.totalValue, state.summary.currency)}
            </WidgetStatus>
          ) : null
        }
        actions={
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={handleManualRefresh}
            disabled={refreshing || state.kind === "loading"}
            aria-label="Refresh inventory"
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        }
      />
      <WidgetContent className="flex h-full flex-col">
        {state.kind === "loading" ? (
          <WidgetState
            accent={ACCENT}
            icon={<Loader2 className="size-5 animate-spin" />}
            title="Loading inventory…"
            message="Fetching items and Steam Market prices."
          />
        ) : state.kind === "private" ? (
          <WidgetState
            accent={ACCENT}
            icon={<Package className="size-5" />}
            title="Your Steam inventory is private"
            message="Open Steam → Edit profile → Privacy and set Inventory to Public, then refresh."
          />
        ) : state.kind === "empty" ? (
          <WidgetState
            accent={ACCENT}
            icon={<Package className="size-5" />}
            title={`No ${state.appName} items`}
            message="Try a different game in the widget settings."
          />
        ) : state.kind === "error" ? (
          <WidgetState
            accent={ACCENT}
            icon={<Package className="size-5" />}
            title={state.rateLimited ? "Rate-limited by Steam" : "Steam unavailable"}
            message={state.message}
          />
        ) : (
          <>
            <ScrollArea className="min-h-0 flex-1">
              <div className="grid grid-cols-6 gap-1.5 p-2">
                {pagedItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    currency={state.summary.currency}
                    pricesPending={state.summary.pricesPending}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            </ScrollArea>
            {totalPages > 1 ? (
              <div className="flex shrink-0 items-center justify-between border-t border-border/40 px-3 py-1.5 text-[11px]">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="text-muted-foreground">
                  Page {safePage + 1} of {totalPages} · {visibleItems.length} items
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </WidgetContent>
      <ItemDetailModal
          item={selectedItem}
          currency={state.kind === "ready" ? state.summary.currency : currency}
          open={selectedItem !== null}
          onOpenChange={(next) => {
              if (!next) setSelectedItem(null);
          }}
      />
    </WidgetShell>
  );
}
