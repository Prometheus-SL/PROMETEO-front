const API_URL = import.meta.env.VITE_URL_BACKEND;
const TOKEN_KEY = "auth_token";

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        "Origin": "https://prometeo.miguelprez.es",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE"
    };
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });
    if (!res.ok) throw new Error("Error en la petición");
    return res.json();
}
