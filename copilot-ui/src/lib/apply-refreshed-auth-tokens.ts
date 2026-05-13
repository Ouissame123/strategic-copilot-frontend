import { authStorage } from "@/lib/auth-storage";
import { setApiAuthToken } from "@/utils/apiClient";
import { getStoredRefreshToken, setStoredRefreshToken } from "@/utils/session-tokens";

function unwrapPayload(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== "object") return {};
    const o = payload as Record<string, unknown>;
    if (o.data !== undefined && typeof o.data === "object" && !Array.isArray(o.data)) {
        return o.data as Record<string, unknown>;
    }
    return o as Record<string, unknown>;
}

/**
 * Aligne Bearer mémoire (`apiClient`), refresh sessionStorage et couple access/refresh localStorage
 * après une réponse `/refresh` (Axios ou fetch). Évite la désynchronisation qui provoquait des 401
 * en cascade puis `clearSession` au changement de page.
 */
export function applyRefreshedAuthTokens(payload: unknown): string | null {
    const o = unwrapPayload(payload);
    const access =
        (typeof o.accessToken === "string" ? o.accessToken : null) ??
        (typeof o.access_token === "string" ? o.access_token : null);
    const nextRt =
        (typeof o.refreshToken === "string" ? o.refreshToken : null) ??
        (typeof o.refresh_token === "string" ? o.refresh_token : null);
    if (!access?.trim()) return null;
    const refreshToUse =
        nextRt?.trim() ||
        authStorage.getRefreshToken()?.trim() ||
        getStoredRefreshToken()?.trim() ||
        "";
    if (!refreshToUse) return null;
    const a = access.trim();
    const r = refreshToUse.trim();
    setApiAuthToken(a);
    setStoredRefreshToken(r);
    authStorage.setTokens(a, r);
    return a;
}
