import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Link2,
  RefreshCw,
  ShieldCheck,
  Unplug,
  UserRound,
  Video,
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
import { Meteors } from "@/components/ui/meteors";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/providers/AuthProvider";
import {
  accountService,
  type AccountPayload,
  type LinkedAccountProvider,
  type LinkedAccountStatus,
  type LinkedDiscordAccount,
  type LinkedSpotifyAccount,
} from "@/services/account";

type KnownProviderAccount = LinkedSpotifyAccount | LinkedDiscordAccount;

type ProviderPresentation = {
  description: string;
  icon: ReactNode;
  cardClassName: string;
  buttonClassName?: string;
  getDetails: (
    provider: LinkedAccountProvider,
    account: KnownProviderAccount | null,
  ) => Array<{ label: string; value: string }>;
  getExternalUrl?: (account: KnownProviderAccount | null) => string | null;
};

const STATUS_STYLES: Record<
  LinkedAccountStatus,
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

const PROVIDER_PRESENTATIONS: Record<string, ProviderPresentation> = {
  spotify: {
    description:
      "Playback controls, queue access, and automatic token refresh.",
    icon: (
      <img
        src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green-300x300.png"
        alt="Spotify"
        className="size-10 rounded-lg contain h-auto"
      />
    ),
    cardClassName:
      "border-emerald-500/15 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.06),transparent)]",
    getDetails: (provider, account) => {
      const spotify = isSpotifyAccount(account) ? account : null;
      return [
        {
          label: "Spotify profile",
          value:
            spotify?.displayName ||
            readString(provider.profile, "displayName") ||
            "No Spotify account linked",
        },
        {
          label: "Connected at",
          value: formatDate(provider.connectedAt ?? spotify?.connectedAt),
        },
        {
          label: "Plan",
          value:
            spotify?.product?.toUpperCase() ||
            readString(provider.profile, "product") ||
            "Unknown",
        },
        {
          label: "Granted scopes",
          value: provider.scopes.length
            ? `${provider.scopes.length} permissions`
            : "No permissions stored",
        },
      ];
    },
    getExternalUrl: (account) => {
      const spotify = isSpotifyAccount(account) ? account : null;
      return spotify?.externalUrl ?? null;
    },
  },
  discord: {
    description: "Identity, profile info and automatic token refresh.",
    icon: (
      <img
        src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png"
        alt="Discord"
        className="size-10 rounded-lg contain h-auto"
      />
    ),
    cardClassName:
      "border-indigo-500/15 bg-[radial-gradient(circle_at_top_right,rgba(88,101,242,0.18),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.06),transparent)]",
    buttonClassName: "bg-[#5865F2] text-white hover:bg-[#4752c4]",
    getDetails: (provider, account) => {
      const discord = isDiscordAccount(account) ? account : null;
      return [
        {
          label: "Discord profile",
          value:
            discord?.displayName ||
            readString(provider.profile, "displayName") ||
            "No Discord account linked",
        },
        {
          label: "Username",
          value: discord?.username
            ? `@${discord.username}`
            : readString(provider.profile, "username")
              ? `@${readString(provider.profile, "username")}`
              : "Unknown",
        },
        {
          label: "Connected at",
          value: formatDate(provider.connectedAt ?? discord?.connectedAt),
        },
        {
          label: "Email verified",
          value:
            discord?.verified === null || discord?.verified === undefined
              ? "Unknown"
              : discord.verified
                ? "Verified"
                : "Not verified",
        },
      ];
    },
  },
  google: {
    description:
      "Calendar agenda, task planning and inbox summaries for focus-aware widgets.",
    icon: (
      <div className="grid size-10 place-items-center rounded-xl bg-[#4285F4]/10 text-[#4285F4]">
        <CalendarDays className="size-5" />
      </div>
    ),
    cardClassName:
      "border-sky-500/15 bg-[radial-gradient(circle_at_top_right,rgba(66,133,244,0.16),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.06),transparent)]",
    getDetails: (provider) => [
      {
        label: "Workspace account",
        value:
          readString(provider.profile, "displayName") ||
          readString(provider.profile, "email") ||
          "No Google account linked",
      },
      {
        label: "Connected at",
        value: formatDate(provider.connectedAt),
      },
      {
        label: "Token expires",
        value: formatDate(provider.tokenExpiresAt),
      },
      {
        label: "Granted scopes",
        value: provider.scopes.length
          ? `${provider.scopes.length} permissions`
          : "No permissions stored",
      },
    ],
  },
  github: {
    description:
      "Pull request pulse, notifications and reusable engineering identity.",
    icon: (
      <img
        src="/github.svg"
        alt="GitHub"
        className="size-10 rounded-lg contain h-auto"
      />
    ),
    cardClassName:
      "border-slate-500/15 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.06),transparent)]",
    getDetails: (provider) => [
      {
        label: "GitHub account",
        value:
          readString(provider.profile, "displayName") ||
          readString(provider.profile, "login") ||
          "No GitHub account linked",
      },
      {
        label: "Email",
        value: readString(provider.profile, "email") || "Hidden",
      },
      {
        label: "Connected at",
        value: formatDate(provider.connectedAt),
      },
      {
        label: "Granted scopes",
        value: provider.scopes.length
          ? `${provider.scopes.length} permissions`
          : "No permissions stored",
      },
    ],
  },
  creator: {
    description:
      "Internal creator-source status across live channels and publishing surfaces.",
    icon: (
      <div className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
        <Video className="size-5" />
      </div>
    ),
    cardClassName:
      "border-rose-500/15 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.14),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.06),transparent)]",
    getDetails: (provider) => [
      {
        label: "Creator status",
        value:
          readString(provider.profile, "displayName") ||
          "Creator sources unavailable",
      },
      {
        label: "Live surfaces",
        value:
          readString(provider.profile, "liveCount") ||
          String(provider.profile?.["liveCount"] ?? 0),
      },
      {
        label: "Connected at",
        value: formatDate(provider.connectedAt),
      },
      {
        label: "Source mode",
        value:
          provider.available === false ? "Backend config required" : "Internal",
      },
    ],
  },
};

function isSpotifyAccount(
  account: KnownProviderAccount | null,
): account is LinkedSpotifyAccount {
  return Boolean(account && "product" in account);
}

function isDiscordAccount(
  account: KnownProviderAccount | null,
): account is LinkedDiscordAccount {
  return Boolean(account && "username" in account);
}

function readString(
  value: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const candidate = value?.[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function createLegacyProviders(
  linkedAccounts: AccountPayload["linkedAccounts"],
): LinkedAccountProvider[] {
  return [
    {
      id: "spotify",
      name: "Spotify",
      description:
        "Playback controls, queue access, and automatic token refresh.",
      kind: "oauth",
      status: linkedAccounts.spotify.status,
      connectedAt: linkedAccounts.spotify.connectedAt,
      tokenExpiresAt: linkedAccounts.spotify.tokenExpiresAt ?? null,
      scopes: linkedAccounts.spotify.scopes,
      lastError: linkedAccounts.spotify.lastError,
      connectSupported: true,
      disconnectSupported: true,
      connectPath: "/api/v1/account/linked-accounts/spotify/connect",
      disconnectPath: "/api/v1/account/linked-accounts/spotify",
    },
    {
      id: "discord",
      name: "Discord",
      description: "Identity, profile info and automatic token refresh.",
      kind: "oauth",
      status: linkedAccounts.discord.status,
      connectedAt: linkedAccounts.discord.connectedAt,
      tokenExpiresAt: linkedAccounts.discord.tokenExpiresAt ?? null,
      scopes: linkedAccounts.discord.scopes,
      lastError: linkedAccounts.discord.lastError,
      connectSupported: true,
      disconnectSupported: true,
      connectPath: "/api/v1/account/linked-accounts/discord/connect",
      disconnectPath: "/api/v1/account/linked-accounts/discord",
    },
  ];
}

function getLinkedAccountDetails(
  account: AccountPayload | null,
  providerId: string,
): KnownProviderAccount | null {
  if (!account) return null;
  if (providerId === "spotify") return account.linkedAccounts.spotify;
  if (providerId === "discord") return account.linkedAccounts.discord;
  return null;
}

function getProviderPresentation(
  provider: LinkedAccountProvider,
): ProviderPresentation {
  return (
    PROVIDER_PRESENTATIONS[provider.id] ?? {
      description:
        provider.description ||
        "Reusable provider session for Prometeo modules.",
      icon: (
        <div className="grid size-10 place-items-center rounded-xl border border-border/70 bg-background/80">
          <Link2 className="size-5 text-primary" />
        </div>
      ),
      cardClassName:
        "border-primary/15 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.06),transparent)]",
      getDetails: (currentProvider) => [
        {
          label: "Account",
          value:
            readString(currentProvider.profile, "displayName") ||
            readString(currentProvider.profile, "username") ||
            currentProvider.name,
        },
        {
          label: "Connected at",
          value: formatDate(currentProvider.connectedAt),
        },
        {
          label: "Token expires",
          value: formatDate(currentProvider.tokenExpiresAt),
        },
        {
          label: "Granted scopes",
          value: currentProvider.scopes.length
            ? `${currentProvider.scopes.length} permissions`
            : "No permissions stored",
        },
      ],
    }
  );
}

export default function AccountPage() {
  const { user } = useAuthContext();
  const [account, setAccount] = useState<AccountPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingProviderId, setConnectingProviderId] = useState<
    string | null
  >(null);
  const [disconnectingProviderId, setDisconnectingProviderId] = useState<
    string | null
  >(null);
  const popupRef = useRef<Window | null>(null);
  const popupTimerRef = useRef<number | null>(null);
  const activeProviderRef = useRef<string | null>(null);

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
      const providers =
        payload.providers && payload.providers.length > 0
          ? payload.providers
          : await accountService
              .listProviders()
              .catch(() => createLegacyProviders(payload.linkedAccounts));

      setAccount({
        ...payload,
        providers,
      });
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

      const providerId = String(event.data?.provider || "");
      if (!providerId) return;

      clearPopupWatcher();
      popupRef.current = null;
      activeProviderRef.current = null;
      setConnectingProviderId(null);

      const providerName =
        account?.providers?.find((provider) => provider.id === providerId)
          ?.name || providerId;

      if (event.data?.status === "success") {
        toast.success(`${providerName} account linked`);
      } else {
        toast.error(event.data?.error || `${providerName} could not be linked`);
      }

      void loadAccount(true);
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearPopupWatcher();
    };
  }, [account?.providers, clearPopupWatcher, loadAccount]);

  const providers = useMemo(() => {
    if (!account) return [];
    if (account.providers && account.providers.length > 0) {
      return account.providers;
    }

    return createLegacyProviders(account.linkedAccounts);
  }, [account]);

  const accountName = useMemo(() => {
    const fullName = [user?.name, user?.surname]
      .filter(Boolean)
      .join(" ")
      .trim();
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

  const connectedProviders = providers.filter(
    (provider) => provider.status === "connected",
  ).length;

  const handleProviderConnect = useCallback(
    async (provider: LinkedAccountProvider) => {
      if (connectingProviderId === provider.id) return;
      if (provider.connectSupported === false) {
        toast.error(`${provider.name} is not available right now`);
        return;
      }

      const popup = window.open(
        "about:blank",
        `prometeo-${provider.id}-link`,
        "popup=yes,width=560,height=760",
      );

      popupRef.current = popup;
      activeProviderRef.current = provider.id;
      setConnectingProviderId(provider.id);

      try {
        const authorizeUrl = await accountService.beginProviderConnect(
          provider.id,
          window.location.origin,
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
            activeProviderRef.current = null;
            setConnectingProviderId(null);
            void loadAccount(true);
          }
        }, 500);
      } catch (err) {
        setConnectingProviderId(null);
        activeProviderRef.current = null;
        if (popup && !popup.closed) {
          popup.close();
        }
        toast.error(
          (err as Error)?.message ||
            `${provider.name} could not start the linking flow.`,
        );
      }
    },
    [clearPopupWatcher, connectingProviderId, loadAccount],
  );

  const handleProviderDisconnect = useCallback(
    async (provider: LinkedAccountProvider) => {
      if (disconnectingProviderId === provider.id) return;

      const confirmed = window.confirm(
        `Disconnect ${provider.name} from this Prometeo account?`,
      );
      if (!confirmed) return;

      setDisconnectingProviderId(provider.id);

      try {
        await accountService.disconnectProvider(provider.id);
        toast.success(`${provider.name} disconnected`);
        await loadAccount(true);
      } catch (err) {
        toast.error(
          (err as Error)?.message ||
            `${provider.name} could not be disconnected`,
        );
      } finally {
        setDisconnectingProviderId(null);
      }
    },
    [disconnectingProviderId, loadAccount],
  );

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
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-primary/10 via-background/80 to-background p-6 shadow-lg shadow-primary/5">
        <div className="pointer-events-none absolute inset-0">
          <Meteors number={26} className="opacity-70" />
        </div>

        <div className="relative grid gap-8 xl:grid-cols-[1.1fr,0.9fr] xl:items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 border border-border/60 shadow-sm">
                <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Linked Providers
                  </h1>
                  <Badge variant="outline" className="rounded-full">
                    {connectedProviders}/{providers.length} connected
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect a provider once and PROMETEO will reuse that session
                  across dashboard widgets, client views, and future module
                  bundles.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <DetailRow label="Account owner" value={accountName} />
              <DetailRow
                label="Email"
                value={user?.email || "No email available"}
              />
              <DetailRow
                label="Role"
                value={user?.role ? user.role.toUpperCase() : "UNKNOWN"}
              />
            </div>
          </div>

          <Card className="border border-border/70 bg-background/80 shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="size-5 text-primary" />
                Shared Provider Registry
              </CardTitle>
              <CardDescription>
                Providers publish connection state, scopes, and recovery needs
                through one shared contract so new widgets can plug in without
                hardcoded account logic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                <div className="font-medium text-foreground">
                  Platform-ready foundation
                </div>
                <p className="mt-2 leading-6">
                  Spotify and Discord already run on the shared provider flow,
                  and the same UI can now absorb Google, GitHub, creator
                  sources, or internal agents with much less wiring.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                <div className="font-medium text-foreground">
                  Graceful reuse
                </div>
                <p className="mt-2 leading-6">
                  Widgets read the same provider state everywhere, so reconnect
                  prompts, missing scopes, and degraded experiences stay
                  consistent.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Provider Sessions</h2>
          <p className="text-sm text-muted-foreground">
            Link, reconnect, or disconnect provider accounts from one place.
          </p>
        </div>

        <div className="grid gap-6">
          {providers.map((provider) => (
            <LinkedProviderCard
              key={provider.id}
              provider={provider}
              account={getLinkedAccountDetails(account, provider.id)}
              connecting={connectingProviderId === provider.id}
              disconnecting={disconnectingProviderId === provider.id}
              onConnect={() => void handleProviderConnect(provider)}
              onDisconnect={() => void handleProviderDisconnect(provider)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function LinkedProviderCard({
  provider,
  account,
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
}: {
  provider: LinkedAccountProvider;
  account: KnownProviderAccount | null;
  connecting: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const statusStyle = STATUS_STYLES[provider.status];
  const presentation = getProviderPresentation(provider);
  const details = presentation.getDetails(provider, account);
  const externalUrl = presentation.getExternalUrl?.(account) ?? null;
  const actionLabel =
    provider.status === "reauth_required"
      ? `Reconnect ${provider.name}`
      : `Link ${provider.name}`;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border p-6 shadow-sm",
        presentation.cardClassName,
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-background/70">
              {presentation.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{provider.name}</h3>
                <Badge
                  variant="outline"
                  className={cn("rounded-full border", statusStyle.className)}
                >
                  {statusStyle.label}
                </Badge>
                {provider.available === false ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-amber-500/30"
                  >
                    Provider unavailable
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {presentation.description}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {details.map((detail) => (
              <DetailRow key={`${provider.id}-${detail.label}`} {...detail} />
            ))}
          </div>

          {provider.lastError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2 font-medium">
                <RefreshCw className="size-4" />
                {provider.name} needs attention
              </div>
              <p className="mt-2 leading-6">{provider.lastError}</p>
            </div>
          ) : null}

          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
            >
              Open {provider.name} profile
              <ExternalLink className="size-4" />
            </a>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:w-56">
          <Button
            size="lg"
            className={cn("justify-center", presentation.buttonClassName)}
            onClick={onConnect}
            disabled={
              connecting ||
              provider.connectSupported === false ||
              provider.status === "connected"
            }
          >
            {connecting ? (
              <Spinner className="size-4" />
            ) : (
              <Link2 className="size-4" />
            )}
            {connecting ? `Opening ${provider.name}...` : actionLabel}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="justify-center"
            onClick={onDisconnect}
            disabled={
              disconnecting ||
              provider.disconnectSupported === false ||
              provider.status === "disconnected"
            }
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
              Widgets and client dashboards can reuse this provider session
              automatically.
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
      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground/90">
        {label === "Account owner" ? <UserRound className="size-4" /> : null}
        <span>{value}</span>
      </p>
    </div>
  );
}
