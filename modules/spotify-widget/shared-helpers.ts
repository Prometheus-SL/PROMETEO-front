/**
 * Helpers para gestionar la autenticacion de Spotify en SharedContext
 */

import type { SpotifyAuth } from "@/types/shared";
import { SharedKeys } from "@/types/shared";

const SPOTIFY_AUTH_STORAGE_KEY = "prometeo.spotify.auth";

function canUseSpotifyAuth(
    auth: SpotifyAuth | null | undefined
): auth is SpotifyAuth {
    if (!auth) return false;

    const hasAccessToken =
        typeof auth.accessToken === "string" && auth.accessToken.length > 0;
    const hasRefreshToken =
        typeof auth.refreshToken === "string" && auth.refreshToken.length > 0;
    const hasValidExpiry =
        typeof auth.expiresAt === "number" && Number.isFinite(auth.expiresAt);

    if (!hasValidExpiry) return false;
    if (hasAccessToken && Date.now() < auth.expiresAt) return true;
    return hasRefreshToken;
}

function readSpotifyAuthFromStorage(): SpotifyAuth | null {
    try {
        const stored = localStorage.getItem(SPOTIFY_AUTH_STORAGE_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored) as SpotifyAuth;
        return canUseSpotifyAuth(parsed) ? parsed : null;
    } catch (error) {
        console.error("Error loading Spotify auth from localStorage:", error);
        return null;
    }
}

function writeSpotifyAuthToStorage(auth: SpotifyAuth | null) {
    try {
        if (!auth) {
            localStorage.removeItem(SPOTIFY_AUTH_STORAGE_KEY);
            return;
        }

        localStorage.setItem(SPOTIFY_AUTH_STORAGE_KEY, JSON.stringify(auth));
    } catch (error) {
        console.error("Error saving Spotify auth to localStorage:", error);
    }
}

/**
 * Obtiene el auth de Spotify desde SharedContext o localStorage
 */
export function getSpotifyAuth(
    getShared: <T>(key: string) => T | undefined
): SpotifyAuth | null {
    const auth = getShared<SpotifyAuth>(SharedKeys.SPOTIFY_AUTH);
    if (canUseSpotifyAuth(auth)) {
        writeSpotifyAuthToStorage(auth);
        return auth;
    }

    return readSpotifyAuthFromStorage();
}

/**
 * Guarda el auth de Spotify en SharedContext y localStorage
 */
export function setSpotifyAuth(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setShared: <T = any>(key: string, value: T) => void,
    auth: SpotifyAuth
) {
    setShared<SpotifyAuth>(SharedKeys.SPOTIFY_AUTH, auth);
    writeSpotifyAuthToStorage(auth);
}

/**
 * Limpia el auth de Spotify del SharedContext y localStorage
 */
export function clearSpotifyAuth(removeShared: (key: string) => void) {
    removeShared(SharedKeys.SPOTIFY_AUTH);
    writeSpotifyAuthToStorage(null);
}
