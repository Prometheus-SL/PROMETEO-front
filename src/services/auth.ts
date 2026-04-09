import { ApiError, api, configureApi } from "@/lib/api";

export const ACCESS_TOKEN_KEY = "auth_access_token";
export const REFRESH_TOKEN_KEY = "auth_refresh_token";
export const USER_KEY = "auth_user";

export type Tokens = {
    accessToken: string;
    refreshToken: string;
    sessionId?: string;
    expiresIn?: number | null;
};

export type AuthUser = {
    id: string;
    username: string;
    email: string;
    role: string;
    name?: string;
    surname?: string;
    lastLogin?: string;
    birthday?: string;
};

type ApiSuccess<T> = {
    success: true;
    data: T;
};

type ApiFailure = {
    success: false;
    error?: string;
    message?: string;
    details?: unknown;
};

type AuthResponse = ApiSuccess<{ user: AuthUser; tokens: Tokens }> | ApiFailure;

function getApiErrorMessage(response: ApiFailure | null | undefined, fallback: string) {
    if (Array.isArray(response?.details)) {
        const detailMessage = response.details
            .map((item) => {
                if (typeof item === "string") return item.trim();
                if (item && typeof item === "object" && typeof (item as { message?: unknown }).message === "string") {
                    return ((item as { message: string }).message).trim();
                }
                return "";
            })
            .filter(Boolean)
            .join(" ");

        if (detailMessage) {
            return detailMessage;
        }
    }

    if (typeof response?.details === "string" && response.details.trim()) {
        return response.details.trim();
    }

    return response?.error || response?.message || fallback;
}

function normalizeErrorText(value: string) {
    return value.trim().toLowerCase();
}

function mapFriendlyAuthError(message: string, status?: number, fallback?: string) {
    const normalized = normalizeErrorText(message);

    if (
        normalized === "failed to fetch" ||
        normalized.includes("networkerror") ||
        normalized.includes("load failed")
    ) {
        return "No se pudo conectar con el servidor. Revisa tu conexion e intentalo de nuevo.";
    }

    if (status === 429 || normalized.includes("demasiados intentos")) {
        return message || "Has superado el limite de intentos. Espera un poco antes de volver a probar.";
    }

    if (
        status === 401 ||
        normalized === "unauthorized" ||
        normalized.includes("credenciales inv")
    ) {
        return "El email o usuario y la contrasena no coinciden.";
    }

    if (normalized.includes("usuario y contras") && normalized.includes("requer")) {
        return "Introduce tu email o usuario y tu contrasena.";
    }

    if (normalized.includes("usuario, email y contras") && normalized.includes("requer")) {
        return "Completa usuario, email y contrasena para crear la cuenta.";
    }

    if (status === 409 && normalized.includes("email ya existe")) {
        return "Ese email ya esta registrado.";
    }

    if (status === 409 && normalized.includes("usuario ya existe")) {
        return "Ese nombre de usuario ya esta en uso.";
    }

    if (status === 409 && normalized.includes("usuario y email ya existen")) {
        return "Ese usuario y ese email ya estan en uso.";
    }

    if (status === 409 || normalized.includes("usuario o email ya existe")) {
        return "Ese usuario o email ya esta en uso.";
    }

    if (normalized.includes("email inv")) {
        return "Introduce un email valido.";
    }

    if (
        normalized.includes("password debe tener al menos 6") ||
        normalized.includes("contras") && normalized.includes("al menos 6")
    ) {
        return "La contrasena debe tener al menos 6 caracteres.";
    }

    if (status === 500 || normalized.includes("error interno")) {
        return "Ahora mismo no pudimos completar la solicitud. Intentalo de nuevo en un momento.";
    }

    return message || fallback || "Se ha producido un error inesperado.";
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
        return "No se pudo conectar con el servidor. Revisa tu conexion e intentalo de nuevo.";
    }

    if (error instanceof ApiError) {
        const payload =
            error.details && typeof error.details === "object"
                ? (error.details as ApiFailure)
                : null;
        const message = getApiErrorMessage(payload, error.message || fallback);
        return mapFriendlyAuthError(message, error.status, fallback);
    }

    if (error instanceof Error) {
        return mapFriendlyAuthError(error.message, undefined, fallback);
    }

    return fallback;
}

export const authService = {
    async login(username: string, password: string) {
        const res = await api.post<AuthResponse>("/auth/login", { username, password }, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "Credenciales incorrectas");
            throw new Error(msg);
        }
        return (res as ApiSuccess<{ user: AuthUser; tokens: Tokens }>).data;
    },
    async register(payload: { username: string; email: string; password: string; name: string; surname: string; birthday: string; }) {
        const res = await api.post<ApiSuccess<unknown> | ApiFailure>("/auth/register", payload, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "Error al registrar usuario");
            throw new Error(msg);
        }
        return res;
    },
    async refresh(): Promise<boolean> {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) return false;
        try {
            const res = await api.post<ApiSuccess<Tokens> | ApiFailure>(
                "/auth/refresh",
                { refreshToken },
                { skipAuth: true, retryOn401: false }
            );
            if (!res || ("success" in res && !res.success)) return false;
            const data = (res as ApiSuccess<Tokens>).data;
            localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
            return true;
        } catch {
            return false;
        }
    },
    async logout(refreshToken?: string) {
        await api.post<ApiSuccess<{ message: string }> | ApiFailure>(
            "/auth/logout",
            refreshToken ? { refreshToken } : {},
            { retryOn401: false }
        );
    },
    async generateQRCode() {
        const res = await api.post<ApiSuccess<{ code: string; expiresAt: string }> | ApiFailure>("/auth/qr/generate", {}, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "Error generando código QR");
            throw new Error(msg);
        }
        return (res as ApiSuccess<{ code: string; expiresAt: string }>).data;
    },
    async checkQRStatus(code: string) {
        const res = await api.get<ApiSuccess<{ status: string; scannedAt?: string; authenticatedAt?: string; user?: AuthUser; tokens?: Tokens }> | ApiFailure>(`/auth/qr/status/${code}`, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "Error verificando estado del QR");
            throw new Error(msg);
        }
        return (res as ApiSuccess<{ status: string; scannedAt?: string; authenticatedAt?: string; user?: AuthUser; tokens?: Tokens }>).data;
    },
    async scanQRCode(code: string) {
        const res = await api.post<ApiSuccess<{ message: string }> | ApiFailure>("/auth/qr/scan", { code }, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "Error escaneando código QR");
            throw new Error(msg);
        }
        return (res as ApiSuccess<{ message: string }>).data;
    },
    async authenticateWithQR(code: string, username: string, password: string) {
        const res = await api.post<AuthResponse>("/auth/qr/authenticate", { code, username, password }, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = getApiErrorMessage(res as ApiFailure, "Credenciales incorrectas");
            throw new Error(msg);
        }
        return (res as ApiSuccess<{ user: AuthUser; tokens: Tokens }>).data;
    },
};

// Conectar el cliente API con métodos de tokens del storage
configureApi({
    getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
    tryRefreshTokens: () => authService.refresh(),
});
