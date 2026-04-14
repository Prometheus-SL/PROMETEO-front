import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function WidgetShell({
  title,
  subtitle,
  badges = [],
  className,
  children,
}: {
  title: string
  subtitle?: string
  badges?: ReactNode[]
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn("flex h-full flex-col border-border/70 bg-background/85", className)}>
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
          </div>
          {badges.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-2">
              {badges.map((badge, index) => (
                <div key={index}>{badge}</div>
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">{children}</CardContent>
    </Card>
  )
}

export function WidgetEmptyState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-6 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{message}</p>
    </div>
  )
}

export function MetricBadge({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string | number
  tone?: "neutral" | "success" | "warning"
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "border-amber-500/30 text-amber-700 dark:text-amber-200"
        : "border-border/60"

  return (
    <Badge variant="outline" className={cn("gap-1", toneClassName)}>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span>{value}</span>
    </Badge>
  )
}

export function formatTimestamp(value?: string | null) {
  if (!value) return "No timestamp"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No timestamp"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
