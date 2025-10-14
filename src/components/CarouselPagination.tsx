"use client";

import * as React from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type RenderItemOptions = {
  index: number;
  isActive: boolean;
  onSelect: () => void;
};

export type CarouselPaginationProps<T> = {
  items: T[];
  renderItem: (item: T, options: RenderItemOptions) => React.ReactNode;
  selectedIndex?: number;
  onSelect?: (item: T, index: number) => void;
  getItemKey?: (item: T, index: number) => React.Key;
  className?: string;
  itemClassName?: string;
  paginationClassName?: string;
  emptyPlaceholder?: React.ReactNode;
  opts?: React.ComponentProps<typeof Carousel>["opts"];
};

export default function CarouselPagination<T>({
  items,
  renderItem,
  selectedIndex = 0,
  onSelect,
  getItemKey,
  className,
  itemClassName,
  paginationClassName,
  emptyPlaceholder,
  opts,
}: CarouselPaginationProps<T>) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const count = items.length;

  React.useEffect(() => {
    if (!api) return;
    api.reInit();
    if (!count) {
      return;
    }
    const selected = api.selectedScrollSnap();
    if (selected >= count) {
      api.scrollTo(count - 1);
    }
  }, [api, count]);

  React.useEffect(() => {
    if (!count) {
      setCurrentIndex(0);
      return;
    }
    if (selectedIndex < 0 || selectedIndex >= count) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex(selectedIndex);
    if (!api) return;
    if (api.selectedScrollSnap() !== selectedIndex) {
      api.scrollTo(selectedIndex);
    }
  }, [api, selectedIndex, count]);

  React.useEffect(() => {
    if (!api) return;
    const handleSelect = () => {
      const next = api.selectedScrollSnap();
      setCurrentIndex(next);
    };
    api.on("select", handleSelect);
    return () => {
      api.off("select", handleSelect);
    };
  }, [api]);

  const handleItemSelect = React.useCallback(
    (index: number) => {
      if (index < 0 || index >= count) return;
      const item = items[index];
      setCurrentIndex(index);
      onSelect?.(item, index);
      api?.scrollTo(index);
    },
    [api, count, items, onSelect]
  );

  if (!count && emptyPlaceholder) {
    return <div className={className}>{emptyPlaceholder}</div>;
  }

  return (
    <div className={cn("w-full", className)}>
      <Carousel setApi={setApi} className="w-full" opts={opts}>
        <CarouselContent>
          {items.map((item, index) => (
            <CarouselItem
              key={getItemKey?.(item, index) ?? index}
              className={cn(
                "basis-full sm:basis-1/2 lg:basis-1/3",
                itemClassName
              )}
            >
              {renderItem(item, {
                index,
                isActive: index === currentIndex,
                onSelect: () => handleItemSelect(index),
              })}
            </CarouselItem>
          ))}
        </CarouselContent>
        {count > 1 ? (
          <>
            <CarouselPrevious className="-left-6 hidden sm:flex" />
            <CarouselNext className="-right-6 hidden sm:flex" />
          </>
        ) : null}
      </Carousel>
      {count > 1 ? (
        <div
          className={cn(
            "mt-4 flex items-center justify-center gap-2",
            paginationClassName
          )}
        >
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => handleItemSelect(index)}
              className={cn(
                "h-3.5 w-3.5 rounded-full border border-border transition-colors",
                index === currentIndex
                  ? "border-primary bg-primary/10"
                  : "hover:border-primary"
              )}
              aria-label={`Ir a la página ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
