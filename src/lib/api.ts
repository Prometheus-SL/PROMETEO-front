// Cliente HTTP centralizado con soporte de token, reintento en 401 y errores tipados

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
    if (res.status === 401 && retryOn401 && tryRefreshTokens) {
        const refreshed = await tryRefreshTokens();
        if (refreshed) {
            return request<T>(endpoint, { ...options, retryOn401: false });
        }
    }

    // Construimos ApiError con el mejor mensaje disponible
    try {
        const errData = await parseResponse<unknown>(res);
        let message: string = res.statusText || `Error ${res.status}`;

        if (typeof errData === "string") {
            message = errData;
        } else if (errData && typeof errData === "object") {
            const obj = errData as Record<string, unknown>;
            message =
                (typeof obj.error === "string" && obj.error) ||
                (Array.isArray(obj.errors) && typeof obj.errors[0]?.message === "string" && obj.errors[0].message) ||
                (typeof obj.detail === "string" && obj.detail) ||
                (typeof obj.title === "string" && obj.title);

        }
        throw new ApiError(message, res.status, errData);
    } catch {
        throw new ApiError(res.statusText || `Error ${res.status}`, res.status);
    }
}

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

