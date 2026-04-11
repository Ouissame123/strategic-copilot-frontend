/**
 * Client HTTP central : Bearer automatique, refresh sur 401, retry une fois.
 */
import { backendApi } from "@/config/backend-api";
import { getStoredRefreshToken, setStoredRefreshToken } from "@/utils/session-tokens";
import { getApiAuthToken, setApiAuthToken } from "@/utils/apiClient";
import { ApiError } from "@/api/errors";

const DEFAULT_TIMEOUT_MS = 15000;

export { ApiError } from "@/api/errors";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface HttpRequestOptions {
    timeout?: number;
    signal?: AbortSignal;
    skipAuth?: boolean;
    retryOn401?: boolean;
}

let authFailureHandler: (() => void) | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setOnAuthFailure(handler: (() => void) | null) {
    authFailureHandler = handler;
}

function clearSession() {
    setApiAuthToken(null);
    setStoredRefreshToken(null);
    authFailureHandler?.();
}

async function parseResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text.trim()) return {} as T;
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new ApiError("Réponse JSON invalide", response.status, text);
    }
}

async function callRefresh(): Promise<boolean> {
    const rt = getStoredRefreshToken();
    if (!rt) return false;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
        const res = await fetch(backendApi.refresh, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ refreshToken: rt }),
            credentials: "include",
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) return false;
        const data = (await parseResponse<Record<string, unknown>>(res)) ?? {};
        const access =
            typeof data.accessToken === "string"
                ? data.accessToken
                : typeof data.access_token === "string"
                  ? data.access_token
                  : null;
        const nextRt =
            typeof data.refreshToken === "string"
                ? data.refreshToken
                : typeof data.refresh_token === "string"
                  ? data.refresh_token
                  : null;
        if (!access?.trim()) return false;
        setApiAuthToken(access.trim());
        if (nextRt?.trim()) setStoredRefreshToken(nextRt.trim());
        return true;
    } catch {
        return false;
    }
}

async function ensureRefreshed(): Promise<boolean> {
    if (!refreshPromise) {
        refreshPromise = callRefresh().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

function buildHeaders(skipAuth: boolean, hasJsonBody: boolean): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (hasJsonBody) headers["Content-Type"] = "application/json";
    if (!skipAuth) {
        const t = getApiAuthToken();
        if (t) headers.Authorization = `Bearer ${t}`;
    }
    return headers;
}

/** Combine un signal utilisateur et le timeout (sans AbortSignal.any, pour cibles ES2020). */
function mergeAbortSignals(userSignal: AbortSignal | undefined, timeoutSignal: AbortSignal): AbortSignal {
    if (!userSignal) return timeoutSignal;
    const merged = new AbortController();
    const abort = () => {
        if (!merged.signal.aborted) merged.abort();
    };
    if (userSignal.aborted || timeoutSignal.aborted) {
        abort();
        return merged.signal;
    }
    userSignal.addEventListener("abort", abort);
    timeoutSignal.addEventListener("abort", abort);
    return merged.signal;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const signal = mergeAbortSignals(init.signal ?? undefined, controller.signal);
    try {
        return await fetch(url, { ...init, signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function httpRequest<T>(
    url: string,
    method: HttpMethod,
    options: HttpRequestOptions & { body?: unknown } = {},
): Promise<T> {
    const { timeout = DEFAULT_TIMEOUT_MS, signal, skipAuth = false, retryOn401 = !skipAuth, body } = options;
    const hasBody = body !== undefined && method !== "GET" && method !== "DELETE";

    const doOnce = async (): Promise<Response> => {
        return fetchWithTimeout(
            url,
            {
                method,
                headers: buildHeaders(skipAuth, hasBody),
                body: hasBody ? JSON.stringify(body) : undefined,
                credentials: "include",
                signal,
            },
            timeout,
        );
    };

    try {
        let response = await doOnce();

        if (response.status === 401 && retryOn401) {
            const ok = await ensureRefreshed();
            if (ok) {
                response = await doOnce();
            } else {
                clearSession();
                throw new ApiError("Session expirée. Veuillez vous reconnecter.", 401);
            }
        }

        if (!response.ok) {
            let payload: unknown;
            try {
                payload = await response.json();
            } catch {
                payload = await response.text();
            }
            throw new ApiError(`Request failed: ${response.status} ${response.statusText}`, response.status, payload);
        }

        return parseResponse<T>(response);
    } catch (err) {
        if (err instanceof ApiError) throw err;
        if (err instanceof Error) {
            if (err.name === "AbortError") throw new ApiError("Délai dépassé", 408);
            throw new ApiError(err.message);
        }
        throw new ApiError("Erreur inconnue");
    }
}

export async function httpGet<T>(url: string, opts?: HttpRequestOptions): Promise<T> {
    return httpRequest<T>(url, "GET", { ...opts });
}

export async function httpPost<T>(url: string, body: unknown, opts?: HttpRequestOptions): Promise<T> {
    return httpRequest<T>(url, "POST", { ...opts, body });
}

export async function httpPatch<T>(url: string, body: unknown, opts?: HttpRequestOptions): Promise<T> {
    return httpRequest<T>(url, "PATCH", { ...opts, body });
}
