import { useState } from "react";
import { authService, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, type AuthUser, type Tokens } from "@/services/auth";

export function useAuth() {
    const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
    const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(REFRESH_TOKEN_KEY));
    const [user, setUser] = useState<AuthUser | null>(() => {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async (username: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authService.login(username, password);
            localStorage.setItem(ACCESS_TOKEN_KEY, data.tokens.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            setAccessToken(data.tokens.accessToken);
            setRefreshToken(data.tokens.refreshToken);
            setUser(data.user);
        } catch (e: unknown) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("Error de autenticación");
            }
        } finally {
            setLoading(false);
        }
    };

    const loginQR = async (tokens: Tokens, user: AuthUser) => {
        setLoading(true);
        setError(null);
        try {
            localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            setAccessToken(tokens.accessToken);
            setRefreshToken(tokens.refreshToken);
            setUser(user);
        } catch (e: unknown) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("Error de autenticación");
            }
        } finally {
            setLoading(false);
        }
    };

    const register = async (username: string, email: string, password: string, name: string, surname: string, birthday: string) => {
        setLoading(true);
        setError(null);
        try {
            await authService.register({ username, email, password, name, surname, birthday });
            await login(username, password);
        } catch (e: unknown) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("Error de registro");
            }
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
        window.location.replace("/login");
    };

    return { accessToken, refreshToken, user, login, logout, loading, error, register, loginQR };
}
