import { useCallback, useEffect, useState } from "react";
import { History, ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { authService, type LoginHistoryEntry } from "@/services/auth";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function LoginHistorySection() {
  const [entries, setEntries] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authService.getLoginHistory({ page, limit: 10 });
      setEntries(data.history || []);
      setPages(data.pagination?.pages || 1);
    } catch {
      // silent
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5" />
          Login History
        </CardTitle>
        <CardDescription>
          Recent sign-in attempts for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Spinner className="size-5" />
          </div>
        ) : !entries || entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No login history found.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry._id}
                  className="rounded-lg border px-4 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {entry.method}
                      </span>
                      {entry.success ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 text-emerald-600 text-xs"
                        >
                          Success
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-red-500/30 text-red-600 text-xs"
                        >
                          Failed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                      {entry.ip ? ` - ${entry.ip}` : ""}
                    </p>
                    {entry.failureReason && (
                      <p className="text-xs text-red-500">
                        {entry.failureReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
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
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
