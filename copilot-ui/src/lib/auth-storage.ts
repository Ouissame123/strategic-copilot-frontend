import { API_CONFIG } from "../config/api.config";

function readAccessTokenRaw(): string | null {
    const primary = localStorage.getItem(API_CONFIG.ACCESS_TOKEN_KEY)?.trim();
    if (primary) return primary;
    const camel = localStorage.getItem("accessToken")?.trim();
    if (camel) return camel;
    const generic = localStorage.getItem("token")?.trim();
    return generic || null;
}

export const authStorage = {
    getAccessToken(): string | null {
        return readAccessTokenRaw();
    },
    getRefreshToken(): string | null {
        return localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY)?.trim() || null;
    },
    /** Persiste uniquement l’access token (ex. login sans refresh immédiat) — requis pour l’intercepteur Axios. */
    setAccessToken(accessToken: string) {
        localStorage.setItem(API_CONFIG.ACCESS_TOKEN_KEY, accessToken.trim());
    },
    setTokens(accessToken: string, refreshToken: string) {
        localStorage.setItem(API_CONFIG.ACCESS_TOKEN_KEY, accessToken.trim());
        localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, refreshToken.trim());
    },
    clear() {
        localStorage.removeItem(API_CONFIG.ACCESS_TOKEN_KEY);
        localStorage.removeItem(API_CONFIG.REFRESH_TOKEN_KEY);
        localStorage.removeItem("accessToken");
    },
};
