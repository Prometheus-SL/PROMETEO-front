export const ACCESS_TOKEN_KEY = "auth_access_token";
export const REFRESH_TOKEN_KEY = "auth_refresh_token"; // legacy: el refresh ya no se persiste aquí
export const USER_KEY = "auth_user";

// El refresh token YA NO se guarda en localStorage (un XSS podría robarlo). Vive solo en
// memoria (se pierde al recargar) y la sesión web sobrevive a recargas mediante la cookie
// HttpOnly que pone el backend. El kiosko usa token de larga duración (no refresca).
let refreshTokenMemory: string | null = null;

export function getRefreshToken(): string | null {
  return refreshTokenMemory;
}

export function setRefreshToken(token: string | null): void {
  refreshTokenMemory = token;
  // Limpia cualquier refresh token heredado de versiones anteriores.
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // no-op (entornos sin localStorage)
  }
}
