/**
 * Client API commun : timeout, gestion erreurs, corps de réponse lu une seule fois.
 * Pour requêtes avec refresh automatique sur 401, utiliser `httpRequest` / `httpGet` dans `@/api/api.ts`.
 */

import { ApiError } from "@/api/errors";

export { ApiError };

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

/** Timeout par défaut (ms). Surcharge : `VITE_HTTP_TIMEOUT_MS` (≥ 1000). */
export function getHttpTimeoutMs(): number {
    const raw = (import.meta.env.VITE_HTTP_TIMEOUT_MS as string | undefined)?.trim();
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 1000 ? n : 30000;
}

let authToken: string | null = null;

function isAbsoluteUrl(path: string): boolean {
    return /^https?:\/\//i.test(path);
}

function buildUrl(path: string): string {
    if (isAbsoluteUrl(path)) return path;
    if (!API_BASE_URL) return path;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
}

function getAuthHeaders(): Record<string, string> {
    if (!authToken) return {};
    return { Authorization: `Bearer ${authToken}` };
}

export function setApiAuthToken(token: string | null) {
    authToken = token?.trim() || null;
}

export function getApiAuthToken(): string | null {
    return authToken;
}

export interface ApiClientOptions {
    timeout?: number;
    signal?: AbortSignal;
    /** Désactive le retry automatique sur erreurs serveur 5xx (GET uniquement). */
    skipRetry?: boolean;
}

const SERVER_RETRY_MAX = 2;
const SERVER_RETRY_BASE_MS = 300;

function isRetryableServerStatus(status?: number): boolean {
    return status != null && status >= 500 && status <= 599;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withServerRetry<T>(run: () => Promise<T>, skipRetry?: boolean): Promise<T> {
    if (skipRetry) return run();
    let lastErr: unknown;
    for (let attempt = 0; attempt <= SERVER_RETRY_MAX; attempt++) {
        try {
            return await run();
        } catch (err) {
            lastErr = err;
            if (!(err instanceof ApiError) || !isRetryableServerStatus(err.status) || attempt >= SERVER_RETRY_MAX) {
                throw err;
            }
            await sleep(SERVER_RETRY_BASE_MS * 2 ** attempt);
        }
    }
    throw lastErr;
}

/** Lit le corps une seule fois ; JSON si possible, sinon erreur avec texte brut. */
async function parseSuccessBody<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text.trim()) return {} as T;
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new ApiError("Réponse JSON invalide", response.status, text);
    }
}

/** Erreur HTTP : un seul read du corps (évite « body stream already read »). */
async function parseErrorPayload(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text.trim()) return text;
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

function abortError(): ApiError {
    return new ApiError("Délai dépassé : le serveur n’a pas répondu à temps. Réessayez ou vérifiez n8n.", 408);
}

/** Combine annulation utilisateur (unmount) et timeout. */
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

async function apiGetOnce<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<T> {
    const { timeout = getHttpTimeoutMs(), signal } = options;
    const timeoutController = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
        timedOut = true;
        timeoutController.abort();
    }, timeout);
    const fetchSignal = mergeAbortSignals(signal, timeoutController.signal);

    try {
        const response = await fetch(buildUrl(path), {
            method: "GET",
            headers: { Accept: "application/json", ...getAuthHeaders() },
            signal: fetchSignal,
            credentials: "include",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const payload = await parseErrorPayload(response);
            throw new ApiError(`Échec ${response.status} ${response.statusText}`, response.status, payload);
        }

        return parseSuccessBody<T>(response);
    } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof ApiError) throw err;
        if (err instanceof Error && err.name === "AbortError") {
            if (timedOut) throw abortError();
            throw err;
        }
        if (err instanceof Error) throw new ApiError(err.message);
        throw new ApiError("Erreur inconnue");
    }
}

/** GET avec retry exponentiel sur erreurs 5xx (2 tentatives supplémentaires). */
export async function apiGet<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<T> {
    const { skipRetry, ...rest } = options;
    return withServerRetry(() => apiGetOnce<T>(path, rest), skipRetry);
}

export async function apiPost<T = unknown>(path: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
    const { timeout = getHttpTimeoutMs(), signal } = options;
    const timeoutController = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
        timedOut = true;
        timeoutController.abort();
    }, timeout);
    const fetchSignal = mergeAbortSignals(signal, timeoutController.signal);

    try {
        const response = await fetch(buildUrl(path), {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
            body: JSON.stringify(body),
            signal: fetchSignal,
            credentials: "include",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const payload = await parseErrorPayload(response);
            throw new ApiError(`Échec ${response.status} ${response.statusText}`, response.status, payload);
        }

        return parseSuccessBody<T>(response);
    } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof ApiError) throw err;
        if (err instanceof Error && err.name === "AbortError") {
            if (timedOut) throw abortError();
            throw err;
        }
        if (err instanceof Error) throw new ApiError(err.message);
        throw new ApiError("Erreur inconnue");
    }
}

async function apiRequestWithBody<T>(
    method: "PUT" | "PATCH" | "DELETE",
    path: string,
    body: unknown | undefined,
    options: ApiClientOptions = {},
): Promise<T> {
    const { timeout = getHttpTimeoutMs(), signal } = options;
    const timeoutController = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
        timedOut = true;
        timeoutController.abort();
    }, timeout);
    const fetchSignal = mergeAbortSignals(signal, timeoutController.signal);

    try {
        const response = await fetch(buildUrl(path), {
            method,
            headers:
                method === "DELETE" && (body === undefined || body === null)
                    ? { Accept: "application/json", ...getAuthHeaders() }
                    : { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
            body: method === "DELETE" && (body === undefined || body === null) ? undefined : JSON.stringify(body ?? {}),
            signal: fetchSignal,
            credentials: "include",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const payload = await parseErrorPayload(response);
            throw new ApiError(`Échec ${response.status} ${response.statusText}`, response.status, payload);
        }

        return parseSuccessBody<T>(response);
    } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof ApiError) throw err;
        if (err instanceof Error && err.name === "AbortError") {
            if (timedOut) throw abortError();
            throw err;
        }
        if (err instanceof Error) throw new ApiError(err.message);
        throw new ApiError("Erreur inconnue");
    }
}

export async function apiPut<T = unknown>(path: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
    return apiRequestWithBody<T>("PUT", path, body, options);
}

export async function apiPatch<T = unknown>(path: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
    return apiRequestWithBody<T>("PATCH", path, body, options);
}

export async function apiDelete<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<T> {
    return apiRequestWithBody<T>("DELETE", path, undefined, options);
}
