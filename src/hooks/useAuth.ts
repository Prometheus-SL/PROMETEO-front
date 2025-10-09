import { useState } from "react";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";


export interface AuthUser {
    id: string;
    username: string;
    email: string;
    role: string;
    name: string;
    surname: string;
    lastLogin?: string;
}

export function useAuth() {
    const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
    const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(REFRESH_TOKEN_KEY));
    const [user, setUser] = useState<AuthUser | null>(() => {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const API_URL = import.meta.env.VITE_URL_BACKEND;

    const login = async (username: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Origin": "https://prometeo.miguelprez.es",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE"
                },
                body: JSON.stringify({ username, password }),
            });
            if (!res.ok) throw new Error("Credenciales incorrectas");
            const data = await res.json();
            // data: { user, tokens: { accessToken, refreshToken, expiresIn } }
            localStorage.setItem(ACCESS_TOKEN_KEY, data.data.tokens.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, data.data.tokens.refreshToken);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            setAccessToken(data.data.tokens.accessToken);
            setRefreshToken(data.data.tokens.refreshToken);
            setUser(data.data.user);
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
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Origin": "https://prometeo.miguelprez.es",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE"
                },
                body: JSON.stringify({ username, email, password, name, surname, birthday }),
            });
            if (!res.ok) throw new Error("Error al registrar usuario");
            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Error al registrar usuario");
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
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        window.location.replace("/login");
    };

    return { accessToken, refreshToken, user, login, logout, loading, error, register };
}
