/**
 * Authentification : login, refresh, logout, /me + persistance des tokens.
 */
import { backendApi } from "@/config/backend-api";
import { ApiError } from "@/api/errors";
import { setApiAuthToken } from "@/utils/apiClient";
import { getStoredRefreshToken, setStoredRefreshToken } from "@/utils/session-tokens";
import { httpGet, httpPost, type HttpRequestOptions } from "@/api/api";

export interface AuthLoginBody {
    email: string;
    password: string;
}

function unwrapPayload(payload: unknown): unknown {
    if (!payload || typeof payload !== "object") return payload;
    const o = payload as Record<string, unknown>;
    if (o.data !== undefined && typeof o.data === "object") return o.data;
    return payload;
}

/** Extrait accessToken / refreshToken (camelCase ou snake_case, ou `token` en secours). */
export function persistTokensFromPayload(payload: unknown): boolean {
    const raw = unwrapPayload(payload);
    if (!raw || typeof raw !== "object") return false;
    const o = raw as Record<string, unknown>;
    const access =
        typeof o.accessToken === "string"
            ? o.accessToken
            : typeof o.access_token === "string"
              ? o.access_token
              : typeof o.token === "string"
                ? o.token
                : null;
    const refresh =
        typeof o.refreshToken === "string"
            ? o.refreshToken
            : typeof o.refresh_token === "string"
              ? o.refresh_token
              : null;
    if (!access?.trim()) return false;
    setApiAuthToken(access.trim());
    if (refresh?.trim()) setStoredRefreshToken(refresh.trim());
    return true;
}

export async function login(body: AuthLoginBody, opts?: HttpRequestOptions): Promise<unknown> {
    return httpPost<unknown>(backendApi.login, body, { ...opts, skipAuth: true });
}

export async function refresh(opts?: HttpRequestOptions): Promise<unknown> {
    const rt = getStoredRefreshToken();
    if (!rt?.trim()) throw new ApiError("Refresh token absent", 401);
    return httpPost<unknown>(backendApi.refresh, { refreshToken: rt }, { ...opts, skipAuth: true });
}

export async function logout(opts?: HttpRequestOptions): Promise<unknown> {
    const rt = getStoredRefreshToken();
    if (!rt?.trim()) return { success: true as const, message: "Déjà déconnecté" };
    return httpPost<unknown>(backendApi.logout, { refreshToken: rt }, opts);
}

export async function me(opts?: HttpRequestOptions): Promise<unknown> {
    return httpGet<unknown>(backendApi.me, opts);
}
