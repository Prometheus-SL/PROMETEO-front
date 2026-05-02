import * as React from "react";

import { spotifyService } from "./spotify-service";

type SpotifyWebPlaybackError = {
  message?: string;
};

type SpotifyPlayerOptions = {
  name: string;
  getOAuthToken: (callback: (token: string) => void) => void;
  volume?: number;
};

type SpotifyPlayerListenerPayload = {
  device_id: string;
  message?: string;
};

type SpotifyWebPlaybackPlayer = {
  addListener: (
    event: string,
    callback: (payload: SpotifyPlayerListenerPayload) => void,
  ) => boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  activateElement: () => Promise<void>;
};

export type SpotifyWebPlaybackSdk = {
  Player: new (options: SpotifyPlayerOptions) => SpotifyWebPlaybackPlayer;
};

type SpotifyWebPlaybackControllerOptions = {
  getToken: () => Promise<string>;
  loadSdk: () => Promise<SpotifyWebPlaybackSdk>;
  name?: string;
  transferPlayback: (deviceId: string, play: boolean) => Promise<unknown>;
};

export type SpotifyWebPlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "transferring"
  | "active"
  | "activation_required"
  | "error";

export type SpotifyWebPlaybackSnapshot = {
  status: SpotifyWebPlaybackStatus;
  deviceId: string | null;
  error: string | null;
  activationRequired: boolean;
};

type SpotifyWebPlaybackController = {
  activate: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
  getSnapshot: () => SpotifyWebPlaybackSnapshot;
  subscribe: (callback: (snapshot: SpotifyWebPlaybackSnapshot) => void) => () => void;
};

declare global {
  interface Window {
    Spotify?: SpotifyWebPlaybackSdk;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

const SPOTIFY_WEB_PLAYBACK_SDK_URL = "https://sdk.scdn.co/spotify-player.js";

const initialSnapshot: SpotifyWebPlaybackSnapshot = {
  status: "idle",
  deviceId: null,
  error: null,
  activationRequired: false,
};

let sdkPromise: Promise<SpotifyWebPlaybackSdk> | null = null;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
}

export function loadSpotifyWebPlaybackSdk() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Spotify web playback requires a browser."));
  }

  if (window.Spotify) {
    return Promise.resolve(window.Spotify);
  }

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<SpotifyWebPlaybackSdk>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${SPOTIFY_WEB_PLAYBACK_SDK_URL}"]`,
    );
    const previousReady = window.onSpotifyWebPlaybackSDKReady;

    window.onSpotifyWebPlaybackSDKReady = () => {
      previousReady?.();
      if (!window.Spotify) {
        reject(new Error("Spotify Web Playback SDK did not initialize."));
        return;
      }
      resolve(window.Spotify);
    };

    if (existingScript) return;

    const script = document.createElement("script");
    script.src = SPOTIFY_WEB_PLAYBACK_SDK_URL;
    script.async = true;
    script.onerror = () => {
      reject(new Error("Could not load Spotify Web Playback SDK."));
    };
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export function createSpotifyWebPlaybackController({
  getToken,
  loadSdk,
  name = "PROMETEO Web Player",
  transferPlayback,
}: SpotifyWebPlaybackControllerOptions): SpotifyWebPlaybackController {
  let snapshot = initialSnapshot;
  let player: SpotifyWebPlaybackPlayer | null = null;
  let connectingPromise: Promise<void> | null = null;
  let pendingUserTransfer = false;
  const subscribers = new Set<(snapshot: SpotifyWebPlaybackSnapshot) => void>();

  function setSnapshot(updates: Partial<SpotifyWebPlaybackSnapshot>) {
    snapshot = { ...snapshot, ...updates };
    subscribers.forEach((callback) => callback(snapshot));
  }

  async function transferToDevice(deviceId: string) {
    setSnapshot({
      status: "transferring",
      deviceId,
      error: null,
      activationRequired: false,
    });
    await transferPlayback(deviceId, true);
    setSnapshot({
      status: "active",
      deviceId,
      error: null,
      activationRequired: false,
    });
  }

  async function transferToBrowserDevice(deviceId: string) {
    pendingUserTransfer = false;

    try {
      await transferToDevice(deviceId);
    } catch (error) {
      setSnapshot({
        status: "error",
        error: getErrorMessage(
          error,
          "Spotify could not transfer playback to this browser.",
        ),
        activationRequired: false,
      });
    }
  }

  function handlePlayerError(error: SpotifyWebPlaybackError, fallback: string) {
    pendingUserTransfer = false;
    setSnapshot({
      status: "error",
      error: error.message || fallback,
      activationRequired: false,
    });
  }

  async function connectPlayer() {
    if (player || connectingPromise) {
      await connectingPromise;
      return;
    }

    setSnapshot({ ...initialSnapshot, status: "loading" });
    connectingPromise = (async () => {
      try {
        const sdk = await loadSdk();
        player = new sdk.Player({
          name,
          volume: 0.5,
          getOAuthToken: (callback) => {
            void getToken()
              .then(callback)
              .catch((error) => {
                pendingUserTransfer = false;
                setSnapshot({
                  status: "error",
                  error: getErrorMessage(
                    error,
                    "Spotify web player could not get an access token.",
                  ),
                  activationRequired: false,
                });
              });
          },
        });

        player.addListener("ready", ({ device_id }) => {
          setSnapshot({
            status: "ready",
            deviceId: device_id,
            error: null,
            activationRequired: false,
          });
          if (pendingUserTransfer) {
            void transferToBrowserDevice(device_id);
          }
        });

        player.addListener("not_ready", ({ device_id }) => {
          pendingUserTransfer = false;
          setSnapshot({
            status: "error",
            deviceId: device_id,
            error: "Spotify web player is not ready in this browser.",
            activationRequired: false,
          });
        });

        player.addListener("autoplay_failed", () => {
          pendingUserTransfer = false;
          setSnapshot({
            status: "activation_required",
            error: "Spotify needs one click to enable browser audio.",
            activationRequired: true,
          });
        });

        player.addListener("initialization_error", (error) =>
          handlePlayerError(error, "Spotify web player could not initialize."),
        );
        player.addListener("authentication_error", (error) =>
          handlePlayerError(error, "Spotify web player could not authenticate."),
        );
        player.addListener("account_error", (error) =>
          handlePlayerError(error, "Spotify Premium is required for web playback."),
        );
        player.addListener("playback_error", (error) =>
          handlePlayerError(error, "Spotify web player could not start playback."),
        );

        const connected = await player.connect();
        if (!connected) {
          pendingUserTransfer = false;
          setSnapshot({
            status: "error",
            error: "Spotify web player could not connect.",
            activationRequired: false,
          });
        }
      } catch (error) {
        pendingUserTransfer = false;
        setSnapshot({
          status: "error",
          error: getErrorMessage(
            error,
            "Spotify web player could not start in this browser.",
          ),
          activationRequired: false,
        });
      } finally {
        connectingPromise = null;
      }
    })();

    await connectingPromise;
  }

  return {
    async activate() {
      if (!player) {
        await connectPlayer();
      } else if (connectingPromise) {
        await connectingPromise;
      }

      if (!player) return;

      try {
        await player.activateElement();
      } catch (error) {
        setSnapshot({
          status: "activation_required",
          error: getErrorMessage(
            error,
            "Spotify needs one click to enable browser audio.",
          ),
          activationRequired: true,
        });
        return;
      }

      if (snapshot.deviceId) {
        await transferToBrowserDevice(snapshot.deviceId);
        return;
      }

      pendingUserTransfer = true;
      setSnapshot({
        status: "loading",
        error: null,
        activationRequired: false,
      });
    },

    async connect() {
      await connectPlayer();
    },

    disconnect() {
      pendingUserTransfer = false;
      player?.disconnect();
      player = null;
      connectingPromise = null;
      setSnapshot(initialSnapshot);
    },

    getSnapshot() {
      return snapshot;
    },

    subscribe(callback) {
      subscribers.add(callback);
      callback(snapshot);
      return () => {
        subscribers.delete(callback);
      };
    },
  };
}

const sharedSpotifyWebPlaybackController = createSpotifyWebPlaybackController({
  getToken: async () => {
    const token = await spotifyService.getWebPlaybackToken();
    return token.accessToken;
  },
  loadSdk: loadSpotifyWebPlaybackSdk,
  transferPlayback: (deviceId, play) =>
    spotifyService.transferPlayback(deviceId, play),
});

let activeConsumers = 0;

function waitForSharedSpotifyWebPlaybackSnapshot(
  predicate: (snapshot: SpotifyWebPlaybackSnapshot) => boolean,
  timeoutMs = 8000,
) {
  const current = sharedSpotifyWebPlaybackController.getSnapshot();
  if (predicate(current)) {
    return Promise.resolve(current);
  }

  return new Promise<SpotifyWebPlaybackSnapshot>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Spotify web player did not become ready in time."));
    }, timeoutMs);

    const unsubscribe = sharedSpotifyWebPlaybackController.subscribe((snapshot) => {
      if (!predicate(snapshot)) return;
      window.clearTimeout(timer);
      unsubscribe();
      resolve(snapshot);
    });
  });
}

export async function activateSpotifyWebPlaybackForSpark() {
  await sharedSpotifyWebPlaybackController.activate();

  return waitForSharedSpotifyWebPlaybackSnapshot((snapshot) => (
    snapshot.status === "active"
    || snapshot.status === "activation_required"
    || snapshot.status === "error"
  ));
}

export function useSpotifyWebPlayback(enabled: boolean) {
  const [snapshot, setSnapshot] = React.useState(
    sharedSpotifyWebPlaybackController.getSnapshot(),
  );

  React.useEffect(
    () => sharedSpotifyWebPlaybackController.subscribe(setSnapshot),
    [],
  );

  React.useEffect(() => {
    if (!enabled) return;

    activeConsumers += 1;
    void sharedSpotifyWebPlaybackController.connect();

    return () => {
      activeConsumers -= 1;
      if (activeConsumers <= 0) {
        activeConsumers = 0;
        sharedSpotifyWebPlaybackController.disconnect();
      }
    };
  }, [enabled]);

  return {
    ...snapshot,
    activate: sharedSpotifyWebPlaybackController.activate,
  };
}
