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
    provider?: string;
    sourceAppName?: string;
    canonicalUrl?: string;
    timestamp?: number;
    duration?: number;
}

// Helpers tipados (opcional, para mejorar DX)
export const SharedKeys = {
    MEDIA_SESSION: "mediaSession",
} as const;
