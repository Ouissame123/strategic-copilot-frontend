import { API_CONFIG } from "@/config/api.config";
import { authStorage } from "@/lib/auth-storage";

type AuthContextWindow = {
    user?: { enterpriseId?: string | null; id?: string | null } | null;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const payload = token.split(".")[1];
        if (!payload) return null;
        return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function readTokenFromStorage(): string | null {
    return (
        authStorage.getAccessToken() ??
        localStorage.getItem("token")?.trim() ??
        localStorage.getItem("accessToken")?.trim() ??
        localStorage.getItem(API_CONFIG.ACCESS_TOKEN_KEY)?.trim() ??
        null
    );
}

/** enterprise_id : JWT → contexte auth → env dev (lowercase). */
export function getJwtEnterpriseId(): string | null {
    const token = readTokenFromStorage();
    if (token) {
        const payload = decodeJwtPayload(token);
        const raw = payload?.enterprise_id ?? payload?.enterpriseId ?? payload?.org_id;
        if (raw != null && String(raw).trim()) return String(raw).trim().toLowerCase();
    }

    try {
        const ctx = (window as Window & { __authContext?: AuthContextWindow }).__authContext?.user?.enterpriseId;
        if (ctx != null && String(ctx).trim()) return String(ctx).trim().toLowerCase();
    } catch {
        /* ignore */
    }

    const envFallback = (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined)?.trim();
    if (envFallback) return envFallback.toLowerCase();

    return null;
}

/** user_id : JWT `sub` / `user_id` → contexte auth. */
export function getJwtUserId(): string | null {
    const token = readTokenFromStorage();
    if (token) {
        const payload = decodeJwtPayload(token);
        const raw = payload?.sub ?? payload?.user_id ?? payload?.userId ?? payload?.id;
        if (raw != null && String(raw).trim()) return String(raw).trim();
    }

    try {
        const ctx = (window as Window & { __authContext?: AuthContextWindow }).__authContext?.user?.id;
        if (ctx != null && String(ctx).trim()) return String(ctx).trim();
    } catch {
        /* ignore */
    }

    return null;
}
