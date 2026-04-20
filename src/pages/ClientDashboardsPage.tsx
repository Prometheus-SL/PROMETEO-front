import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import {
  getClientDashboardPages,
  selectClientInitialPage,
} from "@/modules/dashboard-pages";
import { ClientGrid } from "@/modules/ui/ClientGrid";
import type { Page, PageSummary } from "@/modules/types";
import { dashboardService } from "@/services/dashboards";

type PageCache = Record<string, Page>;
type PageStatusMap = Record<string, string>;
type PageLoadingMap = Record<string, true>;

function toPageSummary(page: Page): PageSummary {
  return {
    _id: page._id,
    name: page.name,
    slug: page.slug,
    active: page.active,
    principal: page.principal,
    order: page.order,
  };
}

function mergePageSummary(
  pages: PageSummary[],
  summaryLike: PageSummary | Page,
): PageSummary[] {
  const summary =
    "modules" in summaryLike ? toPageSummary(summaryLike) : summaryLike;
  const exists = pages.some((page) => page._id === summary._id);

  return getClientDashboardPages(
    exists
      ? pages.map((page) => (page._id === summary._id ? summary : page))
      : [...pages, summary],
  );
}

export default function ClientDashboardsPage() {
  const [pageSummaries, setPageSummaries] = useState<PageSummary[]>([]);
  const [pageCache, setPageCache] = useState<PageCache>({});
  const [pageErrors, setPageErrors] = useState<PageStatusMap>({});
  const [pageLoading, setPageLoading] = useState<PageLoadingMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  const pageCacheRef = useRef<PageCache>({});
  const pageLoadingRef = useRef<PageLoadingMap>({});

  const updatePageCache = useCallback(
    (updater: (previous: PageCache) => PageCache) => {
      setPageCache((previous) => {
        const next = updater(previous);
        pageCacheRef.current = next;
        return next;
      });
    },
    [],
  );

  const setPageLoadingState = useCallback(
    (pageId: string, isLoading: boolean) => {
      setPageLoading((previous) => {
        const next = { ...previous };
        if (isLoading) {
          next[pageId] = true;
        } else {
          delete next[pageId];
        }
        pageLoadingRef.current = next;
        return next;
      });
    },
    [],
  );

  const setPageErrorState = useCallback(
    (pageId: string, message: string | null) => {
      setPageErrors((previous) => {
        const next = { ...previous };
        if (message) {
          next[pageId] = message;
        } else {
          delete next[pageId];
        }
        return next;
      });
    },
    [],
  );

  const loadPage = useCallback(
    async (pageId: string) => {
      if (pageCacheRef.current[pageId] || pageLoadingRef.current[pageId]) {
        return;
      }

      setPageLoadingState(pageId, true);
      setPageErrorState(pageId, null);

      try {
        const page = await dashboardService.getPage(pageId);
        updatePageCache((previous) => ({ ...previous, [page._id]: page }));
        setPageSummaries((previous) => mergePageSummary(previous, page));
      } catch (err) {
        const message = (err as Error)?.message ?? "Unknown error occurred";
        setPageErrorState(pageId, message);
      } finally {
        setPageLoadingState(pageId, false);
      }
    },
    [setPageErrorState, setPageLoadingState, updatePageCache],
  );

  const handleModuleConfigChange = useCallback(
    async (
      pageId: string,
      moduleId: string,
      config: Record<string, unknown>,
    ) => {
      try {
        await dashboardService.updateModule(pageId, moduleId, { config });

        updatePageCache((previous) => {
          const page = previous[pageId];
          if (!page) return previous;

          return {
            ...previous,
            [pageId]: {
              ...page,
              modules: page.modules.map((module) =>
                module._id === moduleId ? { ...module, config } : module,
              ),
            },
          };
        });
      } catch (err) {
        console.error("Error updating module config:", err);
      }
    },
    [updatePageCache],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const [summariesResponse, principalPage] = await Promise.all([
          dashboardService.listPageSummaries(),
          dashboardService.getActivePage(),
        ]);

        if (cancelled) return;

        const summaries = principalPage
          ? mergePageSummary(summariesResponse, principalPage)
          : getClientDashboardPages(summariesResponse);

        const initialCache = principalPage
          ? { [principalPage._id]: principalPage }
          : {};

        pageCacheRef.current = initialCache;
        pageLoadingRef.current = {};

        setPageCache(initialCache);
        setPageSummaries(summaries);
        setPageErrors({});
        setPageLoading({});

        const initialPageId = selectClientInitialPage(summaries)?._id ?? null;
        setSelectedPageId((previous) => {
          if (previous && summaries.some((page) => page._id === previous)) {
            return previous;
          }
          return initialPageId;
        });
      } catch (err) {
        if (cancelled) return;
        const message = (err as Error)?.message ?? "Unknown error occurred";
        setError(message);
        setPageSummaries([]);
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

  useEffect(() => {
    if (!selectedPageId) return;
    if (pageCache[selectedPageId]) return;
    void loadPage(selectedPageId);
  }, [loadPage, pageCache, selectedPageId]);

  const selectedIndex = useMemo(() => {
    if (!pageSummaries.length) return 0;
    if (!selectedPageId) return 0;
    const index = pageSummaries.findIndex(
      (page) => page._id === selectedPageId,
    );
    return index >= 0 ? index : 0;
  }, [pageSummaries, selectedPageId]);

  useEffect(() => {
    if (!carouselApi) return;
    if (!pageSummaries.length) return;

    carouselApi.reInit();
    const boundedIndex = Math.min(
      selectedIndex,
      Math.max(pageSummaries.length - 1, 0),
    );
    if (carouselApi.selectedScrollSnap() !== boundedIndex) {
      carouselApi.scrollTo(boundedIndex);
    }
  }, [carouselApi, pageSummaries, selectedIndex]);

  useEffect(() => {
    if (!carouselApi) return;

    const handleSelect = () => {
      if (!pageSummaries.length) return;
      const index = carouselApi.selectedScrollSnap();
      const page = pageSummaries[index];
      if (page && page._id !== selectedPageId) {
        setSelectedPageId(page._id);
      }
    };

    carouselApi.on("select", handleSelect);
    handleSelect();

    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi, pageSummaries, selectedPageId]);

  if (loading) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 text-center">
        <Spinner className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboards...</p>
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

  if (!pageSummaries.length) {
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
        className="h-full flex-1"
        opts={{ align: "start" }}
      >
        <CarouselContent className="h-full">
          {pageSummaries.map((page) => {
            const isActive = page._id === selectedPageId;
            const pageDetail = pageCache[page._id];
            const pageError = pageErrors[page._id];
            const isPageLoading = Boolean(pageLoading[page._id]);

            return (
              <CarouselItem key={page._id} className="h-full">
                <div className="flex h-full flex-col px-6">
                  <div className="flex flex-1 items-center justify-center overflow-auto">
                    {!isActive ? (
                      <div className="rounded-lg border border-dashed px-8 py-10 text-center text-sm text-muted-foreground touch-none select-none">
                        {page.name} is paused until it becomes visible.
                      </div>
                    ) : pageError ? (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-6 py-4 text-sm text-destructive">
                        {pageError}
                      </div>
                    ) : isPageLoading && !pageDetail ? (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Spinner className="size-6 text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Loading dashboard...
                        </p>
                      </div>
                    ) : !pageDetail ? (
                      <div className="rounded-lg border border-dashed px-8 py-10 text-center text-sm text-muted-foreground touch-none select-none">
                        Preparing dashboard...
                      </div>
                    ) : pageDetail.modules.length === 0 ? (
                      <div className="rounded-lg border border-dashed px-8 py-10 text-center text-sm text-muted-foreground touch-none select-none">
                        This dashboard has no modules.
                      </div>
                    ) : (
                      <ClientGrid
                        modules={pageDetail.modules}
                        pageId={pageDetail._id}
                        onModuleConfigChange={handleModuleConfigChange}
                      />
                    )}
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {pageSummaries.length > 1 ? (
          <>
            <CarouselPrevious className="!left-6 !top-1/2 -translate-y-1/2" />
            <CarouselNext className="!right-6 !top-1/2 -translate-y-1/2" />
          </>
        ) : null}
      </Carousel>
      {pageSummaries.length > 1 ? (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {pageSummaries.map((page, index) => (
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
                  : "hover:border-primary",
              )}
              aria-label={`Go to dashboard ${page.name}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
