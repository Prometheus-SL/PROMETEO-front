import * as React from "react";

import { useSharedContext } from "@/hooks/useSharedContext";
import type { MediaSession } from "@/types/shared";
import { SharedKeys } from "@/types/shared";
import type { LinkedSpotifyAccount } from "@/services/account";

import {
  getSpotifyErrorCode,
  getSpotifyErrorMessage,
  spotifyService,
  type SpotifyPlaybackState,
  type SpotifyQueueItem,
} from "./spotify-service";

type SpotifyAuthState = Pick<
  LinkedSpotifyAccount,
  "status" | "displayName" | "avatarUrl" | "lastError"
> & {
  isAuthenticated: boolean;
};

type SpotifyState = {
  auth: SpotifyAuthState;
  playbackState: SpotifyPlaybackState | null;
  queue: SpotifyQueueItem[];
  error: string | null;
  volume: number;
};

const globalSpotifyState: SpotifyState = {
  auth: {
    status: "disconnected",
    displayName: null,
    avatarUrl: null,
    lastError: null,
    isAuthenticated: false,
  },
  playbackState: null,
  queue: [],
  error: null,
  volume: 50,
};

const subscribers = new Set<(state: SpotifyState) => void>();

let pollingTimeoutId: ReturnType<typeof setTimeout> | null = null;
let pollingFetcher: (() => Promise<void>) | null = null;
let activeInstances = 0;

const SPOTIFY_ACTIVE_POLL_INTERVAL_MS = 3000;
const SPOTIFY_IDLE_POLL_INTERVAL_MS = 10000;

function notifySubscribers() {
  subscribers.forEach((callback) => callback({ ...globalSpotifyState }));
}

function updateGlobalState(updates: Partial<SpotifyState>) {
  let changed = false;

  for (const key of Object.keys(updates) as Array<keyof SpotifyState>) {
    if (globalSpotifyState[key] !== updates[key]) {
      changed = true;
      break;
    }
  }

  if (!changed) return;

  Object.assign(globalSpotifyState, updates);
  notifySubscribers();
}

function stopSpotifyPolling() {
  if (pollingTimeoutId) {
    clearTimeout(pollingTimeoutId);
    pollingTimeoutId = null;
  }
}

function getSpotifyPollIntervalMs() {
  return globalSpotifyState.playbackState?.is_playing
    ? SPOTIFY_ACTIVE_POLL_INTERVAL_MS
    : SPOTIFY_IDLE_POLL_INTERVAL_MS;
}

function scheduleSpotifyPolling() {
  stopSpotifyPolling();

  if (
    !pollingFetcher ||
    activeInstances === 0 ||
    !globalSpotifyState.auth.isAuthenticated
  ) {
    return;
  }

  pollingTimeoutId = setTimeout(async () => {
    if (
      !pollingFetcher ||
      activeInstances === 0 ||
      !globalSpotifyState.auth.isAuthenticated
    ) {
      return;
    }

    await pollingFetcher();
    scheduleSpotifyPolling();
  }, getSpotifyPollIntervalMs());
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createAuthState(account?: Partial<LinkedSpotifyAccount> | null): SpotifyAuthState {
  return {
    status: account?.status === "reauth_required" ? "reauth_required" : account?.status === "connected" ? "connected" : "disconnected",
    displayName: account?.displayName ?? null,
    avatarUrl: account?.avatarUrl ?? null,
    lastError: account?.lastError ?? null,
    isAuthenticated: account?.status === "connected",
  };
}

export function useSpotifyState(_config: Record<string, unknown>) {
  const { setShared, getShared, registerAction, unregisterAction } =
    useSharedContext();

  const previousTrackIdRef = React.useRef<string | null>(null);
  const volumeUpdateTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pendingVolumeRef = React.useRef<number | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [state, setState] = React.useState<SpotifyState>({ ...globalSpotifyState });

  const handleSpotifyError = React.useCallback(
    (error: unknown, fallback: string) => {
      const code = getSpotifyErrorCode(error);
      const message = getSpotifyErrorMessage(error, fallback);

      if (code === "LINKED_ACCOUNT_REQUIRED") {
        updateGlobalState({
          auth: {
            ...globalSpotifyState.auth,
            status: "disconnected",
            isAuthenticated: false,
          },
          playbackState: null,
          queue: [],
          error: message,
        });
        stopSpotifyPolling();
        return message;
      }

      if (code === "REAUTH_REQUIRED") {
        updateGlobalState({
          auth: {
            ...globalSpotifyState.auth,
            status: "reauth_required",
            isAuthenticated: false,
            lastError: message,
          },
          playbackState: null,
          queue: [],
          error: message,
        });
        stopSpotifyPolling();
        return message;
      }

      updateGlobalState({ error: message });
      return message;
    },
    []
  );

  const loadSpotifyStatus = React.useCallback(async () => {
    try {
      const spotify = await spotifyService.getStatus();
      updateGlobalState({
        auth: createAuthState(spotify),
        playbackState:
          spotify.status === "connected" ? globalSpotifyState.playbackState : null,
        queue: spotify.status === "connected" ? globalSpotifyState.queue : [],
        error:
          spotify.status === "reauth_required"
            ? spotify.lastError || globalSpotifyState.error
            : spotify.status === "disconnected"
            ? null
            : globalSpotifyState.error,
      });
      return spotify;
    } catch (error) {
      handleSpotifyError(error, "Could not load Spotify account status.");
      return null;
    }
  }, [handleSpotifyError]);

  const fetchPlaybackState = React.useCallback(async () => {
    try {
      const playbackState = await spotifyService.getPlaybackState();

      updateGlobalState({
        playbackState,
        queue: playbackState ? globalSpotifyState.queue : [],
        error: null,
        volume:
          playbackState?.device?.volume_percent ?? globalSpotifyState.volume ?? 50,
      });
    } catch (error) {
      handleSpotifyError(error, "Could not load Spotify playback.");
    }
  }, [handleSpotifyError]);

  const fetchQueue = React.useCallback(async () => {
    try {
      const queue = await spotifyService.getQueue();
      updateGlobalState({ queue, error: null });
    } catch (error) {
      handleSpotifyError(error, "Could not load Spotify queue.");
    }
  }, [handleSpotifyError]);

  const runAndRefresh = React.useCallback(
    async (
      action: () => Promise<unknown>,
      options?: { delayMs?: number; syncQueue?: boolean }
    ) => {
      try {
        await action();
        if (options?.delayMs) {
          await wait(options.delayMs);
        }
        await fetchPlaybackState();
        if (options?.syncQueue) {
          await fetchQueue();
        }
      } catch (error) {
        handleSpotifyError(error, "Spotify could not process the requested action.");
      }
    },
    [fetchPlaybackState, fetchQueue, handleSpotifyError]
  );

  React.useEffect(() => {
    const callback = (newState: SpotifyState) => setState(newState);
    subscribers.add(callback);
    activeInstances += 1;

    return () => {
      subscribers.delete(callback);
      activeInstances -= 1;

      if (activeInstances === 0) {
        stopSpotifyPolling();
      }
    };
  }, []);

  const playPause = React.useCallback(async () => {
    const playbackState = globalSpotifyState.playbackState;
    if (playbackState?.is_playing) {
      await runAndRefresh(() => spotifyService.pause(), { delayMs: 150 });
      return;
    }

    await runAndRefresh(() => spotifyService.play(), { delayMs: 150 });
  }, [runAndRefresh]);

  const skipNext = React.useCallback(async () => {
    await runAndRefresh(() => spotifyService.next(), {
      delayMs: 350,
      syncQueue: true,
    });
  }, [runAndRefresh]);

  const skipPrevious = React.useCallback(async () => {
    await runAndRefresh(() => spotifyService.previous(), { delayMs: 300 });
  }, [runAndRefresh]);

  const toggleShuffle = React.useCallback(async () => {
    const nextState = !Boolean(globalSpotifyState.playbackState?.shuffle_state);
    await runAndRefresh(() => spotifyService.shuffle(nextState), { delayMs: 120 });
  }, [runAndRefresh]);

  const toggleRepeat = React.useCallback(async () => {
    const repeatState = globalSpotifyState.playbackState?.repeat_state ?? "off";
    const nextState =
      repeatState === "off"
        ? "context"
        : repeatState === "context"
        ? "track"
        : "off";

    await runAndRefresh(() => spotifyService.repeat(nextState), { delayMs: 120 });
  }, [runAndRefresh]);

  const seekToPosition = React.useCallback(
    async (position: number) => {
      try {
        await spotifyService.seek(position);
      } catch (error) {
        handleSpotifyError(error, "Spotify could not update the playback position.");
      }
    },
    [handleSpotifyError]
  );

  const setVolumeLevel = React.useCallback(
    async (volumePercent: number) => {
      const normalized = Math.max(0, Math.min(100, Math.floor(volumePercent)));
      updateGlobalState({ volume: normalized });
      pendingVolumeRef.current = normalized;

      if (volumeUpdateTimerRef.current) {
        clearTimeout(volumeUpdateTimerRef.current);
      }

      volumeUpdateTimerRef.current = setTimeout(async () => {
        if (pendingVolumeRef.current === null) return;

        const nextVolume = pendingVolumeRef.current;
        pendingVolumeRef.current = null;

        try {
          await spotifyService.volume(nextVolume);
        } catch (error) {
          handleSpotifyError(error, "Spotify could not update the volume.");
        }
      }, 180);
    },
    [handleSpotifyError]
  );

  const playTrack = React.useCallback(
    async (uri: string) => {
      await runAndRefresh(() => spotifyService.playTrack(uri), {
        delayMs: 250,
        syncQueue: true,
      });
    },
    [runAndRefresh]
  );

  const advanceToQueueIndex = React.useCallback(
    async (targetIndex: number) => {
      const normalizedIndex = Math.max(0, Math.floor(targetIndex));
      const queueItem = globalSpotifyState.queue[normalizedIndex];
      if (!queueItem?.uri) return;
      await playTrack(queueItem.uri);
    },
    [playTrack]
  );

  React.useEffect(() => {
    return () => {
      if (volumeUpdateTimerRef.current) {
        clearTimeout(volumeUpdateTimerRef.current);
        volumeUpdateTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    void loadSpotifyStatus();

    const handleFocus = () => {
      void loadSpotifyStatus();
      if (globalSpotifyState.auth.isAuthenticated) {
        void fetchPlaybackState();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchPlaybackState, loadSpotifyStatus]);

  React.useEffect(() => {
    if (!state.auth.isAuthenticated) {
      stopSpotifyPolling();
      return;
    }

    void fetchPlaybackState();
  }, [fetchPlaybackState, state.auth.isAuthenticated]);

  React.useEffect(() => {
    if (!state.auth.isAuthenticated) {
      if (activeInstances === 0) {
        stopSpotifyPolling();
      }
      return;
    }

    pollingFetcher = fetchPlaybackState;
    scheduleSpotifyPolling();

    return () => {
      if (pollingFetcher === fetchPlaybackState) {
        pollingFetcher = null;
      }
      if (activeInstances <= 1) {
        stopSpotifyPolling();
      }
    };
  }, [fetchPlaybackState, state.auth.isAuthenticated, state.playbackState?.is_playing]);

  React.useEffect(() => {
    const currentTrackId = state.playbackState?.item?.id;
    const previousTrackId = previousTrackIdRef.current;

    if (!currentTrackId) {
      previousTrackIdRef.current = null;
      setIsTransitioning(false);
      return;
    }

    if (previousTrackId === null) {
      previousTrackIdRef.current = currentTrackId;
      setIsTransitioning(false);
      return;
    }

    if (currentTrackId !== previousTrackId) {
      setIsTransitioning(true);
      previousTrackIdRef.current = currentTrackId;

      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [state.playbackState?.item?.id]);

  React.useEffect(() => {
    if (state.playbackState?.item) {
      const track = state.playbackState.item;
      const mediaSession: MediaSession = {
        title: track.name,
        artist: track.artists.map((artist) => artist.name).join(", "),
        album: track.album.name,
        artwork: track.album.images[0]?.url,
        isPlaying: state.playbackState.is_playing,
        source: "spotify",
        timestamp: state.playbackState.progress_ms,
        duration: track.duration_ms,
      };
      setShared<MediaSession>(SharedKeys.MEDIA_SESSION, mediaSession);
    } else {
      const currentSession = getShared<MediaSession>(SharedKeys.MEDIA_SESSION);
      if (currentSession && currentSession.source === "spotify") {
        setShared<MediaSession | null>(SharedKeys.MEDIA_SESSION, null);
      }
    }
  }, [getShared, setShared, state.playbackState]);

  React.useEffect(() => {
    const playPauseId = "spotify-widget:play-pause";
    const nextId = "spotify-widget:next";
    const prevId = "spotify-widget:previous";
    const volUpId = "spotify-widget:vol-up";
    const volDownId = "spotify-widget:vol-down";

    registerAction({
      id: playPauseId,
      widgetId: "spotify-widget",
      title: "Reproducir / Pausar",
      description: "Controla la reproduccion actual",
      intentTags: ["reproduce", "pausa", "play", "musica", "spotify"],
      run: async () => {
        if (!globalSpotifyState.auth.isAuthenticated) {
          return {
            success: false,
            message: "Vincula Spotify desde Account para usar este control.",
          };
        }
        await playPause();
        return { success: true, message: "Spotify actualizo la reproduccion." };
      },
    });

    registerAction({
      id: nextId,
      widgetId: "spotify-widget",
      title: "Siguiente cancion",
      description: "Salta a la siguiente pista",
      intentTags: ["siguiente", "adelanta", "next"],
      run: async () => {
        if (!globalSpotifyState.auth.isAuthenticated) {
          return {
            success: false,
            message: "Vincula Spotify desde Account para usar este control.",
          };
        }
        await skipNext();
        return { success: true, message: "Saltando a la siguiente cancion." };
      },
    });

    registerAction({
      id: prevId,
      widgetId: "spotify-widget",
      title: "Cancion anterior",
      description: "Vuelve a la pista previa",
      intentTags: ["anterior", "atras", "previa"],
      run: async () => {
        if (!globalSpotifyState.auth.isAuthenticated) {
          return {
            success: false,
            message: "Vincula Spotify desde Account para usar este control.",
          };
        }
        await skipPrevious();
        return { success: true, message: "Volviendo a la cancion anterior." };
      },
    });

    registerAction({
      id: volUpId,
      widgetId: "spotify-widget",
      title: "Subir volumen",
      description: "Sube el volumen un poco",
      intentTags: ["sube volumen", "mas volumen"],
      run: async () => {
        if (!globalSpotifyState.auth.isAuthenticated) {
          return {
            success: false,
            message: "Vincula Spotify desde Account para usar este control.",
          };
        }
        const nextVolume = Math.min(100, (globalSpotifyState.volume ?? 0) + 10);
        await setVolumeLevel(nextVolume);
        return {
          success: true,
          message: `Volumen a ${Math.round(nextVolume)}%.`,
        };
      },
    });

    registerAction({
      id: volDownId,
      widgetId: "spotify-widget",
      title: "Bajar volumen",
      description: "Baja el volumen un poco",
      intentTags: ["baja volumen", "menos volumen"],
      run: async () => {
        if (!globalSpotifyState.auth.isAuthenticated) {
          return {
            success: false,
            message: "Vincula Spotify desde Account para usar este control.",
          };
        }
        const nextVolume = Math.max(0, (globalSpotifyState.volume ?? 0) - 10);
        await setVolumeLevel(nextVolume);
        return {
          success: true,
          message: `Volumen a ${Math.round(nextVolume)}%.`,
        };
      },
    });

    return () => {
      unregisterAction(playPauseId);
      unregisterAction(nextId);
      unregisterAction(prevId);
      unregisterAction(volUpId);
      unregisterAction(volDownId);
    };
  }, [
    playPause,
    registerAction,
    setVolumeLevel,
    skipNext,
    skipPrevious,
    unregisterAction,
  ]);

  return {
    ...state,
    isTransitioning,
    playPause,
    skipNext,
    skipPrevious,
    toggleShuffle,
    toggleRepeat,
    seekToPosition,
    setVolumeLevel,
    fetchQueue,
    advanceToQueueIndex,
    playTrack,
    refreshStatus: loadSpotifyStatus,
  };
}
