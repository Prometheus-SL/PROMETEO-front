import { ApiError, api, configureApi } from "@/lib/api";
import {
    ACCESS_TOKEN_KEY,
    getRefreshToken,
    setRefreshToken,
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
    avatarUrl?: string | null;
    avatarUpdatedAt?: string | null;
};

export type AuthResponse = {
    user: AuthUser;
    tokens?: Tokens;
    twoFactorRequired?: boolean;
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
            return "Password must be at least 12 characters long.";
        case "INVALID_TOTP_TOKEN":
            return "Invalid authentication code.";
        case "2FA_ALREADY_ENABLED":
            return "Two-factor authentication is already enabled.";
        case "2FA_NOT_SETUP":
            return "Start two-factor setup before confirming a code.";
        case "2FA_NOT_ENABLED":
            return "Two-factor authentication is not enabled.";
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
    async login(username: string, password: string, totpToken?: string) {
        return api.postData<AuthResponse>(
            "/auth/login",
            totpToken ? { username, password, totpToken } : { username, password },
            // credentials: para recibir la cookie HttpOnly del refresh token.
            { skipAuth: true, credentials: "include" }
        );
    },
    async register(payload: { username: string; email: string; password: string; name: string; surname: string; birthday: string; }) {
        return api.postData<{ user: AuthUser }>("/auth/register", payload, { skipAuth: true });
    },
    async refresh(): Promise<boolean> {
        try {
            // El refresh token viaja por la cookie HttpOnly (web); el de memoria es un
            // fallback de misma sesión. `credentials: include` envía/recibe la cookie.
            const data = await api.postData<Tokens>(
                "/auth/refresh",
                { refreshToken: getRefreshToken() ?? undefined },
                { skipAuth: true, retryOn401: false, credentials: "include" }
            );
            localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
            setRefreshToken(data.refreshToken);
            return true;
        } catch {
            return false;
        }
    },
    async logout() {
        await api.postData<null>(
            "/auth/logout",
            { refreshToken: getRefreshToken() ?? undefined },
            { retryOn401: false, credentials: "include" }
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
    async verifyEmail(token: string) {
        return api.postData<null>("/auth/verify-email", { token }, { skipAuth: true });
    },
    async requestPasswordReset(email: string) {
        return api.postData<null>("/auth/forgot-password", { email }, { skipAuth: true });
    },
    async resetPassword(token: string, password: string) {
        return api.postData<null>("/auth/reset-password", { token, password }, { skipAuth: true });
    },

    // --- 2FA / TOTP ---
    async setup2FA() {
        const data = await api.postData<{ secret: string; otpauthUri?: string; uri?: string }>("/auth/2fa/setup", {});
        return {
            secret: data.secret,
            otpauthUri: data.otpauthUri || data.uri || "",
        };
    },
    async confirm2FA(token: string) {
        return api.postData<{ recoveryCodes: string[] }>("/auth/2fa/confirm", { token });
    },
    async regenerateRecoveryCodes(token: string) {
        return api.postData<{ recoveryCodes: string[] }>("/auth/2fa/recovery-codes/regenerate", { token });
    },
    async disable2FA(token: string) {
        return api.postData<null>("/auth/2fa/disable", { token });
    },
    async get2FAStatus() {
        return api.getData<{ enabled: boolean; enabledAt?: string; recoveryCodesRemaining?: number }>("/auth/2fa/status");
    },

    // --- OAuth Login ---
    async getOAuthUrl(provider: "google" | "github" | "discord") {
        return api.postData<{ authorizeUrl: string }>(
            `/auth/oauth/${provider}/authorize`,
            {},
            { skipAuth: true }
        );
    },

    async getMe(accessToken: string) {
        return api.getData<{ user: AuthUser; session: { sessionId: string | null } }>(
            "/auth/me",
            { headers: { Authorization: `Bearer ${accessToken}` }, skipAuth: true }
        );
    },

    // --- Sessions ---
    async listSessions() {
        return api.getData<{ sessions: Session[] }>("/auth/sessions");
    },
    async revokeSession(sessionId: string) {
        return api.deleteData<null>(`/auth/sessions/${encodeURIComponent(sessionId)}`);
    },

    // --- Login history ---
    async getLoginHistory(params?: { page?: number; limit?: number }) {
        const q = new URLSearchParams();
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        const data = await api.getData<LoginHistoryResponse & { entries?: LoginHistoryEntry[] }>(
            `/auth/login-history${q.toString() ? `?${q}` : ""}`
        );
        return {
            ...data,
            history: data.history || data.entries || [],
        };
    },
};

export type Session = {
    _id?: string;
    sessionId?: string;
    createdAt: string;
    lastUsedAt?: string | null;
    userAgent?: string | null;
    ip?: string | null;
    current?: boolean;
};

export type LoginHistoryEntry = {
    _id: string;
    method: string;
    provider?: string | null;
    identifier?: string | null;
    success: boolean;
    ip?: string;
    userAgent?: string;
    createdAt: string;
    failureReason?: string;
};

export type LoginHistoryResponse = {
    history: LoginHistoryEntry[];
    pagination: { current: number; pages: number; total: number };
    retentionDays?: number;
};

configureApi({
    getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
    tryRefreshTokens: () => authService.refresh(),
});
