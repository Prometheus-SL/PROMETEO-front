import { useEffect, useMemo, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { dashboardService } from "@/services/dashboards";
import { ClientGrid } from "@/modules/ui/ClientGrid";
import type { Page } from "@/modules/types";

function sortPages(pages: Page[]): Page[] {
  return [...pages].sort((a, b) => {
    if (a.active === b.active) {
      return a.order - b.order;
    }
    return a.active ? -1 : 1;
  });
}

export default function ClientDashboardsPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await dashboardService.listPages();
        if (cancelled) return;
        const ordered = sortPages(fetched);
        setPages(ordered);
        const active = ordered.find((page) => page.active);
        setSelectedPageId((prev) => {
          if (prev && ordered.some((page) => page._id === prev)) {
            return prev;
          }
          return active?._id ?? ordered[0]?._id ?? null;
        });
      } catch (err) {
        if (cancelled) return;
        const message =
          (err as Error)?.message ?? "Unknown error occurred";
        setError(message);
        setPages([]);
        setSelectedPageId(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedIndex = useMemo(() => {
    if (!pages.length) return 0;
    if (!selectedPageId) return 0;
    const index = pages.findIndex((page) => page._id === selectedPageId);
    return index >= 0 ? index : 0;
  }, [pages, selectedPageId]);

  useEffect(() => {
    if (!carouselApi) return;
    if (!pages.length) return;
    carouselApi.reInit();
    const boundedIndex = Math.min(selectedIndex, Math.max(pages.length - 1, 0));
    if (carouselApi.selectedScrollSnap() !== boundedIndex) {
      carouselApi.scrollTo(boundedIndex);
    }
  }, [carouselApi, pages, selectedIndex]);

  useEffect(() => {
    if (!carouselApi) return;
    const handleSelect = () => {
      if (!pages.length) return;
      const index = carouselApi.selectedScrollSnap();
      const page = pages[index];
      if (page && page._id !== selectedPageId) {
        setSelectedPageId(page._id);
      }
    };
    carouselApi.on("select", handleSelect);
    handleSelect();
    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi, pages, selectedPageId]);

  if (loading) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 text-center">
        <Spinner className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboards…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-1 items-center justify-center px-6">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-6 py-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!pages.length) {
    return (
      <div className="flex h-full flex-1 items-center justify-center px-6">
        <div className="rounded-lg border border-dashed px-8 py-10 text-center text-sm text-muted-foreground">
          Visit the website to configure your dashboards.
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden">
      <Carousel
        setApi={setCarouselApi}
        className="flex h-full flex-1"
        opts={{ align: "start" }}
      >
        <CarouselContent className="h-full">
          {pages.map((page) => (
            <CarouselItem key={page._id} className="h-full">
              <div className="flex h-full flex-col px-6">
                <div className="flex flex-1 items-center justify-center overflow-auto">
                  {page.modules.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-8 py-10 text-center text-sm text-muted-foreground touch-none select-none">
                      This dashboard has no modules.
                    </div>
                  ) : (
                    <ClientGrid modules={page.modules} />
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {pages.length > 1 ? (
          <>
            <CarouselPrevious className="!left-6 !top-1/2 -translate-y-1/2" />
            <CarouselNext className="!right-6 !top-1/2 -translate-y-1/2" />
          </>
        ) : null}
      </Carousel>
      {pages.length > 1 ? (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {pages.map((page, index) => (
            <button
              key={page._id}
              type="button"
              onClick={() => {
                setSelectedPageId(page._id);
                carouselApi?.scrollTo(index);
              }}
              className={cn(
                "h-3.5 w-3.5 rounded-full border border-border transition-colors",
                index === selectedIndex
                  ? "border-primary bg-primary/20"
                  : "hover:border-primary"
              )}
              aria-label={`Ir al dashboard ${page.name}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
