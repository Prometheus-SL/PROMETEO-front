import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, History } from "lucide-react";

import { getLoginHistoryPresentation } from "@/components/account/login-history.helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { authService, type LoginHistoryEntry } from "@/services/auth";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildEntryMeta(entry: LoginHistoryEntry) {
  return [
    formatDate(entry.createdAt),
    entry.identifier ? `Identifier ${entry.identifier}` : null,
    entry.ip ? `IP ${entry.ip}` : null,
  ].filter(Boolean);
}

export function LoginHistorySection() {
  const [entries, setEntries] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await authService.getLoginHistory({ page, limit: 25 });
      setEntries(data.history || []);
      setPages(data.pagination?.pages || 1);
      setRetentionDays(data.retentionDays ?? null);
    } catch {
      setEntries([]);
      setPages(1);
      setRetentionDays(null);
      setError("Could not load login history right now.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="min-w-0 max-w-full overflow-hidden rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5" />
          Login History
        </CardTitle>
        <CardDescription>
          Sign-in activity across password, QR, agent, and provider flows.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-medium">Recent account access activity</p>
            <p className="max-w-[62ch] text-sm text-muted-foreground">
              {retentionDays
                ? `Showing the last ${retentionDays} days, including provider logins and failed verification attempts.`
                : "Showing recent provider logins, password attempts, and verification failures."}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {entries.length} event{entries.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-5" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sign-in history was recorded in the current retention window.
          </p>
        ) : (
          <>
            <ScrollArea className="h-[26rem] w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/10">
              <div className="flex w-full max-w-full min-w-0 flex-col gap-3 overflow-x-hidden p-3 pr-3">
                {entries.map((entry) => {
                  const presentation = getLoginHistoryPresentation(entry);
                  const meta = buildEntryMeta(entry);
                  const metaText = meta.join(" / ");

                  return (
                    <div
                      key={entry._id}
                      className={cn(
                        "w-full max-w-full min-w-0 overflow-hidden rounded-lg border px-4 py-3 shadow-sm",
                        entry.success
                          ? "border-border/70 bg-background"
                          : "border-destructive/30 bg-destructive/5",
                      )}
                    >
                      <div className="grid min-w-0 max-w-full grid-cols-[auto,minmax(0,1fr)] items-start gap-3 overflow-hidden">
                        <div
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            entry.success ? "bg-emerald-500" : "bg-destructive",
                          )}
                        />
                        <div className="flex min-w-0 max-w-full flex-1 flex-col gap-2 overflow-hidden">
                          <span
                            className="block w-full truncate text-sm font-medium"
                            title={presentation.title}
                          >
                            {presentation.title}
                          </span>

                          <div className="flex min-w-0 flex-wrap gap-1.5 overflow-hidden">
                            <Badge variant="outline">
                              {presentation.channelLabel}
                            </Badge>
                            {presentation.providerLabel ? (
                              <Badge variant="outline">
                                {presentation.providerLabel}
                              </Badge>
                            ) : null}
                            <Badge
                              variant="outline"
                              title={entry.success ? "Success" : "Failed"}
                              aria-label={entry.success ? "Success" : "Failed"}
                              className={cn(
                                "shrink-0",
                                entry.success
                                  ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                  : "border-destructive/40 text-destructive",
                              )}
                            >
                              {entry.success ? "Success" : "Failed"}
                            </Badge>
                          </div>

                          {metaText ? (
                            <div className="w-full min-w-0 max-w-full overflow-hidden">
                              <p
                                className="block max-w-full truncate text-xs text-muted-foreground"
                                title={metaText}
                              >
                                {metaText}
                              </p>
                            </div>
                          ) : null}

                          {presentation.failureLabel ? (
                            <div className="w-full min-w-0 max-w-full overflow-hidden">
                              <p
                                className="block max-w-full truncate text-xs text-destructive"
                                title={presentation.failureLabel}
                              >
                                {presentation.failureLabel}
                              </p>
                            </div>
                          ) : null}

                          {entry.userAgent ? (
                            <div className="w-full min-w-0 max-w-full overflow-hidden">
                              <p
                                className="block max-w-full truncate text-xs text-muted-foreground/90"
                                title={entry.userAgent}
                              >
                                {entry.userAgent}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {pages > 1 ? (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((currentPage) => currentPage - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {pages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= pages}
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
