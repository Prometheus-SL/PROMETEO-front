// Cliente HTTP centralizado con soporte de token, reintento en 401 y errores tipados

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from "@/services/auth";

export const API_URL = import.meta.env.VITE_URL_BACKEND as string;

// Error tipado para peticiones API
export class ApiError<T = unknown> extends Error {
    status: number;
    details?: T;
    constructor(message: string, status: number, details?: T) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}

// Configuración inyectable (para evitar acoplarse al storage aquí)
let getAccessToken: (() => string | null) | null = null;
let tryRefreshTokens: (() => Promise<boolean>) | null = null;

export function configureApi(options: {
    getAccessToken?: () => string | null;
    tryRefreshTokens?: () => Promise<boolean>;
}) {
    if (options.getAccessToken) getAccessToken = options.getAccessToken;
    if (options.tryRefreshTokens) tryRefreshTokens = options.tryRefreshTokens;
}

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
    headers?: HeadersInit;
    data?: unknown; // Cuerpo JSON-serializable
    formData?: FormData; // Alternativa a data, para multipart/form-data
    asText?: boolean; // Forzar respuesta como texto
    skipAuth?: boolean; // Evita enviar Authorization aunque haya token
    retryOn401?: boolean; // Controla reintento automático tras refresh
    baseUrl?: string; // Permite sobreescribir base URL puntualmente
};

function isJsonContent(headers: Headers) {
    const ct = headers.get("Content-Type") || headers.get("content-type");
    return ct ? ct.includes("application/json") : false;
}

async function parseResponse<T>(res: Response, asText?: boolean): Promise<T> {
    if (res.status === 204) return undefined as unknown as T;
    if (asText) return (await res.text()) as unknown as T;
    if (isJsonContent(res.headers)) return (await res.json()) as T;
    // Si no es JSON, devolvemos texto
    return (await res.text()) as unknown as T;
}

function getErrorMessageFromPayload(payload: unknown, fallback: string) {
    if (typeof payload === "string" && payload.trim()) {
        return payload.trim();
    }

    if (!payload || typeof payload !== "object") {
        return fallback;
    }

    const data = payload as Record<string, unknown>;
    const details = data.details;
    const errors = data.errors;

    if (Array.isArray(errors)) {
        const firstError = errors.find(
            (item) => item && typeof item === "object" && typeof (item as { message?: unknown }).message === "string"
        ) as { message?: string } | undefined;

        if (firstError?.message?.trim()) {
            return firstError.message.trim();
        }
    }

    if (Array.isArray(details)) {
        const detailMessage = details
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

    if (typeof details === "string" && details.trim()) {
        return details.trim();
    }

    return (
        (typeof data.error === "string" && data.error.trim()) ||
        (typeof data.message === "string" && data.message.trim()) ||
        (typeof data.detail === "string" && data.detail.trim()) ||
        (typeof data.title === "string" && data.title.trim()) ||
        fallback
    );
}

function buildHeaders(init?: HeadersInit, token?: string | null): HeadersInit {
    const headers = new Headers(init);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    // Solo establecemos Content-Type si el body no es FormData (lo hace el navegador)
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
        asText = false,
        skipAuth = false,
        retryOn401 = true,
        baseUrl = API_URL,
        data,
        formData,
        headers,
        ...rest
    } = options;

    const token = !skipAuth && getAccessToken ? getAccessToken() : null;
    const isFormData = formData instanceof FormData;
    const finalHeaders = buildHeaders(headers, token);
    if (isFormData) {
        // Si es FormData, dejamos que el navegador gestione el boundary
        (finalHeaders as Headers).delete("Content-Type");
    }
    (finalHeaders as Headers).set("Access-Control-Allow-Origin", "*");
    (finalHeaders as Headers).set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    (finalHeaders as Headers).set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    const body: BodyInit | undefined = isFormData
        ? (formData as FormData)
        : data !== undefined
            ? (finalHeaders as Headers).has("Content-Type") && (finalHeaders as Headers).get("Content-Type") !== "application/json"
                ? (data as unknown as BodyInit)
                : (JSON.stringify(data) as unknown as BodyInit)
            : undefined;

    const res = await fetch(`${baseUrl}${endpoint}`, {
        ...rest,
        headers: finalHeaders,
        body,
    } as RequestInit);

    if (res.ok) return parseResponse<T>(res, asText);

    // Intento de refresh en 401
    if (res.status === 401 && !skipAuth && retryOn401 && tryRefreshTokens) {
        const refreshed = await tryRefreshTokens();
        if (refreshed) {
            return request<T>(endpoint, { ...options, retryOn401: false });
        }
    }

    let errData: unknown;

    try {
        errData = await parseResponse<unknown>(res);
    } catch {
        errData = undefined;
    }

    if (res.status === 401 && !skipAuth) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        const target = window.location.pathname.startsWith("/client")
            ? "/client"
            : "/login";

        if (window.location.pathname !== target) {
            window.location.replace(target);
        }
    }

    throw new ApiError(
        getErrorMessageFromPayload(errData, res.statusText || `Error ${res.status}`),
        res.status,
        errData
    );
};

export const api = {
    get: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
        request<T>(endpoint, { ...options, method: "GET" }),
    post: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, "method" | "data">) =>
        request<T>(endpoint, { ...options, method: "POST", data }),
    put: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, "method" | "data">) =>
        request<T>(endpoint, { ...options, method: "PUT", data }),
    patch: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, "method" | "data">) =>
        request<T>(endpoint, { ...options, method: "PATCH", data }),
    delete: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
        request<T>(endpoint, { ...options, method: "DELETE" }),
};

