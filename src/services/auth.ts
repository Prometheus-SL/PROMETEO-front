import { api, configureApi } from "@/lib/api";

export const ACCESS_TOKEN_KEY = "auth_access_token";
export const REFRESH_TOKEN_KEY = "auth_refresh_token";
export const USER_KEY = "auth_user";

export type Tokens = {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
};

export type AuthUser = {
    id: string;
    username: string;
    email: string;
    role: string;
    name: string;
    surname: string;
    lastLogin: string;
    birthday: string;
};

type ApiSuccess<T> = {
    success: true;
    data: T;
};

type ApiFailure = {
    success: false;
    message?: string;
};

type AuthResponse = ApiSuccess<{ user: AuthUser; tokens: Tokens }> | ApiFailure;

export const authService = {
    async login(username: string, password: string) {
        const res = await api.post<AuthResponse>("/auth/login", { username, password }, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "Credenciales incorrectas";
            throw new Error(msg);
        }
        return (res as ApiSuccess<{ user: AuthUser; tokens: Tokens }>).data;
    },
    async register(payload: { username: string; email: string; password: string; name: string; surname: string; birthday: string; }) {
        const res = await api.post<ApiSuccess<unknown> | ApiFailure>("/auth/register", payload, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "Error al registrar usuario";
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
    async generateQRCode() {
        const res = await api.post<ApiSuccess<{ code: string; expiresAt: string }> | ApiFailure>("/auth/qr/generate", {}, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "Error generando código QR";
            throw new Error(msg);
        }
        return (res as ApiSuccess<{ code: string; expiresAt: string }>).data;
    },
    async checkQRStatus(code: string) {
        const res = await api.get<ApiSuccess<{ status: string; scannedAt?: string; authenticatedAt?: string; user?: AuthUser; tokens?: Tokens }> | ApiFailure>(`/auth/qr/status/${code}`, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "Error verificando estado del QR";
            throw new Error(msg);
        }
        return (res as ApiSuccess<{ status: string; scannedAt?: string; authenticatedAt?: string; user?: AuthUser; tokens?: Tokens }>).data;
    },
    async scanQRCode(code: string) {
        const res = await api.post<ApiSuccess<{ message: string }> | ApiFailure>("/auth/qr/scan", { code }, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "Error escaneando código QR";
            throw new Error(msg);
        }
        return (res as ApiSuccess<{ message: string }>).data;
    },
    async authenticateWithQR(code: string, username: string, password: string) {
        const res = await api.post<AuthResponse>("/auth/qr/authenticate", { code, username, password }, { skipAuth: true });
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "Credenciales incorrectas";
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
