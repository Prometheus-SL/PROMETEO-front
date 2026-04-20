import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Link2,
  RefreshCw,
  Save,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { isSafeExternalUrl } from "@/lib/api";
import { useAuthContext } from "@/providers/AuthProvider";
import {
  accountService,
  type AccountPayload,
  type LinkedAccountProvider,
  type LinkedAccountStatus,
  type LinkedDiscordAccount,
  type LinkedSpotifyAccount,
  type UpdateProfilePayload,
} from "@/services/account";
import { TwoFactorSection } from "@/components/account/two-factor-section";
import { SessionsSection } from "@/components/account/sessions-section";
import { LoginHistorySection } from "@/components/account/login-history-section";

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
      <img
        src="https://www.gstatic.com/marketing-cms/assets/images/d5/dc/cfe9ce8b4425b410b49b7f2dd3f3/g.webp=s48-fcrop64=1,00000000ffffffff-rw"
        alt="Google"
        className="size-9 rounded-lg contain h-auto"
      />
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
  const { user, updateUser } = useAuthContext();
  const [account, setAccount] = useState<AccountPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingProviderId, setConnectingProviderId] = useState<
    string | null
  >(null);
  const [disconnectingProviderId, setDisconnectingProviderId] = useState<
    string | null
  >(null);
  const [profileForm, setProfileForm] = useState<UpdateProfilePayload>({
    username: "",
    name: "",
    surname: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
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
    const currentUser = account?.user ?? user;
    const fullName = [currentUser?.name, currentUser?.surname]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || currentUser?.username || "Prometeo user";
  }, [account?.user, user]);

  const accountUser = account?.user ?? user;

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

  useEffect(() => {
    if (!accountUser) return;
    setProfileForm({
      username: accountUser.username || "",
      name: accountUser.name || "",
      surname: accountUser.surname || "",
    });
  }, [accountUser]);

  const handleProfileSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSavingProfile(true);
      try {
        const updatedUser = await accountService.updateProfile(profileForm);
        setAccount((current) =>
          current ? { ...current, user: updatedUser } : current,
        );
        updateUser?.(updatedUser);
        toast.success("Profile updated");
      } catch (err) {
        toast.error((err as Error).message || "Could not update profile");
      } finally {
        setSavingProfile(false);
      }
    },
    [profileForm, updateUser],
  );

  const handlePasswordSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error("New passwords do not match");
        return;
      }
      setSavingPassword(true);
      try {
        await accountService.changePassword({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        toast.success("Password updated");
      } catch (err) {
        toast.error((err as Error).message || "Could not update password");
      } finally {
        setSavingPassword(false);
      }
    },
    [passwordForm],
  );

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
    <div className="mx-auto grid gap-6 pb-10 xl:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <section className="relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-rose-500" />
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border border-border/60 shadow-sm">
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                Account
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {accountName}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <ProfileMetric
              label="Email"
              value={accountUser?.email || "No email"}
              icon={<ShieldCheck className="size-4" />}
            />
            <ProfileMetric
              label="Role"
              value={
                accountUser?.role ? accountUser.role.toUpperCase() : "UNKNOWN"
              }
              icon={<UserRound className="size-4" />}
            />
            <ProfileMetric
              label="Connected"
              value={`${connectedProviders}/${providers.length} providers`}
              icon={<CheckCircle2 className="size-4" />}
            />
          </div>
        </section>

        <nav className="rounded-xl border border-border/70 bg-card p-2 shadow-sm">
          <a
            href="#profile"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <UserRound className="size-4" />
            Profile
          </a>
          <a
            href="#security"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <ShieldCheck className="size-4" />
            Security
          </a>
          <a
            href="#connected-apps"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Link2 className="size-4" />
            Connected Apps
          </a>
        </nav>
      </aside>

      <main className="space-y-8">
        <section id="profile" className="space-y-4 scroll-mt-6">
          <SectionHeader
            title="Profile"
            description="Edit account details and password."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <ProfileEditor
              form={profileForm}
              saving={savingProfile}
              onChange={setProfileForm}
              onSubmit={handleProfileSubmit}
            />
            <PasswordEditor
              form={passwordForm}
              saving={savingPassword}
              onChange={setPasswordForm}
              onSubmit={handlePasswordSubmit}
            />
          </div>
        </section>

        <section id="security" className="space-y-4 scroll-mt-6">
          <SectionHeader
            title="Security"
            description="2FA, sessions, and recent access."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <TwoFactorSection />
            </div>
            <LoginHistorySection />
            <SessionsSection />
          </div>
        </section>

        <section id="connected-apps" className="space-y-4 scroll-mt-6">
          <SectionHeader
            title="Connected Apps"
            description="Link, reconnect, or remove provider access."
          />

          <div className="grid gap-4 lg:grid-cols-2">
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
      </main>
    </div>
  );
}

function ProfileEditor({
  form,
  saving,
  onChange,
  onSubmit,
}: {
  form: UpdateProfilePayload;
  saving: boolean;
  onChange: (form: UpdateProfilePayload) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-cyan-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-5" />
          User Details
        </CardTitle>
        <CardDescription>Name and username.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="account-username">Username</Label>
            <Input
              id="account-username"
              value={form.username}
              onChange={(event) =>
                onChange({ ...form, username: event.target.value })
              }
              minLength={3}
              maxLength={30}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-name">Name</Label>
              <Input
                id="account-name"
                value={form.name || ""}
                onChange={(event) =>
                  onChange({ ...form, name: event.target.value })
                }
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-surname">Surname</Label>
              <Input
                id="account-surname"
                value={form.surname || ""}
                onChange={(event) =>
                  onChange({ ...form, surname: event.target.value })
                }
                maxLength={50}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Spinner className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordEditor({
  form,
  saving,
  onChange,
  onSubmit,
}: {
  form: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  saving: boolean;
  onChange: (form: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-5" />
          Password
        </CardTitle>
        <CardDescription>Use at least 12 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={form.currentPassword}
              onChange={(event) =>
                onChange({ ...form, currentPassword: event.target.value })
              }
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={form.newPassword}
                onChange={(event) =>
                  onChange({ ...form, newPassword: event.target.value })
                }
                minLength={12}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm</Label>
              <Input
                id="confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(event) =>
                  onChange({ ...form, confirmPassword: event.target.value })
                }
                minLength={12}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Spinner className="size-4" />
            ) : (
              <KeyRound className="size-4" />
            )}
            {saving ? "Updating..." : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
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
        "overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        presentation.cardClassName
      )}
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-lg border border-border/70 bg-background/80">
              {presentation.icon}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{provider.name}</h3>
                <Badge
                  variant="outline"
                  className={cn("border", statusStyle.className)}
                >
                  {statusStyle.label}
                </Badge>
                {provider.available === false ? (
                  <Badge variant="outline" className="border-amber-500/30">
                    Unavailable
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {presentation.description}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {externalUrl && isSafeExternalUrl(externalUrl) ? (
              <Button asChild variant="outline" size="sm">
                <a href={externalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open
                </a>
              </Button>
            ) : null}
            <Button
              size="sm"
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
              {connecting ? "Opening..." : actionLabel}
            </Button>
            <Button
              variant="outline"
              size="sm"
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
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {details.map((detail) => (
            <DetailRow key={`${provider.id}-${detail.label}`} {...detail} />
          ))}
        </div>

        {provider.lastError ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2 font-medium">
              <RefreshCw className="size-4" />
              {provider.name} needs attention
            </div>
            <p className="mt-2 leading-6">{provider.lastError}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ProfileMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-background/75 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground/90">
        {label === "Account owner" ? <UserRound className="size-4" /> : null}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}
