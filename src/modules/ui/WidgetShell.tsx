import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCENT_STYLES = {
  slate: {
    background:
      "from-slate-500/10 via-slate-500/5 to-transparent dark:from-slate-400/10 dark:via-slate-400/5",
    line: "bg-gradient-to-r from-slate-500/0 via-slate-500/50 to-slate-500/0 dark:via-slate-300/40",
    icon: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-200",
    panel: "border-slate-500/15",
  },
  sky: {
    background:
      "from-sky-500/12 via-sky-500/6 to-transparent dark:from-sky-400/12 dark:via-sky-400/6",
    line: "bg-gradient-to-r from-sky-500/0 via-sky-500/55 to-sky-500/0 dark:via-sky-300/45",
    icon: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-200",
    panel: "border-sky-500/15",
  },
  emerald: {
    background:
      "from-emerald-500/12 via-emerald-500/6 to-transparent dark:from-emerald-400/12 dark:via-emerald-400/6",
    line: "bg-gradient-to-r from-emerald-500/0 via-emerald-500/55 to-emerald-500/0 dark:via-emerald-300/45",
    icon: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    panel: "border-emerald-500/15",
  },
  amber: {
    background:
      "from-amber-500/14 via-amber-500/7 to-transparent dark:from-amber-400/14 dark:via-amber-400/7",
    line: "bg-gradient-to-r from-amber-500/0 via-amber-500/55 to-amber-500/0 dark:via-amber-300/45",
    icon: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200",
    panel: "border-amber-500/15",
  },
  rose: {
    background:
      "from-rose-500/12 via-rose-500/6 to-transparent dark:from-rose-400/12 dark:via-rose-400/6",
    line: "bg-gradient-to-r from-rose-500/0 via-rose-500/55 to-rose-500/0 dark:via-rose-300/45",
    icon: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-200",
    panel: "border-rose-500/15",
  },
  violet: {
    background:
      "from-violet-500/12 via-violet-500/6 to-transparent dark:from-violet-400/12 dark:via-violet-400/6",
    line: "bg-gradient-to-r from-violet-500/0 via-violet-500/55 to-violet-500/0 dark:via-violet-300/45",
    icon: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-200",
    panel: "border-violet-500/15",
  },
} as const;

const STATUS_STYLES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  warning: "bg-amber-500/20 text-amber-700 dark:text-amber-200",
  danger: "bg-destructive/15 text-destructive",
} as const;

export type WidgetAccent = keyof typeof ACCENT_STYLES;
export type WidgetStatusTone = keyof typeof STATUS_STYLES;

type WidgetShellProps = {
  accent?: WidgetAccent;
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
};

type WidgetHeaderProps = {
  accent?: WidgetAccent;
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  compact?: boolean;
  className?: string;
};

type WidgetSectionProps = {
  accent?: WidgetAccent;
} & React.ComponentProps<"div">;

type WidgetMetricProps = {
  accent?: WidgetAccent;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
  children?: ReactNode;
};

type WidgetStatusProps = {
  tone?: WidgetStatusTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

type WidgetStateProps = {
  accent?: WidgetAccent;
  tone?: WidgetStatusTone;
  icon?: ReactNode;
  title?: ReactNode;
  message: ReactNode;
  action?: ReactNode;
  className?: string;
};

function WidgetShell({
  accent = "slate",
  className,
  children,
  style,
}: WidgetShellProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <Card
      className={cn(
        "relative h-full overflow-hidden rounded-[1rem] border border-border/70 bg-card/95 p-0 shadow-sm",
        className,
      )}
      style={style}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br",
          styles.background,
        )}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/50 to-transparent dark:from-white/5" />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-2.5 top-0 h-px opacity-90",
          styles.line,
        )}
      />
      <div className="relative flex h-full flex-col">{children}</div>
    </Card>
  );
}

function WidgetHeader({
  accent = "slate",
  icon,
  title,
  description,
  status,
  actions,
  meta,
  compact = false,
  className,
}: WidgetHeaderProps) {
  return (
    <CardHeader
      className={cn(
        compact ? "gap-1 px-2 pt-1.5 pb-0.5" : "gap-1.5 px-2 pt-2 pb-1",
        className,
      )}
    >
      <div className={cn("flex items-start", compact ? "gap-1.5" : "gap-2")}>
        {icon ? (
          <WidgetIcon
            accent={accent}
            className={compact ? "size-5 rounded-md" : undefined}
          >
            {icon}
          </WidgetIcon>
        ) : null}
        <div
          className={cn(
            "min-w-0 flex-1",
            compact ? "space-y-0" : "space-y-0.5",
          )}
        >
          <div
            className={cn(
              "flex items-center",
              compact ? "gap-1" : "flex-wrap gap-1.5",
            )}
          >
            <CardTitle
              className={cn(
                "truncate font-semibold leading-tight",
                compact ? "text-[0.82rem]" : "text-[0.9rem]",
              )}
            >
              {title}
            </CardTitle>
            {status}
          </div>
          {description ? (
            <p
              className={cn(
                "text-muted-foreground line-clamp-1",
                compact ? "text-[9px] leading-3" : "text-[10px] leading-3.5",
              )}
            >
              {description}
            </p>
          ) : null}
          {meta ? (
            <div
              className={cn("flex flex-wrap", compact ? "gap-1" : "gap-1.5")}
            >
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div
            className={cn(
              "flex shrink-0 items-center",
              compact ? "gap-1" : "gap-1.5",
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </CardHeader>
  );
}

function WidgetContent({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return (
    <CardContent
      className={cn("min-h-0 flex-1 px-2 pb-2", className)}
      {...props}
    />
  );
}

function WidgetFooter({
  className,
  ...props
}: React.ComponentProps<typeof CardFooter>) {
  return <CardFooter className={cn("px-2 pt-1 pb-2", className)} {...props} />;
}

function WidgetIcon({
  accent = "slate",
  className,
  children,
}: WidgetSectionProps) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-sm",
        ACCENT_STYLES[accent].icon,
        className,
      )}
    >
      {children}
    </div>
  );
}

function WidgetSection({
  accent = "slate",
  className,
  children,
  ...props
}: WidgetSectionProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background/85 p-2 shadow-sm backdrop-blur-xs",
        ACCENT_STYLES[accent].panel,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function WidgetMetric({
  accent = "slate",
  label,
  value,
  hint,
  className,
  children,
}: WidgetMetricProps) {
  return (
    <WidgetSection accent={accent} className={className}>
      <p className="text-muted-foreground text-[8px] font-medium uppercase tracking-[0.16em]">
        {label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-1.5">
        <div className="min-w-0">
          <p className="truncate text-[0.95rem] font-semibold leading-none">
            {value}
          </p>
        </div>
        {hint ? (
          <span className="text-muted-foreground shrink-0 text-[10px]">
            {hint}
          </span>
        ) : null}
      </div>
      {children ? <div className="mt-2">{children}</div> : null}
    </WidgetSection>
  );
}

function WidgetStatus({
  tone = "neutral",
  icon,
  className,
  children,
}: WidgetStatusProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-5 rounded-full px-1.5 text-[9px] font-semibold shadow-sm",
        STATUS_STYLES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </Badge>
  );
}

function WidgetState({
  accent = "slate",
  icon,
  title,
  message,
  action,
  className,
}: WidgetStateProps) {
  return (
    <WidgetSection
      accent={accent}
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center gap-2.5 px-3 py-3 text-center",
        className,
      )}
    >
      <WidgetIcon accent={accent} className="size-9 rounded-xl">
        {icon ?? <Loader2 className="size-5" />}
      </WidgetIcon>
      {title ? (
        <div className="space-y-0.5">
          <p className="text-xs font-semibold">{title}</p>
          <p className="text-muted-foreground text-xs leading-4">{message}</p>
        </div>
      ) : null}
      {action}
    </WidgetSection>
  );
}

export {
  WidgetShell,
  WidgetHeader,
  WidgetContent,
  WidgetFooter,
  WidgetIcon,
  WidgetSection,
  WidgetMetric,
  WidgetStatus,
  WidgetState,
};
