import * as React from "react";
import { useSharedContext } from "@/hooks/useSharedContext";
import type { SpotifyAuth, MediaSession } from "@/types/shared";
import { SharedKeys } from "@/types/shared";
import { getSpotifyAuth, setSpotifyAuth } from "./shared-helpers";

// Tipos de la API de Spotify
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

export type SpotifyContextInfo = {
    name: string;
    type: string;
    images?: { url: string }[];
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

type SpotifyAuthState = {
    accessToken: string;
    refreshToken: string;
    tokenExpiry: number;
    isAuthenticated: boolean;
};

type SpotifyState = {
    auth: SpotifyAuthState;
    playbackState: SpotifyPlaybackState | null;
    contextInfo: SpotifyContextInfo | null;
    queue: SpotifyQueueItem[];
    error: string | null;
    volume: number;
};

// Store global compartido entre todas las instancias
const globalSpotifyState: SpotifyState = {
    auth: {
        accessToken: "",
        refreshToken: "",
        tokenExpiry: 0,
        isAuthenticated: false,
    },
    playbackState: null,
    contextInfo: null,
    queue: [],
    error: null,
    volume: 50,
};

// Subscribers para notificar cambios
const subscribers = new Set<(state: SpotifyState) => void>();

// Función para notificar a todos los subscribers
function notifySubscribers() {
    subscribers.forEach((callback) => callback({ ...globalSpotifyState }));
}

// Función para actualizar el estado global
function updateGlobalState(updates: Partial<SpotifyState>) {
    Object.assign(globalSpotifyState, updates);
    notifySubscribers();
}

// ID del intervalo de polling (compartido entre todas las instancias)
let pollingIntervalId: ReturnType<typeof setInterval> | null = null;
let activeInstances = 0;

/**
 * Hook personalizado para gestionar el estado de Spotify
 * Compartido entre todas las instancias del widget
 */
export function useSpotifyState(config: Record<string, unknown>) {
    const clientId = import.meta.env.VITE_SPOTIPY_CLIENT_ID || "";
    const clientSecret = import.meta.env.VITE_SPOTIPY_CLIENT_SECRET || "";

    // Acceso al contexto compartido
    const { setShared, getShared, registerAction, unregisterAction } = useSharedContext();

    // Estado local para tracking de transiciones por instancia
    const previousTrackIdRef = React.useRef<string | null>(null);
    const [isTransitioning, setIsTransitioning] = React.useState(false);

    // Callback para actualizar configuración (pasado desde el componente)
    const onConfigChangeRef = React.useRef<((config: Record<string, unknown>) => void) | undefined>(undefined);

    // Estado local que se sincroniza con el global
    const [state, setState] = React.useState<SpotifyState>({ ...globalSpotifyState });

    // Sincronizar tokens desde config al montar
    React.useEffect(() => {
        const savedAccessToken = String(config["accessToken"] ?? "");
        const savedRefreshToken = String(config["refreshToken"] ?? "");
        const savedTokenExpiry = Number(config["tokenExpiry"] ?? 0);

        if (savedAccessToken && savedAccessToken !== globalSpotifyState.auth.accessToken) {
            updateGlobalState({
                auth: {
                    accessToken: savedAccessToken,
                    refreshToken: savedRefreshToken,
                    tokenExpiry: savedTokenExpiry,
                    isAuthenticated: Boolean(savedAccessToken && Date.now() < savedTokenExpiry),
                },
            });
        }
    }, [config]);

    // Subscribe a cambios globales
    React.useEffect(() => {
        const callback = (newState: SpotifyState) => setState(newState);
        subscribers.add(callback);
        activeInstances++;

        return () => {
            subscribers.delete(callback);
            activeInstances--;

            // Si no quedan instancias activas, detener el polling
            if (activeInstances === 0 && pollingIntervalId) {
                clearInterval(pollingIntervalId);
                pollingIntervalId = null;
            }
        };
    }, []);

    // Función para refrescar el token
    const refreshAccessToken = React.useCallback(async () => {
        const { refreshToken } = globalSpotifyState.auth;
        if (!refreshToken || !clientId || !clientSecret) return false;

        try {
            const response = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
                },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: refreshToken,
                }),
            });

            if (!response.ok) throw new Error("Failed to refresh token");

            const data = await response.json();
            const newExpiry = Date.now() + data.expires_in * 1000;

            updateGlobalState({
                auth: {
                    ...globalSpotifyState.auth,
                    accessToken: data.access_token,
                    tokenExpiry: newExpiry,
                    isAuthenticated: true,
                },
            });

            // Guardar en config
            const newConfig = {
                ...config,
                accessToken: data.access_token,
                tokenExpiry: newExpiry,
            };
            onConfigChangeRef.current?.(newConfig);

            return true;
        } catch (e) {
            console.error("Error refreshing token:", e);
            return false;
        }
    }, [clientId, clientSecret, config]);

    // Función para obtener información del contexto
    const fetchContextInfo = React.useCallback(
        async (contextHref: string) => {
            const { accessToken } = globalSpotifyState.auth;
            if (!accessToken) return;

            try {
                const response = await fetch(contextHref, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                if (!response.ok) return;

                const data = await response.json();
                updateGlobalState({
                    contextInfo: {
                        name: data.name || "Unknown",
                        type: data.type || "context",
                        images: data.images,
                    },
                });
            } catch (e) {
                console.error("Error fetching context:", e);
                updateGlobalState({ contextInfo: null });
            }
        },
        []
    );

    // Función para obtener el estado de reproducción
    const fetchPlaybackState = React.useCallback(async () => {
        const { accessToken } = globalSpotifyState.auth;
        if (!accessToken) return;

        try {
            const response = await fetch("https://api.spotify.com/v1/me/player", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (response.status === 401) {
                const refreshed = await refreshAccessToken();
                if (!refreshed) {
                    updateGlobalState({
                        auth: { ...globalSpotifyState.auth, isAuthenticated: false },
                        error: "Session expired. Please re-authenticate.",
                    });
                }
                return;
            }

            if (response.status === 204) {
                updateGlobalState({
                    playbackState: null,
                    contextInfo: null,
                    error: null,
                });
                return;
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            updateGlobalState({
                playbackState: data,
                error: null,
                auth: { ...globalSpotifyState.auth, isAuthenticated: true },
            });

            // Obtener información del contexto si es diferente
            if (data.context?.href && data.context.href !== globalSpotifyState.contextInfo) {
                fetchContextInfo(data.context.href);
            } else if (!data.context) {
                updateGlobalState({ contextInfo: null });
            }

            // Actualizar volumen si cambió
            if (data.device?.volume_percent !== undefined) {
                updateGlobalState({ volume: data.device.volume_percent });
            }
        } catch (e: unknown) {
            console.error("Error fetching playback:", e);
            updateGlobalState({ error: e instanceof Error ? e.message : String(e) });
        }
    }, [refreshAccessToken, fetchContextInfo]);

    // Controles de reproducción
    const playPause = React.useCallback(async () => {
        const { accessToken } = globalSpotifyState.auth;
        const { playbackState } = globalSpotifyState;
        if (!accessToken || !playbackState?.device) return;

        const endpoint = playbackState.is_playing ? "pause" : "play";
        try {
            await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            await fetchPlaybackState();
        } catch (e) {
            console.error("Error toggling playback:", e);
        }
    }, [fetchPlaybackState]);

    const skipNext = React.useCallback(async () => {
        const { accessToken } = globalSpotifyState.auth;
        if (!accessToken) return;

        try {
            await fetch("https://api.spotify.com/v1/me/player/next", {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            setTimeout(fetchPlaybackState, 300);
        } catch (e) {
            console.error("Error skipping:", e);
        }
    }, [fetchPlaybackState]);

    const skipPrevious = React.useCallback(async () => {
        const { accessToken } = globalSpotifyState.auth;
        if (!accessToken) return;

        try {
            await fetch("https://api.spotify.com/v1/me/player/previous", {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            setTimeout(fetchPlaybackState, 300);
        } catch (e) {
            console.error("Error going back:", e);
        }
    }, [fetchPlaybackState]);

    const toggleShuffle = React.useCallback(async () => {
        const { accessToken } = globalSpotifyState.auth;
        const { playbackState } = globalSpotifyState;
        if (!accessToken || !playbackState) return;

        try {
            await fetch(
                `https://api.spotify.com/v1/me/player/shuffle?state=${!playbackState.shuffle_state}`,
                {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            await fetchPlaybackState();
        } catch (e) {
            console.error("Error toggling shuffle:", e);
        }
    }, [fetchPlaybackState]);

    const toggleRepeat = React.useCallback(async () => {
        const { accessToken } = globalSpotifyState.auth;
        const { playbackState } = globalSpotifyState;
        if (!accessToken || !playbackState) return;

        const nextState =
            playbackState.repeat_state === "off"
                ? "context"
                : playbackState.repeat_state === "context"
                    ? "track"
                    : "off";

        try {
            await fetch(
                `https://api.spotify.com/v1/me/player/repeat?state=${nextState}`,
                {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            await fetchPlaybackState();
        } catch (e) {
            console.error("Error toggling repeat:", e);
        }
    }, [fetchPlaybackState]);

    const seekToPosition = React.useCallback(
        async (position: number) => {
            const { accessToken } = globalSpotifyState.auth;
            if (!accessToken) return;

            try {
                await fetch(
                    `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(
                        position
                    )}`,
                    {
                        method: "PUT",
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }
                );
            } catch (e) {
                console.error("Error seeking:", e);
            }
        },
        []
    );

    const setVolumeLevel = React.useCallback(async (volumePercent: number) => {
        const { accessToken } = globalSpotifyState.auth;
        if (!accessToken) return;

        try {
            await fetch(
                `https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.floor(
                    volumePercent
                )}`,
                {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            updateGlobalState({ volume: volumePercent });
        } catch (e) {
            console.error("Error setting volume:", e);
        }
    }, []);

    const fetchQueue = React.useCallback(async () => {
        const { accessToken } = globalSpotifyState.auth;
        if (!accessToken) return;

        try {
            const response = await fetch("https://api.spotify.com/v1/me/player/queue", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!response.ok) return;

            const data = await response.json();
            const queue = data.queue || [];

            updateGlobalState({ queue });
        } catch (e) {
            console.error("Error fetching queue:", e);
        }
    }, []);

    const playTrack = React.useCallback(async (uri: string) => {
        const { accessToken } = globalSpotifyState.auth;
        if (!accessToken) return;

        try {
            await fetch("https://api.spotify.com/v1/me/player/play", {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    uris: [uri],
                }),
            });
            // Esperar un poco antes de actualizar el estado
            setTimeout(() => {
                fetchPlaybackState();
                fetchQueue();
            }, 300);
        } catch (e) {
            console.error("Error playing track:", e);
        }
    }, [fetchPlaybackState, fetchQueue]);

    const startOAuthFlow = React.useCallback(
        (onConfigChange?: (config: Record<string, unknown>) => void) => {
            if (!clientId || !clientSecret) {
                updateGlobalState({
                    error: "Spotify app not configured. Set VITE_SPOTIPY_CLIENT_ID and VITE_SPOTIPY_CLIENT_SECRET in .env",
                });
                return;
            }

            // Guardar callback para actualizar config
            onConfigChangeRef.current = onConfigChange;

            const redirectUri = `${window.location.origin}/spotify-callback`;
            const scopes = [
                "user-read-playback-state",
                "user-modify-playback-state",
                "user-read-currently-playing",
                "user-read-recently-played",
                "user-read-playback-position",
            ].join(" ");

            const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams(
                {
                    client_id: clientId,
                    response_type: "code",
                    redirect_uri: redirectUri,
                    scope: scopes,
                    show_dialog: "true",
                }
            )}`;

            const popup = window.open(authUrl, "_blank", "width=500,height=700");
            let isProcessing = false;

            const exchangeCode = async (code: string) => {
                if (isProcessing) return;
                isProcessing = true;

                try {
                    const response = await fetch("https://accounts.spotify.com/api/token", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
                        },
                        body: new URLSearchParams({
                            grant_type: "authorization_code",
                            code,
                            redirect_uri: redirectUri,
                        }),
                    });

                    if (!response.ok) throw new Error("Failed to exchange code");

                    const data = await response.json();
                    const newAccessToken = data.access_token;
                    const newRefreshToken = data.refresh_token;
                    const newExpiry = Date.now() + data.expires_in * 1000;

                    updateGlobalState({
                        auth: {
                            accessToken: newAccessToken,
                            refreshToken: newRefreshToken,
                            tokenExpiry: newExpiry,
                            isAuthenticated: true,
                        },
                    });

                    const newConfig = {
                        ...config,
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken,
                        tokenExpiry: newExpiry,
                    };
                    onConfigChange?.(newConfig);

                    localStorage.removeItem("spotify_auth_code");
                    localStorage.removeItem("spotify_auth_timestamp");

                    if (popup && !popup.closed) {
                        popup.close();
                    }
                } catch (e) {
                    console.error("Error exchanging code:", e);
                    updateGlobalState({ error: "Failed to complete authentication" });
                } finally {
                    isProcessing = false;
                }
            };

            const handleMessage = async (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data.type !== "spotify_auth_success") return;

                const code = event.data.code;
                if (!code) return;

                window.removeEventListener("message", handleMessage);
                clearInterval(storageInterval);

                await exchangeCode(code);
            };

            window.addEventListener("message", handleMessage);

            const handleStorage = async () => {
                const code = localStorage.getItem("spotify_auth_code");
                const timestamp = localStorage.getItem("spotify_auth_timestamp");

                if (!code || !timestamp) return;

                if (Date.now() - parseInt(timestamp) > 10000) {
                    localStorage.removeItem("spotify_auth_code");
                    localStorage.removeItem("spotify_auth_timestamp");
                    return;
                }

                window.removeEventListener("message", handleMessage);
                clearInterval(storageInterval);

                await exchangeCode(code);
            };

            const storageInterval = setInterval(handleStorage, 1000);
            setTimeout(() => {
                clearInterval(storageInterval);
                window.removeEventListener("message", handleMessage);
            }, 10000);
        },
        [clientId, clientSecret, config]
    );

    // Iniciar polling cuando se autentique (solo una vez para todas las instancias)
    React.useEffect(() => {
        if (!state.auth.isAuthenticated) return;

        // Cargar datos iniciales
        fetchPlaybackState();

        // Iniciar polling solo si no está ya activo
        if (!pollingIntervalId) {
            pollingIntervalId = setInterval(() => {
                fetchPlaybackState();
            }, 1000);
        }
    }, [state.auth.isAuthenticated, fetchPlaybackState]);

    // Detectar cambios de canción para animación (por instancia)
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

    // Sincronizar auth con SharedContext
    React.useEffect(() => {
        if (state.auth.isAuthenticated && state.auth.accessToken) {
            const spotifyAuth: SpotifyAuth = {
                accessToken: state.auth.accessToken,
                refreshToken: state.auth.refreshToken,
                expiresAt: state.auth.tokenExpiry,
                userId: undefined, // Podríamos obtenerlo de la API si lo necesitas
            };
            setSpotifyAuth(setShared, spotifyAuth);
        }
    }, [state.auth, setShared]);

    // Publicar media session cuando cambie la reproducción
    React.useEffect(() => {
        if (state.playbackState?.item) {
            const track = state.playbackState.item;
            const mediaSession: MediaSession = {
                title: track.name,
                artist: track.artists.map((a) => a.name).join(", "),
                album: track.album.name,
                artwork: track.album.images[0]?.url,
                isPlaying: state.playbackState.is_playing,
                source: "spotify",
                timestamp: state.playbackState.progress_ms,
                duration: track.duration_ms,
            };
            setShared<MediaSession>(SharedKeys.MEDIA_SESSION, mediaSession);
        } else {
            // No hay reproducción activa, limpiar la sesión si es de Spotify
            const currentSession = getShared<MediaSession>(SharedKeys.MEDIA_SESSION);
            if (currentSession && currentSession.source === "spotify") {
                // Eliminar completamente la media session
                setShared<MediaSession | null>(SharedKeys.MEDIA_SESSION, null);
            }
        }
    }, [state.playbackState, setShared, getShared]);

    // Intentar cargar auth desde SharedContext al montar (solo si no hay en config)
    React.useEffect(() => {
        const hasConfigAuth = Boolean(config["accessToken"]);
        if (!hasConfigAuth) {
            const sharedAuth = getSpotifyAuth(getShared);
            if (sharedAuth && sharedAuth.accessToken) {
                updateGlobalState({
                    auth: {
                        accessToken: sharedAuth.accessToken,
                        refreshToken: sharedAuth.refreshToken || "",
                        tokenExpiry: sharedAuth.expiresAt,
                        isAuthenticated: true,
                    },
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Solo al montar

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
            description: "Controla la reproducción actual",
            intentTags: ["reproduce", "pausa", "play", "música", "spotify"],
            run: async () => {
                if (!globalSpotifyState.auth.isAuthenticated)
                    return { success: false, message: "Inicia sesión en Spotify" };
                await playPause();
                const isPlaying = globalSpotifyState.playbackState?.is_playing;
                return {
                    success: true,
                    message: isPlaying ? "Reproducción pausada." : "Reproducción reanudada.",
                };
            },
        });

        registerAction({
            id: nextId,
            widgetId: "spotify-widget",
            title: "Siguiente canción",
            description: "Salta a la siguiente pista",
            intentTags: ["siguiente", "adelanta", "next"],
            run: async () => {
                if (!globalSpotifyState.auth.isAuthenticated)
                    return { success: false, message: "Inicia sesión en Spotify" };
                await skipNext();
                return { success: true, message: "Saltando a la siguiente canción." };
            },
        });

        registerAction({
            id: prevId,
            widgetId: "spotify-widget",
            title: "Canción anterior",
            description: "Vuelve a la pista previa",
            intentTags: ["anterior", "atrás", "previa"],
            run: async () => {
                if (!globalSpotifyState.auth.isAuthenticated)
                    return { success: false, message: "Inicia sesión en Spotify" };
                await skipPrevious();
                return { success: true, message: "Volviendo a la canción anterior." };
            },
        });

        registerAction({
            id: volUpId,
            widgetId: "spotify-widget",
            title: "Subir volumen",
            description: "Sube el volumen un poco",
            intentTags: ["sube volumen", "más volumen"],
            run: async () => {
                if (!globalSpotifyState.auth.isAuthenticated)
                    return { success: false, message: "Inicia sesión en Spotify" };
                const nextVol = Math.min(100, (globalSpotifyState.volume ?? state.volume ?? 0) + 10);
                await setVolumeLevel(nextVol);
                return { success: true, message: `Volumen a ${Math.round(nextVol)}%.` };
            },
        });

        registerAction({
            id: volDownId,
            widgetId: "spotify-widget",
            title: "Bajar volumen",
            description: "Baja el volumen un poco",
            intentTags: ["baja volumen", "menos volumen"],
            run: async () => {
                if (!globalSpotifyState.auth.isAuthenticated)
                    return { success: false, message: "Inicia sesión en Spotify" };
                const nextVol = Math.max(0, (globalSpotifyState.volume ?? state.volume ?? 0) - 10);
                await setVolumeLevel(nextVol);
                return { success: true, message: `Volumen a ${Math.round(nextVol)}%.` };
            },
        });

        return () => {
            unregisterAction(playPauseId);
            unregisterAction(nextId);
            unregisterAction(prevId);
            unregisterAction(volUpId);
            unregisterAction(volDownId);
        };
    }, [playPause, registerAction, skipNext, skipPrevious, setVolumeLevel, unregisterAction, state.volume]);

    return {
        // Estado
        ...state,
        isTransitioning, // Estado local por instancia

        // Controles
        playPause,
        skipNext,
        skipPrevious,
        toggleShuffle,
        toggleRepeat,
        seekToPosition,
        setVolumeLevel,
        fetchQueue,
        playTrack,
        startOAuthFlow,
    };
}
