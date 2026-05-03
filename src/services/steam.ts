import { api } from "@/lib/api";

export type SteamProviderStatus = {
  status?: string;
  profile?: SteamProfile | null;
  connectedAt?: string | null;
  tokenExpiresAt?: string | null;
  scopes?: string[];
  lastError?: string | null;
};

export type SteamProfile = {
  steamId?: string | null;
  personaName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  profileUrl?: string | null;
  visibilityState?: number | null;
};

export type SteamFriend = {
  steamId: string;
  personaName: string;
  personaState: number;
  personaStateLabel: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  friendSince?: string | null;
  game: {
    appId: string | null;
    name: string;
  } | null;
};

export type SteamFriendsPresence = {
  provider?: SteamProviderStatus;
  profile: SteamProfile;
  friends: SteamFriend[];
  onlineCount: number;
  playingCount: number;
  totalFriends: number;
  inspectedCount: number;
  error?: string;
};

export type SteamDeal = {
  appId: number;
  name: string;
  discountPercent: number;
  originalPrice: number | null;
  finalPrice: number | null;
  currency: string | null;
  image: string | null;
  largeImage: string | null;
  url: string;
  discountExpiration?: string | null;
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
};

export type SteamDealsSummary = {
  country: string;
  language: string;
  generatedAt?: string;
  deals: SteamDeal[];
};

export type SteamFriendsOptions = {
  limit?: number;
  maxFriendsToInspect?: number;
};

export type SteamDealsOptions = {
  country?: string;
  language?: string;
  limit?: number;
};

function appendOptionalParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
) {
  if (value !== undefined && value !== null && String(value).trim()) {
    params.set(key, String(value));
  }
}

export const steamService = {
  async getFriendsPresence(
    options: SteamFriendsOptions = {},
  ): Promise<SteamFriendsPresence> {
    const params = new URLSearchParams();
    appendOptionalParam(params, "limit", options.limit);
    appendOptionalParam(
      params,
      "maxFriendsToInspect",
      options.maxFriendsToInspect,
    );
    const query = params.toString();

    return api.getData<SteamFriendsPresence>(
      `/api/v1/integrations/steam/friends${query ? `?${query}` : ""}`,
    );
  },

  async getDeals(options: SteamDealsOptions = {}): Promise<SteamDealsSummary> {
    const params = new URLSearchParams();
    appendOptionalParam(params, "country", options.country);
    appendOptionalParam(params, "language", options.language);
    appendOptionalParam(params, "limit", options.limit);
    const query = params.toString();

    return api.getData<SteamDealsSummary>(
      `/api/v1/integrations/steam/deals${query ? `?${query}` : ""}`,
    );
  },
};
