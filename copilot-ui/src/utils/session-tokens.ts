/** Refresh token : sessionStorage (meilleur compromis que localStorage pour XSS ; onglet fermé = effacé). */
const REFRESH_KEY = "strategic-copilot-refresh-token";

export function getStoredRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return sessionStorage.getItem(REFRESH_KEY);
    } catch {
        return null;
    }
}

export function setStoredRefreshToken(token: string | null): void {
    if (typeof window === "undefined") return;
    try {
        if (token?.trim()) sessionStorage.setItem(REFRESH_KEY, token.trim());
        else sessionStorage.removeItem(REFRESH_KEY);
    } catch {
        /* quota / private mode */
    }
}
