import { useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SliderTheme = {
  track: string;
  fill: string;
  thumb: string;
  thumbRing: string;
  valueBadge: string;
  valueText: string;
  label: string;
  helper: string;
};

type ThemeName = "default" | "primary" | "success" | "warning" | "custom";

type TallHorizontalSliderProps = {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  trackClassName?: string;
  heightClassName?: string;
  showValueInside?: boolean;
  showPercentage?: boolean;
  theme?: ThemeName;
  customTheme?: Partial<SliderTheme>;
  fillStyle?: CSSProperties;
  onChange?: (value: number) => void;
  formatValue?: (value: number, percentage: number) => string;
};

const THEMES: Record<Exclude<ThemeName, "custom">, SliderTheme> = {
  default: {
    track: "bg-muted border border-border",
    fill: "bg-foreground/90",
    thumb: "bg-background border border-border shadow-sm",
    thumbRing: "ring-4 ring-foreground/10",
    valueBadge: "bg-background/90 border border-border shadow-sm backdrop-blur",
    valueText: "text-foreground",
    label: "text-foreground",
    helper: "text-muted-foreground",
  },
  primary: {
    track: "bg-muted border border-border",
    fill: "bg-primary",
    thumb: "bg-background border border-primary/30 shadow-sm",
    thumbRing: "ring-4 ring-primary/15",
    valueBadge:
      "bg-background/95 border border-primary/20 shadow-sm backdrop-blur",
    valueText: "text-foreground",
    label: "text-foreground",
    helper: "text-muted-foreground",
  },
  success: {
    track: "bg-muted border border-border",
    fill: "bg-emerald-500 dark:bg-emerald-600",
    thumb:
      "bg-background border border-emerald-200 dark:border-emerald-800 shadow-sm",
    thumbRing: "ring-4 ring-emerald-500/15",
    valueBadge:
      "bg-background/95 border border-emerald-200 dark:border-emerald-900 shadow-sm backdrop-blur",
    valueText: "text-foreground",
    label: "text-foreground",
    helper: "text-muted-foreground",
  },
  warning: {
    track: "bg-muted border border-border",
    fill: "bg-amber-500 dark:bg-amber-600",
    thumb:
      "bg-background border border-amber-200 dark:border-amber-800 shadow-sm",
    thumbRing: "ring-4 ring-amber-500/15",
    valueBadge:
      "bg-background/95 border border-amber-200 dark:border-amber-900 shadow-sm backdrop-blur",
    valueText: "text-foreground",
    label: "text-foreground",
    helper: "text-muted-foreground",
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function TallHorizontalSlider({
  value,
  defaultValue = 42,
  min = 0,
  max = 100,
  step = 1,
  label,
  helperText,
  disabled = false,
  className,
  trackClassName,
  heightClassName = "h-14",
  showValueInside = true,
  showPercentage = true,
  theme = "primary",
  customTheme,
  fillStyle,
  onChange,
  formatValue,
}: TallHorizontalSliderProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = clamp(isControlled ? value : internalValue, min, max);

  const percentage = useMemo(() => {
    if (max === min) return 0;
    return ((currentValue - min) / (max - min)) * 100;
  }, [currentValue, min, max]);

  const currentTheme: SliderTheme = {
    ...(theme === "custom" ? THEMES.primary : THEMES[theme]),
    ...customTheme,
  };

  const displayedValue = useMemo(() => {
    if (formatValue) return formatValue(currentValue, percentage);
    return showPercentage ? `${Math.round(percentage)}%` : `${currentValue}`;
  }, [formatValue, currentValue, percentage, showPercentage]);

  const handleChange = (next: number) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {(label || helperText || !showValueInside) && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {label && (
              <p className={cn("text-sm font-medium", currentTheme.label)}>
                {label}
              </p>
            )}
            {helperText && (
              <p className={cn("text-xs", currentTheme.helper)}>{helperText}</p>
            )}
          </div>

          {!showValueInside && (
            <div
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium",
                currentTheme.valueBadge,
                currentTheme.valueText,
              )}
            >
              {displayedValue}
            </div>
          )}
        </div>
      )}

      <div className={cn("relative w-full", heightClassName)}>
        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-full",
            currentTheme.track,
            trackClassName,
            disabled && "opacity-50",
          )}
        >
          <motion.div
            className={cn("h-full rounded-full", currentTheme.fill)}
            style={fillStyle}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          >
            {showValueInside && percentage > 12 && (
              <div className="flex h-full items-center justify-end px-3">
                <div
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium",
                    currentTheme.valueBadge,
                    currentTheme.valueText,
                  )}
                >
                  {displayedValue}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          disabled={disabled}
          onChange={(e) => handleChange(Number(e.target.value))}
          className={cn(
            "absolute inset-0 z-20 h-full w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0",
            "[&::-webkit-slider-thumb]:bg-transparent",
            "[&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:bg-transparent",
            "[&::-moz-range-track]:bg-transparent",
            disabled && "cursor-not-allowed",
          )}
        />
      </div>
    </div>
  );
}
