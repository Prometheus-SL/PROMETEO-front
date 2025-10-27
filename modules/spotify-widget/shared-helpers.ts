/**
 * Helpers para gestionar la autenticación de Spotify en SharedContext
 */

import type { SpotifyAuth } from "@/types/shared";
import { SharedKeys } from "@/types/shared";

/**
 * Obtiene el auth de Spotify desde SharedContext
 */
export function getSpotifyAuth(
    getShared: <T>(key: string) => T | undefined
): SpotifyAuth | null {
    const auth = getShared<SpotifyAuth>(SharedKeys.SPOTIFY_AUTH);
    if (!auth) return null;

    // Verificar si está autenticado y no expiró
    const isValid = auth.accessToken && Date.now() < auth.expiresAt;
    if (!isValid) return null;

    return auth;
}

/**
 * Guarda el auth de Spotify en SharedContext
 */
export function setSpotifyAuth(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setShared: <T = any>(key: string, value: T) => void,
    auth: SpotifyAuth
) {
    setShared<SpotifyAuth>(SharedKeys.SPOTIFY_AUTH, auth);
}

/**
 * Limpia el auth de Spotify del SharedContext
 */
export function clearSpotifyAuth(removeShared: (key: string) => void) {
    removeShared(SharedKeys.SPOTIFY_AUTH);
}
