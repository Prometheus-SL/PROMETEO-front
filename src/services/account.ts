import { api } from "@/lib/api";
import type { AuthUser } from "@/services/auth";

export type LinkedAccountStatus = "disconnected" | "connected" | "reauth_required";
export type LinkedAccountProviderKind = "oauth" | "api_key" | "internal" | string;

export type LinkedSpotifyAccount = {
  status: LinkedAccountStatus;
  displayName: string | null;
  avatarUrl: string | null;
  connectedAt: string | null;
  scopes: string[];
  tokenExpiresAt?: string | null;
  lastError: string | null;
  product: string | null;
  externalUrl: string | null;
};

export type LinkedDiscordAccount = {
  status: LinkedAccountStatus;
  id: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  connectedAt: string | null;
  scopes: string[];
  tokenExpiresAt?: string | null;
  lastError: string | null;
  email: string | null;
  verified: boolean | null;
};

export type LinkedAccountProviderProfile = Record<string, unknown> | null;

export type LinkedAccountProvider = {
  id: string;
  name: string;
  description: string;
  kind: LinkedAccountProviderKind;
  status: LinkedAccountStatus;
  profile?: LinkedAccountProviderProfile;
  connectedAt: string | null;
  tokenExpiresAt?: string | null;
  scopes: string[];
  lastError: string | null;
  available?: boolean;
  connectSupported?: boolean;
  disconnectSupported?: boolean;
  connectPath: string;
  disconnectPath: string;
};

export type AccountPayload = {
  user: AuthUser;
  linkedAccounts: {
    spotify: LinkedSpotifyAccount;
    discord: LinkedDiscordAccount;
  };
  providers?: LinkedAccountProvider[];
};

export const accountService = {
  async getAccount(): Promise<AccountPayload> {
    return api.getData<AccountPayload>("/api/v1/account");
  },

  async listProviders(): Promise<LinkedAccountProvider[]> {
    const data = await api.getData<{ providers: LinkedAccountProvider[] }>(
      "/api/v1/account/providers",
    );

    return data.providers;
  },

  async beginProviderConnect(
    providerId: string,
    returnOrigin?: string,
  ): Promise<string> {
    const data = await api.postData<{ authorizeUrl: string }>(
      `/api/v1/account/linked-accounts/${providerId}/connect`,
      returnOrigin ? { returnOrigin } : {}
    );

    return data.authorizeUrl;
  },

  async disconnectProvider(providerId: string): Promise<void> {
    await api.deleteData<unknown>(
      `/api/v1/account/linked-accounts/${providerId}`,
    );
  },

  async beginSpotifyConnect(returnOrigin?: string): Promise<string> {
    return this.beginProviderConnect("spotify", returnOrigin);
  },

  async disconnectSpotify(): Promise<void> {
    await this.disconnectProvider("spotify");
  },

  async beginDiscordConnect(returnOrigin?: string): Promise<string> {
    return this.beginProviderConnect("discord", returnOrigin);
  },

  async disconnectDiscord(): Promise<void> {
    await this.disconnectProvider("discord");
  },
};
