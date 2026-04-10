import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Link2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Unplug,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Meteors } from "@/components/ui/meteors";
import { cn } from "@/lib/utils";
import {
  accountService,
  type AccountPayload,
  type LinkedSpotifyAccount,
} from "@/services/account";
import { useAuthContext } from "@/providers/AuthProvider";

const STATUS_STYLES: Record<
  LinkedSpotifyAccount["status"],
  { label: string; className: string }
> = {
  connected: {
    label: "Connected",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  disconnected: {
    label: "Not linked",
    className:
      "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
  reauth_required: {
    label: "Reconnect required",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AccountPage() {
  const { user } = useAuthContext();
  const [account, setAccount] = useState<AccountPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingSpotify, setConnectingSpotify] = useState(false);
  const [disconnectingSpotify, setDisconnectingSpotify] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const popupTimerRef = useRef<number | null>(null);

  const clearPopupWatcher = useCallback(() => {
    if (popupTimerRef.current !== null) {
      window.clearInterval(popupTimerRef.current);
      popupTimerRef.current = null;
    }
  }, []);

  const loadAccount = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const payload = await accountService.getAccount();
      setAccount(payload);
      setError(null);
    } catch (err) {
      setError((err as Error)?.message ?? "Could not load account data.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "linked_account_callback") return;
      if (event.data?.provider !== "spotify") return;

      clearPopupWatcher();
      popupRef.current = null;
      setConnectingSpotify(false);

      if (event.data?.status === "success") {
        toast.success("Spotify account linked");
      } else {
        toast.error(event.data?.error || "Spotify could not be linked");
      }

      void loadAccount(true);
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearPopupWatcher();
    };
  }, [clearPopupWatcher, loadAccount]);

  const spotify = account?.linkedAccounts.spotify ?? {
    status: "disconnected" as const,
    displayName: null,
    avatarUrl: null,
    connectedAt: null,
    scopes: [],
    lastError: null,
    product: null,
    externalUrl: null,
  };

  const accountName = useMemo(() => {
    const fullName = [user?.name, user?.surname].filter(Boolean).join(" ").trim();
    return fullName || user?.username || "Prometeo user";
  }, [user?.name, user?.surname, user?.username]);

  const initials = useMemo(() => {
    const base = accountName || "PU";
    return base
      .split(" ")
      .slice(0, 2)
      .map((chunk) => chunk.charAt(0).toUpperCase())
      .join("");
  }, [accountName]);

  const spotifyStatus = STATUS_STYLES[spotify.status];

  const handleSpotifyConnect = useCallback(async () => {
    if (connectingSpotify) return;

    const popup = window.open(
      "about:blank",
      "prometeo-spotify-link",
      "popup=yes,width=560,height=760"
    );

    popupRef.current = popup;
    setConnectingSpotify(true);

    try {
      const authorizeUrl = await accountService.beginSpotifyConnect(
        window.location.origin
      );

      if (popup) {
        popup.location.href = authorizeUrl;
      } else {
        window.location.href = authorizeUrl;
        return;
      }

      clearPopupWatcher();
      popupTimerRef.current = window.setInterval(() => {
        if (!popupRef.current || popupRef.current.closed) {
          clearPopupWatcher();
          popupRef.current = null;
          setConnectingSpotify(false);
          void loadAccount(true);
        }
      }, 500);
    } catch (err) {
      setConnectingSpotify(false);
      if (popup && !popup.closed) {
        popup.close();
      }
      toast.error(
        (err as Error)?.message || "Spotify could not start the linking flow."
      );
    }
  }, [clearPopupWatcher, connectingSpotify, loadAccount]);

  const handleSpotifyDisconnect = useCallback(async () => {
    if (disconnectingSpotify) return;

    const confirmed = window.confirm(
      "Disconnect Spotify from this Prometeo account?"
    );
    if (!confirmed) return;

    setDisconnectingSpotify(true);

    try {
      await accountService.disconnectSpotify();
      toast.success("Spotify disconnected");
      await loadAccount(true);
    } catch (err) {
      toast.error((err as Error)?.message || "Spotify could not be disconnected");
    } finally {
      setDisconnectingSpotify(false);
    }
  }, [disconnectingSpotify, loadAccount]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-5 py-4 shadow-sm">
          <Spinner className="size-5" />
          <span className="text-sm text-muted-foreground">
            Loading your account settings...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle>Account unavailable</CardTitle>
            <CardDescription>
              We could not load your linked account settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={() => void loadAccount()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-sky-500/10 via-background/80 to-emerald-500/10 p-8 shadow-lg shadow-sky-500/5 lg:p-10">
        <div className="pointer-events-none absolute inset-0">
          <Meteors number={36} className="opacity-60" />
        </div>

        <div className="relative grid gap-8 lg:grid-cols-[0.95fr,1.05fr]">
          <Card className="border-border/70 bg-background/80 backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-16 rounded-2xl border border-primary/20">
                  <AvatarFallback className="rounded-2xl text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{accountName}</CardTitle>
                  <CardDescription className="mt-1">
                    Your Prometeo identity and the services you link to it.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <InfoTile
                icon={<UserRound className="size-4" />}
                label="Username"
                value={user?.username || "Not available"}
              />
              <InfoTile
                icon={<ShieldCheck className="size-4" />}
                label="Role"
                value={user?.role || "Not assigned"}
              />
              <InfoTile
                icon={<CheckCircle2 className="size-4" />}
                label="Email"
                value={user?.email || "Not available"}
              />
              <InfoTile
                icon={<Link2 className="size-4" />}
                label="Linked services"
                value={spotify.status === "connected" ? "1 active" : "0 active"}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/75 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Linked Accounts</CardTitle>
              <CardDescription>
                Link a provider once and PROMETEO will keep the session for your
                account, refresh tokens automatically, and reuse it everywhere.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpotifyLinkedAccountCard
                account={spotify}
                statusLabel={spotifyStatus.label}
                statusClassName={spotifyStatus.className}
                connecting={connectingSpotify}
                disconnecting={disconnectingSpotify}
                onConnect={handleSpotifyConnect}
                onDisconnect={handleSpotifyDisconnect}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SpotifyLinkedAccountCard({
  account,
  statusLabel,
  statusClassName,
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
}: {
  account: LinkedSpotifyAccount;
  statusLabel: string;
  statusClassName: string;
  connecting: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const actionLabel =
    account.status === "reauth_required" ? "Reconnect Spotify" : "Link Spotify";

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-500/15 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.06),transparent)] p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Spotify</h3>
                <Badge
                  variant="outline"
                  className={cn("rounded-full border", statusClassName)}
                >
                  {statusLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Playback controls, queue access, and automatic token refresh.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow
              label="Spotify profile"
              value={account.displayName || "No Spotify account linked"}
            />
            <DetailRow
              label="Connected at"
              value={formatDate(account.connectedAt)}
            />
            <DetailRow
              label="Plan"
              value={account.product || "Unknown"}
            />
            <DetailRow
              label="Granted scopes"
              value={
                account.scopes.length
                  ? `${account.scopes.length} permissions`
                  : "No permissions stored"
              }
            />
          </div>

          {account.lastError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2 font-medium">
                <RefreshCw className="size-4" />
                Spotify needs attention
              </div>
              <p className="mt-2 leading-6">{account.lastError}</p>
            </div>
          ) : null}

          {account.externalUrl ? (
            <a
              href={account.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              Open Spotify profile
              <ExternalLink className="size-4" />
            </a>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:w-56">
          <Button
            size="lg"
            className="justify-center"
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? <Spinner className="size-4" /> : <Link2 className="size-4" />}
            {connecting ? "Opening Spotify..." : actionLabel}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="justify-center"
            onClick={onDisconnect}
            disabled={disconnecting || account.status === "disconnected"}
          >
            {disconnecting ? (
              <Spinner className="size-4" />
            ) : (
              <Unplug className="size-4" />
            )}
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </Button>

          <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-300" />
              Stored on your account
            </div>
            <p className="mt-2 leading-6">
              Widgets and client dashboards reuse this link automatically. No
              Spotify login is required from the widget itself.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/75 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground/90">{value}</p>
    </div>
  );
}
