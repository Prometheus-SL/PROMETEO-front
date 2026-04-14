import { api } from "@/lib/api";
import type { AuthUser } from "@/services/auth";

export type LinkedAccountStatus = "disconnected" | "connected" | "reauth_required";

export type LinkedSpotifyAccount = {
  status: LinkedAccountStatus;
  displayName: string | null;
  avatarUrl: string | null;
  connectedAt: string | null;
  scopes: string[];
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
  lastError: string | null;
  email: string | null;
  verified: boolean | null;
};

export type AccountPayload = {
  user: AuthUser;
  linkedAccounts: {
    spotify: LinkedSpotifyAccount;
    discord: LinkedDiscordAccount;
  };
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error?: string;
  message?: string;
};

function getApiErrorMessage(response: ApiFailure | null | undefined, fallback: string) {
  return response?.error || response?.message || fallback;
}

export const accountService = {
  async getAccount(): Promise<AccountPayload> {
    const res = await api.get<ApiSuccess<AccountPayload> | ApiFailure>("/api/v1/account");
    if (!res || ("success" in res && !res.success)) {
      throw new Error(getApiErrorMessage(res as ApiFailure, "No se pudo cargar la cuenta."));
    }
    return (res as ApiSuccess<AccountPayload>).data;
  },

  async beginSpotifyConnect(returnOrigin?: string): Promise<string> {
    const res = await api.post<ApiSuccess<{ authorizeUrl: string }> | ApiFailure>(
      "/api/v1/account/linked-accounts/spotify/connect",
      returnOrigin ? { returnOrigin } : {}
    );

    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getApiErrorMessage(res as ApiFailure, "No se pudo iniciar la vinculacion con Spotify.")
      );
    }

    return (res as ApiSuccess<{ authorizeUrl: string }>).data.authorizeUrl;
  },

  async disconnectSpotify(): Promise<void> {
    const res = await api.delete<ApiSuccess<{ spotify: LinkedSpotifyAccount }> | ApiFailure>(
      "/api/v1/account/linked-accounts/spotify"
    );

    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getApiErrorMessage(res as ApiFailure, "No se pudo desvincular Spotify.")
      );
    }
  },

  async beginDiscordConnect(returnOrigin?: string): Promise<string> {
    const res = await api.post<ApiSuccess<{ authorizeUrl: string }> | ApiFailure>(
      "/api/v1/account/linked-accounts/discord/connect",
      returnOrigin ? { returnOrigin } : {}
    );

    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getApiErrorMessage(res as ApiFailure, "No se pudo iniciar la vinculacion con Discord.")
      );
    }

    return (res as ApiSuccess<{ authorizeUrl: string }>).data.authorizeUrl;
  },

  async disconnectDiscord(): Promise<void> {
    const res = await api.delete<ApiSuccess<{ discord: LinkedDiscordAccount }> | ApiFailure>(
      "/api/v1/account/linked-accounts/discord"
    );

    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getApiErrorMessage(res as ApiFailure, "No se pudo desvincular Discord.")
      );
    }
  },
};
