import { useCallback, useState } from "react";
import {
    authService,
    getAuthErrorMessage,
    type AuthUser,
    type Tokens
} from "@/services/auth";
import {
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    USER_KEY,
} from "@/services/auth-storage";

export function useAuth() {
    const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
    const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(REFRESH_TOKEN_KEY));
    const [user, setUser] = useState<AuthUser | null>(() => {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);

    const persistSession = (tokens: Tokens, userData: AuthUser) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);
        setUser(userData);
    };

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const performLogin = async (username: string, password: string, totpToken?: string) => {
        const data = await authService.login(username, password, totpToken);
        if (data.twoFactorRequired || !data.tokens) {
            setTwoFactorRequired(true);
            return;
        }

        setTwoFactorRequired(false);
        persistSession(data.tokens, data.user);
    };

    const login = async (username: string, password: string, totpToken?: string) => {
        setLoading(true);
        setError(null);
        try {
            await performLogin(username, password, totpToken);
        } catch (e: unknown) {
            setError(getAuthErrorMessage(e, "Could not sign in."));
        } finally {
            setLoading(false);
        }
    };

    const loginQR = async (tokens: Tokens, user: AuthUser) => {
        setLoading(true);
        setError(null);
        try {
            persistSession(tokens, user);
            setTwoFactorRequired(false);
        } catch (e: unknown) {
            setError(getAuthErrorMessage(e, "Could not sign in."));
        } finally {
            setLoading(false);
        }
    };

    const updateUser = (userData: AuthUser) => {
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
    };

    const register = async (username: string, email: string, password: string, name: string, surname: string, birthday: string) => {
        setLoading(true);
        setError(null);

        try {
            await authService.register({ username, email, password, name, surname, birthday });
        } catch (e: unknown) {
            setError(getAuthErrorMessage(e, "Could not create the account."));
            setLoading(false);
            return;
        }

        try {
            await performLogin(username, password);
        } catch {
            setError("The account was created, but we could not sign you in automatically. Please try from the login page.");
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        void authService.logout(refreshToken || undefined);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        setTwoFactorRequired(false);
        window.location.replace("/login");
    };

    return { accessToken, refreshToken, user, login, logout, loading, error, register, loginQR, updateUser, clearError, twoFactorRequired };
}
