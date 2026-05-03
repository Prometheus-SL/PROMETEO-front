import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  ExternalLink,
  Loader2,
  ShoppingBag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  WidgetContent,
  WidgetHeader,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import {
  steamService,
  type SteamDeal,
  type SteamDealsSummary,
} from "@/services/steam";

const ACCENT = "emerald" as const;

const EMPTY_DEALS: SteamDealsSummary = {
  country: "ES",
  language: "spanish",
  deals: [],
};

function localeForCountry(country: string) {
  switch (country.toUpperCase()) {
    case "ES":
      return "es-ES";
    case "FR":
      return "fr-FR";
    case "DE":
      return "de-DE";
    case "GB":
      return "en-GB";
    case "US":
      return "en-US";
    default:
      return "es-ES";
  }
}

function formatPrice(
  value: number | null,
  currency: string | null,
  country: string,
) {
  if (value === null || value === undefined) return "--";
  if (value <= 0) return "Free";
  if (!currency) return `${(value / 100).toFixed(2)}`;

  return new Intl.NumberFormat(localeForCountry(country), {
    style: "currency",
    currency,
  }).format(value / 100);
}

function platformLabels(deal: SteamDeal) {
  return [
    deal.platforms.windows ? "Win" : null,
    deal.platforms.mac ? "Mac" : null,
    deal.platforms.linux ? "Linux" : null,
  ].filter(Boolean);
}

export function SteamDealsView({
  title,
  summary,
  loading,
  error,
  maxDeals = 5,
}: {
  title: string;
  summary: SteamDealsSummary;
  loading: boolean;
  error: string | null;
  maxDeals?: number;
}) {
  const deals = useMemo(
    () => summary.deals.slice(0, maxDeals),
    [maxDeals, summary.deals],
  );
  const bestDiscount = deals.reduce(
    (best, deal) => Math.max(best, deal.discountPercent),
    0,
  );

  return (
    <WidgetShell accent={ACCENT}>
      <WidgetHeader
        accent={ACCENT}
        icon={<ShoppingBag className="size-4" />}
        title={title}
        description={`${summary.country} Store specials`}
        status={
          bestDiscount > 0 ? (
            <WidgetStatus tone="success">Up to -{bestDiscount}%</WidgetStatus>
          ) : (
            <WidgetStatus tone="neutral">{deals.length} deals</WidgetStatus>
          )
        }
      />
      <WidgetContent className="flex flex-col">
        {loading && deals.length === 0 ? (
          <WidgetState
            accent={ACCENT}
            icon={<Loader2 className="size-5 animate-spin" />}
            title="Loading Steam deals"
            message="Checking current Store specials."
          />
        ) : error && deals.length === 0 ? (
          <WidgetState
            accent="rose"
            icon={<ShoppingBag className="size-5" />}
            title="Steam deals unavailable"
            message={error}
          />
        ) : deals.length === 0 ? (
          <WidgetState
            accent={ACCENT}
            icon={<BadgePercent className="size-5" />}
            title="No deals found"
            message="Steam did not return current specials."
          />
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-1.5">
              {deals.map((deal) => (
                <SteamDealRow
                  key={deal.appId}
                  deal={deal}
                  country={summary.country}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </WidgetContent>
    </WidgetShell>
  );
}

function SteamDealRow({
  deal,
  country,
}: {
  deal: SteamDeal;
  country: string;
}) {
  const labels = platformLabels(deal);
  const finalPrice = formatPrice(deal.finalPrice, deal.currency, country);
  const originalPrice = formatPrice(
    deal.originalPrice,
    deal.currency,
    country,
  );

  return (
    <WidgetSection accent={ACCENT} className="p-0">
      <a
        href={deal.url}
        target="_blank"
        rel="noreferrer"
        className="grid min-h-[68px] grid-cols-[72px_minmax(0,1fr)] gap-2 p-1.5 transition-colors hover:bg-emerald-500/5"
      >
        <div className="overflow-hidden rounded-md border border-emerald-500/15 bg-muted">
          {deal.image || deal.largeImage ? (
            <img
              src={deal.image ?? deal.largeImage ?? ""}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <ShoppingBag className="size-5" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-1">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-[0.82rem] font-semibold leading-tight">
                {deal.name}
              </p>
              <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
            </div>
            {labels.length > 0 ? (
              <div className="mt-1 flex gap-1">
                {labels.map((label) => (
                  <span
                    key={label}
                    className="rounded border border-border/60 px-1 py-0.5 text-[8px] leading-none text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-end justify-between gap-2">
            <Badge
              variant="secondary"
              className="h-5 rounded-md bg-emerald-500/15 px-1.5 text-[10px] text-emerald-700 dark:text-emerald-200"
            >
              -{deal.discountPercent}%
            </Badge>
            <div className="min-w-0 text-right">
              <p className="text-[0.82rem] font-semibold leading-none">
                {finalPrice}
              </p>
              {deal.originalPrice !== null &&
              deal.originalPrice !== deal.finalPrice ? (
                <p
                  className={cn(
                    "mt-0.5 text-[10px] leading-none text-muted-foreground line-through",
                  )}
                >
                  {originalPrice}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </a>
    </WidgetSection>
  );
}

export default function SteamDealsWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Steam Deals");
  const country = String(config["country"] ?? "ES").toUpperCase();
  const language = String(config["language"] ?? "spanish");
  const pollMs = Math.max(300000, Number(config["pollMs"] ?? 1800000));
  const maxDeals = Math.max(1, Math.min(12, Number(config["maxDeals"] ?? 5)));
  const [summary, setSummary] = useState<SteamDealsSummary>({
    ...EMPTY_DEALS,
    country,
    language,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const nextSummary = await steamService.getDeals({
          country,
          language,
          limit: maxDeals,
        });
        if (cancelled) return;
        setSummary(nextSummary);
        setError(null);
      } catch (nextError) {
        if (cancelled) return;
        setError((nextError as Error)?.message ?? "Steam deals unavailable.");
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
  }, [country, language, maxDeals, pollMs]);

  return (
    <SteamDealsView
      title={title}
      summary={summary}
      loading={loading}
      error={error}
      maxDeals={maxDeals}
    />
  );
}
