/**
 * Client API commun : timeout, retry, gestion erreurs.
 * Plus de fetch brut dans les composants.
 */

const DEFAULT_TIMEOUT_MS = 15000;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

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
}

import { ApiError } from "@/api/errors";

export { ApiError };

export async function apiGet<T = unknown>(
    path: string,
    options: ApiClientOptions = {},
): Promise<T> {
    const { timeout = DEFAULT_TIMEOUT_MS, signal } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const effectiveSignal = signal ?? controller.signal;

    try {
        const response = await fetch(buildUrl(path), {
            method: "GET",
            headers: { Accept: "application/json", ...getAuthHeaders() },
            signal: effectiveSignal,
            credentials: "include",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let payload: unknown;
            try {
                payload = await response.json();
            } catch {
                payload = await response.text();
            }
            throw new ApiError(
                `Request failed: ${response.status} ${response.statusText}`,
                response.status,
                payload,
            );
        }

        const text = await response.text();
        if (!text.trim()) return {} as T;
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new ApiError("Invalid JSON response", response.status, text);
        }
    } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof ApiError) throw err;
        if (err instanceof Error) {
            if (err.name === "AbortError") throw new ApiError("Request timeout", 408);
            throw new ApiError(err.message);
        }
        throw new ApiError("Unknown error");
    }
}

export async function apiPost<T = unknown>(
    path: string,
    body: unknown,
    options: ApiClientOptions = {},
): Promise<T> {
    const { timeout = DEFAULT_TIMEOUT_MS, signal } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const effectiveSignal = signal ?? controller.signal;

    try {
        const response = await fetch(buildUrl(path), {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
            body: JSON.stringify(body),
            signal: effectiveSignal,
            credentials: "include",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let payload: unknown;
            try {
                payload = await response.json();
            } catch {
                payload = await response.text();
            }
            throw new ApiError(
                `Request failed: ${response.status} ${response.statusText}`,
                response.status,
                payload,
            );
        }

        const text = await response.text();
        if (!text.trim()) return {} as T;
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new ApiError("Invalid JSON response", response.status, text);
        }
    } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof ApiError) throw err;
        if (err instanceof Error) {
            if (err.name === "AbortError") {
                throw new ApiError("Request timeout", 408);
            }
            throw new ApiError(err.message);
        }
        throw new ApiError("Unknown error");
    }
}

async function apiRequestWithBody<T>(
    method: "PUT" | "PATCH" | "DELETE",
    path: string,
    body: unknown | undefined,
    options: ApiClientOptions = {},
): Promise<T> {
    const { timeout = DEFAULT_TIMEOUT_MS, signal } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const effectiveSignal = signal ?? controller.signal;

    try {
        const response = await fetch(buildUrl(path), {
            method,
            headers:
                method === "DELETE" && (body === undefined || body === null)
                    ? { Accept: "application/json", ...getAuthHeaders() }
                    : { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
            body: method === "DELETE" && (body === undefined || body === null) ? undefined : JSON.stringify(body ?? {}),
            signal: effectiveSignal,
            credentials: "include",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let payload: unknown;
            try {
                payload = await response.json();
            } catch {
                payload = await response.text();
            }
            throw new ApiError(`Request failed: ${response.status} ${response.statusText}`, response.status, payload);
        }

        const text = await response.text();
        if (!text.trim()) return {} as T;
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new ApiError("Invalid JSON response", response.status, text);
        }
    } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof ApiError) throw err;
        if (err instanceof Error) {
            if (err.name === "AbortError") {
                throw new ApiError("Request timeout", 408);
            }
            throw new ApiError(err.message);
        }
        throw new ApiError("Unknown error");
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
