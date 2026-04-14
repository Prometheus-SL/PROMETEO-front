import { ApiError, api, configureApi } from "@/lib/api";
import {
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
} from "@/services/auth-storage";

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

type AuthResponse = {
    user: AuthUser;
    tokens: Tokens;
};

function normalizeErrorText(value: string) {
    return value.trim().toLowerCase();
}

function mapFriendlyAuthError(error: { code?: string; message: string; status?: number }, fallback?: string) {
    const normalized = normalizeErrorText(error.message);

    if (
        normalized === "failed to fetch" ||
        normalized.includes("networkerror") ||
        normalized.includes("load failed")
    ) {
        return "Could not connect to the server. Check your connection and try again.";
    }

    switch (error.code) {
        case "RATE_LIMIT_EXCEEDED":
            return "Too many attempts. Please wait a moment before trying again.";
        case "INVALID_CREDENTIALS":
            return "The username/email and password do not match.";
        case "LOGIN_FIELDS_REQUIRED":
            return "Enter your username or email and your password.";
        case "REGISTER_FIELDS_REQUIRED":
            return "Complete username, email, and password to create the account.";
        case "PASSWORD_TOO_SHORT":
            return "Password must be at least 6 characters long.";
        case "USER_ALREADY_EXISTS":
            return "That username or email is already in use.";
        case "USER_INACTIVE":
            return "This account is inactive.";
        case "SESSION_REVOKED":
        case "SESSION_NOT_ACTIVE":
            return "Your session is no longer active. Please sign in again.";
        case "QR_CODE_REQUIRED":
            return "A QR code is required.";
        case "QR_CODE_NOT_FOUND":
            return "The QR code was not found or has expired.";
        case "QR_CODE_NOT_PENDING":
        case "QR_CODE_NOT_SCANNED":
            return "This QR code can no longer be used.";
        case "QR_AUTH_FIELDS_REQUIRED":
            return "QR code, username/email, and password are required.";
        default:
            break;
    }

    if (error.status === 429) {
        return "Too many attempts. Please wait a moment before trying again.";
    }

    if (error.status === 500 || normalized.includes("internal server error")) {
        return "We could not complete the request right now. Please try again in a moment.";
    }

    return error.message || fallback || "An unexpected error occurred.";
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
        return "Could not connect to the server. Check your connection and try again.";
    }

    if (error instanceof ApiError) {
        return mapFriendlyAuthError(
            {
                code: error.code,
                message: error.message || fallback,
                status: error.status,
            },
            fallback
        );
    }

    if (error instanceof Error) {
        return mapFriendlyAuthError({ message: error.message }, fallback);
    }

    return fallback;
}

export const authService = {
    async login(username: string, password: string) {
        return api.postData<AuthResponse>("/auth/login", { username, password }, { skipAuth: true });
    },
    async register(payload: { username: string; email: string; password: string; name: string; surname: string; birthday: string; }) {
        return api.postData<{ user: AuthUser }>("/auth/register", payload, { skipAuth: true });
    },
    async refresh(): Promise<boolean> {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) return false;

        try {
            const data = await api.postData<Tokens>(
                "/auth/refresh",
                { refreshToken },
                { skipAuth: true, retryOn401: false }
            );
            localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
            return true;
        } catch {
            return false;
        }
    },
    async logout(refreshToken?: string) {
        await api.postData<null>(
            "/auth/logout",
            refreshToken ? { refreshToken } : {},
            { retryOn401: false }
        );
    },
    async generateQRCode() {
        return api.postData<{ code: string; expiresAt: string }>("/auth/qr/generate", {}, { skipAuth: true });
    },
    async checkQRStatus(code: string) {
        return api.getData<{ status: string; scannedAt?: string; authenticatedAt?: string; user?: AuthUser; tokens?: Tokens }>(
            `/auth/qr/status/${code}`,
            { skipAuth: true }
        );
    },
    async scanQRCode(code: string) {
        return api.postData<null>("/auth/qr/scan", { code }, { skipAuth: true });
    },
    async authenticateWithQR(code: string, username: string, password: string) {
        return api.postData<AuthResponse>(
            "/auth/qr/authenticate",
            { code, username, password },
            { skipAuth: true }
        );
    },
};

configureApi({
    getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
    tryRefreshTokens: () => authService.refresh(),
});
