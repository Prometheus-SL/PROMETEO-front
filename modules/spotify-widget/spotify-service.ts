import { ApiError, api } from "@/lib/api";
import type { LinkedSpotifyAccount } from "@/services/account";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error?: string;
  message?: string;
  code?: string;
};

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
};

export type SpotifyPlaybackState = {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  shuffle_state: boolean;
  repeat_state: "off" | "track" | "context";
  device: {
    id: string;
    name: string;
    volume_percent?: number;
    type: string;
  } | null;
  context: {
    type: string;
    href: string;
    uri: string;
  } | null;
};

export type SpotifyQueueItem = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
  uri: string;
};

export type SpotifyWebPlaybackToken = {
  accessToken: string;
  expiresAt: string | null;
  scopes: string[];
};

function getApiErrorMessage(response: ApiFailure | null | undefined, fallback: string) {
  return response?.error || response?.message || fallback;
}

function extractCode(error: unknown) {
  if (!(error instanceof ApiError)) return null;
  if (!error.details || typeof error.details !== "object") return null;
  const details = error.details as { code?: unknown };
  return typeof details.code === "string" ? details.code : null;
}

export function getSpotifyErrorCode(error: unknown) {
  return extractCode(error);
}

export function getSpotifyErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const response =
      error.details && typeof error.details === "object"
        ? (error.details as ApiFailure)
        : null;
    return getApiErrorMessage(response, error.message || fallback);
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export const spotifyService = {
  async getStatus(): Promise<LinkedSpotifyAccount> {
    const res = await api.get<ApiSuccess<{ spotify: LinkedSpotifyAccount }> | ApiFailure>(
      "/api/v1/integrations/spotify/status"
    );
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getApiErrorMessage(res as ApiFailure, "Could not load Spotify status.")
      );
    }
    return (res as ApiSuccess<{ spotify: LinkedSpotifyAccount }>).data.spotify;
  },

  async getPlaybackState(): Promise<SpotifyPlaybackState | null> {
    const res = await api.get<
      ApiSuccess<{ playbackState: SpotifyPlaybackState | null }> | ApiFailure
    >("/api/v1/integrations/spotify/player");
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getApiErrorMessage(res as ApiFailure, "Could not load Spotify player.")
      );
    }
    return (res as ApiSuccess<{ playbackState: SpotifyPlaybackState | null }>).data
      .playbackState;
  },

  async getQueue(): Promise<SpotifyQueueItem[]> {
    const res = await api.get<ApiSuccess<{ queue: SpotifyQueueItem[] }> | ApiFailure>(
      "/api/v1/integrations/spotify/player/queue"
    );
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getApiErrorMessage(res as ApiFailure, "Could not load Spotify queue.")
      );
    }
    return (res as ApiSuccess<{ queue: SpotifyQueueItem[] }>).data.queue || [];
  },

  async getWebPlaybackToken(): Promise<SpotifyWebPlaybackToken> {
    const res = await api.get<
      ApiSuccess<SpotifyWebPlaybackToken> | ApiFailure
    >("/api/v1/integrations/spotify/player/web-token");
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getApiErrorMessage(
          res as ApiFailure,
          "Could not load Spotify web player token.",
        ),
      );
    }
    return (res as ApiSuccess<SpotifyWebPlaybackToken>).data;
  },

  pause: () => api.put("/api/v1/integrations/spotify/player/pause"),
  play: (body?: Record<string, unknown>) =>
    api.put("/api/v1/integrations/spotify/player/play", body ?? {}),
  transferPlayback: (deviceId: string, play = true) =>
    api.put("/api/v1/integrations/spotify/player/transfer", { deviceId, play }),
  next: () => api.post("/api/v1/integrations/spotify/player/next"),
  previous: () => api.post("/api/v1/integrations/spotify/player/previous"),
  seek: (positionMs: number) =>
    api.put("/api/v1/integrations/spotify/player/seek", { positionMs }),
  volume: (volumePercent: number) =>
    api.put("/api/v1/integrations/spotify/player/volume", { volumePercent }),
  shuffle: (state: boolean) =>
    api.put("/api/v1/integrations/spotify/player/shuffle", { state }),
  repeat: (state: "off" | "track" | "context") =>
    api.put("/api/v1/integrations/spotify/player/repeat", { state }),
  playTrack: (uri: string) =>
    api.put("/api/v1/integrations/spotify/player/play-track", { uri }),
};
