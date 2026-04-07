/**
 * Tipos comunes para el contexto compartido entre widgets
 */

export interface MediaSession {
    title: string;
    artist: string;
    album?: string;
    artwork?: string;
    isPlaying: boolean;
    source: string; // 'spotify', 'youtube', etc.
    timestamp?: number;
    duration?: number;
}

export interface SpotifyAuth {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    userId?: string;
}

// Helpers tipados (opcional, para mejorar DX)
export const SharedKeys = {
    MEDIA_SESSION: "mediaSession",
    SPOTIFY_AUTH: "spotify.auth",
    SPOTIFY_CURRENT_TRACK: "spotify.currentTrack",
} as const;
