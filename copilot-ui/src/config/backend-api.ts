import { getN8nBaseUrl } from "../lib/build-n8n-url";

/**
 * Résolution des URLs API : webhooks n8n (URL complète par env) ou
 * `getN8nBaseUrl()` (`VITE_N8N_BASE_URL` / `VITE_API_BASE_URL`) + chemin relatif.
 */

function trimUrl(u: string | undefined): string {
    return (u ?? "").trim().replace(/\/$/, "");
}

function resolveUrl(explicit: string | undefined, relativePath: string): string {
    const e = trimUrl(explicit);
    const path = e && !/^https?:\/\//i.test(e) ? e : relativePath;
    const p = path.startsWith("/") ? path : `/${path}`;
    if (e && /^https?:\/\//i.test(e)) return e;
    const base = getN8nBaseUrl();
    return base ? `${base}${p}` : p;
}

function readEnv(name: string): string | undefined {
    const v = (import.meta.env as Record<string, string | undefined>)[name];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export const backendApi = {
    get login(): string {
        return resolveUrl(readEnv("VITE_API_LOGIN"), "/webhook/login");
    },
    get refresh(): string {
        return resolveUrl(readEnv("VITE_API_REFRESH"), "/webhook/refresh");
    },
    get logout(): string {
        return resolveUrl(readEnv("VITE_API_LOGOUT"), "/webhook/logout");
    },
    get me(): string {
        return resolveUrl(readEnv("VITE_API_ME"), "/webhook/auth/me");
    },
    /** POST changement de mot de passe (compte connecté). Corps typique : `{ currentPassword, newPassword }`. */
    get changePassword(): string {
        return resolveUrl(readEnv("VITE_API_CHANGE_PASSWORD"), "/webhook/auth/me/password");
    },
    /** GET liste (+ query) */
    get rhUsersList(): string {
        return resolveUrl(readEnv("VITE_API_RH_USERS_LIST"), "/rh/users");
    },
    /** POST création */
    get rhUsersCreate(): string {
        return resolveUrl(readEnv("VITE_API_RH_USERS_CREATE"), "/rh/users");
    },
    get rhUsersRole(): string {
        return resolveUrl(readEnv("VITE_API_RH_USERS_ROLE"), "/rh/users/role");
    },
    get rhUsersStatus(): string {
        return resolveUrl(readEnv("VITE_API_RH_USERS_STATUS"), "/rh/users/status");
    },
    rhUserPasswordReset(id: string): string {
        const base = trimUrl(readEnv("VITE_API_RH_USERS_PASSWORD_RESET_BASE"));
        if (base) {
            return `${base}/${encodeURIComponent(id)}/password-reset`;
        }
        return resolveUrl(undefined, `/rh/users/${encodeURIComponent(id)}/password-reset`);
    },
    get rhSessions(): string {
        return resolveUrl(readEnv("VITE_API_RH_SESSIONS"), "/rh/sessions");
    },
} as const;
