// Utilidades para el flujo de OAuth de Spotify

export const SPOTIFY_REDIRECT_URI = `${window.location.origin}/spotify-callback`;

export const SPOTIFY_SCOPES = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "user-read-recently-played",
];

/**
 * Genera la URL de autorización de Spotify
 */
export function getSpotifyAuthUrl(clientId: string): string {
    return `https://accounts.spotify.com/authorize?${new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: SPOTIFY_SCOPES.join(" "),
        show_dialog: "true",
    })}`;
}

/**
 * Intercambia el código de autorización por tokens de acceso
 */
export async function exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string
): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
}> {
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: SPOTIFY_REDIRECT_URI,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to exchange code: ${response.status}`);
    }

    return response.json();
}

/**
 * Refresca el access token usando el refresh token
 */
export async function refreshSpotifyToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
): Promise<{
    access_token: string;
    expires_in: number;
}> {
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

    if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.status}`);
    }

    return response.json();
}
