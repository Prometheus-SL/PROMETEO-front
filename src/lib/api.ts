import {
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    USER_KEY,
} from "@/services/auth-storage";

export const API_URL = import.meta.env.VITE_URL_BACKEND as string;

export type ApiSuccessEnvelope<T> = {
    success: true;
    data: T;
    message?: string;
    meta?: unknown;
};

export type ApiFailureShape<T = unknown> = {
    code?: string;
    message?: string;
    details?: T;
};

export type ApiFailureEnvelope<T = unknown> = {
    success: false;
    error?: ApiFailureShape<T> | string;
    message?: string;
    details?: T;
    meta?: unknown;
};

export type ApiEnvelope<T, TDetails = unknown> = ApiSuccessEnvelope<T> | ApiFailureEnvelope<TDetails>;

export class ApiError<T = unknown> extends Error {
    status: number;
    code?: string;
    details?: T;
    meta?: unknown;

    constructor(message: string, status: number, options: { code?: string; details?: T; meta?: unknown } = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = options.code;
        this.details = options.details;
        this.meta = options.meta;
    }
}

let getAccessToken: (() => string | null) | null = null;
let tryRefreshTokens: (() => Promise<boolean>) | null = null;
let _refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_WINDOW_MS = 60_000;
let _refreshWindowStart = 0;

export function configureApi(options: {
    getAccessToken?: () => string | null;
    tryRefreshTokens?: () => Promise<boolean>;
}) {
    if (options.getAccessToken) getAccessToken = options.getAccessToken;
    if (options.tryRefreshTokens) tryRefreshTokens = options.tryRefreshTokens;
}

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
    headers?: HeadersInit;
    data?: unknown;
    formData?: FormData;
    asText?: boolean;
    skipAuth?: boolean;
    retryOn401?: boolean;
    baseUrl?: string;
};

type RequestDataOptions = Omit<RequestOptions, "asText">;

function isJsonContent(headers: Headers) {
    const ct = headers.get("Content-Type") || headers.get("content-type");
    return ct ? ct.includes("application/json") : false;
}

async function parseResponse<T>(res: Response, asText?: boolean): Promise<T> {
    if (res.status === 204) return undefined as unknown as T;
    if (asText) return (await res.text()) as unknown as T;
    if (isJsonContent(res.headers)) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
}

function normalizeApiFailure(payload: unknown, fallback: string) {
    if (typeof payload === "string" && payload.trim()) {
        return {
            message: payload.trim(),
            code: undefined,
            details: undefined,
            meta: undefined,
        };
    }

    if (!payload || typeof payload !== "object") {
        return {
            message: fallback,
            code: undefined,
            details: undefined,
            meta: undefined,
        };
    }

    const data = payload as Record<string, unknown>;
    const errorValue = data.error;
    const errorObject = errorValue && typeof errorValue === "object" ? (errorValue as Record<string, unknown>) : null;

    const message =
        (typeof errorObject?.message === "string" && errorObject.message.trim()) ||
        (typeof data.message === "string" && data.message.trim()) ||
        (typeof errorValue === "string" && errorValue.trim()) ||
        (typeof data.detail === "string" && data.detail.trim()) ||
        fallback;

    return {
        message,
        code:
            (typeof errorObject?.code === "string" && errorObject.code) ||
            (typeof data.code === "string" && data.code) ||
            undefined,
        details:
            errorObject?.details !== undefined
                ? errorObject.details
                : data.details,
        meta: data.meta,
    };
}

function buildHeaders(init?: HeadersInit, token?: string | null): Headers {
    const headers = new Headers(init);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
    return Boolean(payload) && typeof payload === "object" && "success" in (payload as Record<string, unknown>);
}

export function unwrapApiData<T>(payload: ApiEnvelope<T> | T): T {
    if (!isApiEnvelope<T>(payload)) {
        return payload as T;
    }

    if (payload.success) {
        return payload.data;
    }

    const failure = normalizeApiFailure(payload, "Unexpected API error");
    throw new ApiError(failure.message, 500, {
        code: failure.code,
        details: failure.details,
        meta: failure.meta,
    });
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
        finalHeaders.delete("Content-Type");
    }

    const body: BodyInit | undefined = isFormData
        ? formData
        : data !== undefined
            ? finalHeaders.get("Content-Type") !== "application/json"
                ? (data as BodyInit)
                : JSON.stringify(data)
            : undefined;

    const res = await fetch(`${baseUrl}${endpoint}`, {
        ...rest,
        headers: finalHeaders,
        body,
    } as RequestInit);

    if (res.ok) {
        return parseResponse<T>(res, asText);
    }

    if (res.status === 401 && !skipAuth && retryOn401 && tryRefreshTokens) {
        const now = Date.now();
        if (now - _refreshWindowStart > REFRESH_WINDOW_MS) {
            _refreshAttempts = 0;
            _refreshWindowStart = now;
        }

        if (_refreshAttempts < MAX_REFRESH_ATTEMPTS) {
            _refreshAttempts++;
            const refreshed = await tryRefreshTokens();
            if (refreshed) {
                return request<T>(endpoint, { ...options, retryOn401: false });
            }
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

        const target = window.location.pathname.startsWith("/client") ? "/client" : "/login";
        if (window.location.pathname !== target) {
            window.location.replace(target);
        }
    }

    const failure = normalizeApiFailure(errData, res.statusText || `Error ${res.status}`);
    throw new ApiError(failure.message, res.status, {
        code: failure.code,
        details: failure.details,
        meta: failure.meta,
    });
}

async function requestData<T>(endpoint: string, options: RequestDataOptions = {}) {
    const payload = await request<ApiEnvelope<T> | T>(endpoint, options);
    return unwrapApiData<T>(payload);
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
    getData: <T>(endpoint: string, options?: Omit<RequestDataOptions, "method" | "body">) =>
        requestData<T>(endpoint, { ...options, method: "GET" }),
    postData: <T>(endpoint: string, data?: unknown, options?: Omit<RequestDataOptions, "method" | "data">) =>
        requestData<T>(endpoint, { ...options, method: "POST", data }),
    putData: <T>(endpoint: string, data?: unknown, options?: Omit<RequestDataOptions, "method" | "data">) =>
        requestData<T>(endpoint, { ...options, method: "PUT", data }),
    patchData: <T>(endpoint: string, data?: unknown, options?: Omit<RequestDataOptions, "method" | "data">) =>
        requestData<T>(endpoint, { ...options, method: "PATCH", data }),
    deleteData: <T>(endpoint: string, options?: Omit<RequestDataOptions, "method" | "body">) =>
        requestData<T>(endpoint, { ...options, method: "DELETE" }),
};

export function isSafeExternalUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== "string") return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
        return false;
    }
}
