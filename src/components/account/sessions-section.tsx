import { useCallback, useEffect, useState } from "react";
import { Monitor, Smartphone, X } from "lucide-react";
import { toast } from "sonner";

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
import { authService, type Session } from "@/services/auth";

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SessionsSection() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await authService.listSessions();
      setSessions(data.sessions);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRevoke(sessionId: string) {
    setRevoking(sessionId);
    try {
      await authService.revokeSession(sessionId);
      setSessions((prev) =>
        prev.filter((s) => (s._id || s.sessionId) !== sessionId),
      );
      toast.success("Session revoked");
    } catch (err) {
      toast.error((err as Error).message || "Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="size-5" />
          Active Sessions
        </CardTitle>
        <CardDescription>
          Devices currently signed in to your account. Revoke any session you
          don't recognize.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Spinner className="size-5" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active sessions found.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const id = session._id || session.sessionId;
              if (!id) return null;
              return (
                <div
                  key={id}
                  className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <Smartphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium font-mono">
                          {id.slice(0, 8)}...
                        </span>
                        {session.current && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 text-emerald-600 text-xs"
                          >
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(session.createdAt)}
                        {session.lastUsedAt
                          ? ` - Last used ${formatDate(session.lastUsedAt)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(id)}
                      disabled={revoking === id}
                    >
                      {revoking === id ? (
                        <Spinner className="size-4" />
                      ) : (
                        <X className="size-4" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
