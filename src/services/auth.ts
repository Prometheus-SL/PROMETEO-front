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
};

// Conectar el cliente API con métodos de tokens del storage
configureApi({
    getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
    tryRefreshTokens: () => authService.refresh(),
});
