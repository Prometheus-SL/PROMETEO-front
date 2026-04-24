import { useCallback, useEffect, useState } from "react";
import {
  Clock3,
  Monitor,
  ShieldCheck,
  Smartphone,
  TabletSmartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  getSessionPresentation,
  sortSessionsForDisplay,
} from "@/components/account/sessions.helpers";
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

function getSessionIcon(deviceType: ReturnType<typeof getSessionPresentation>["deviceType"]) {
  switch (deviceType) {
    case "mobile":
      return Smartphone;
    case "tablet":
      return TabletSmartphone;
    case "desktop":
      return Monitor;
    default:
      return ShieldCheck;
  }
}

export function SessionsSection() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await authService.listSessions();
      setSessions(sortSessionsForDisplay(data.sessions));
    } catch {
      setSessions([]);
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
      setSessions((previousSessions) =>
        previousSessions.filter(
          (session) => (session._id || session.sessionId) !== sessionId,
        ),
      );
      toast.success("Session revoked");
    } catch (error) {
      toast.error((error as Error).message || "Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Card className="flex min-w-0 max-w-full flex-col overflow-hidden rounded-xl lg:h-[40rem]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="size-5" />
          Active Sessions
        </CardTitle>
        <CardDescription>
          Devices currently signed in to your account. Revoke any session you
          do not recognize.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        {loading ? (
          <div className="flex flex-1 justify-center py-4">
            <Spinner className="size-5" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active sessions found.
          </p>
        ) : (
          <ScrollArea className="h-[26rem] w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/10 lg:h-auto lg:min-h-0 lg:flex-1 lg:basis-0">
            <div className="flex min-w-0 flex-col gap-3 p-3">
              {sessions.map((session) => {
                const id = session._id || session.sessionId;
                if (!id) return null;

                const presentation = getSessionPresentation(session);
                const SessionIcon = getSessionIcon(presentation.deviceType);

                return (
                  <div
                    key={id}
                    className="flex min-w-0 flex-col gap-4 rounded-lg border bg-background px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-2">
                        <SessionIcon className="size-4 text-muted-foreground" />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span
                            className="truncate text-sm font-medium"
                            title={presentation.primaryLabel}
                          >
                            {presentation.primaryLabel}
                          </span>
                          {session.current ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            >
                              Current
                            </Badge>
                          ) : null}
                        </div>

                        <p
                          className="truncate text-xs text-muted-foreground"
                          title={presentation.secondaryLabel}
                        >
                          {presentation.secondaryLabel}
                        </p>

                        <div className="flex min-w-0 flex-wrap gap-1.5">
                          <Badge variant="secondary" className="max-w-full truncate">
                            {presentation.deviceLabel}
                          </Badge>
                          <Badge variant="secondary" className="max-w-full truncate">
                            {presentation.networkLabel}
                          </Badge>
                          <Badge variant="secondary" className="max-w-full truncate">
                            {presentation.sessionLabel}
                          </Badge>
                        </div>

                        <div className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                          <p className="truncate" title={`Signed in ${formatDate(session.createdAt)}`}>
                            Signed in {formatDate(session.createdAt)}
                          </p>
                          <p
                            className="truncate"
                            title={`Last active ${formatDate(session.lastUsedAt || session.createdAt)}`}
                          >
                            Last active {formatDate(session.lastUsedAt || session.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!session.current ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevoke(id)}
                        disabled={revoking === id}
                        className="shrink-0 self-start"
                      >
                        {revoking === id ? (
                          <Spinner className="size-4" />
                        ) : (
                          <X className="size-4" />
                        )}
                        Revoke
                      </Button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2 self-start rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        Active now
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
