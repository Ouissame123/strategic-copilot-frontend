/**
 * Résolution des URLs API : webhooks n8n (URL complète par env) ou
 * `VITE_API_BASE_URL` + chemin relatif (mode simple).
 */

function trimUrl(u: string | undefined): string {
    return (u ?? "").trim().replace(/\/$/, "");
}

function resolveUrl(explicit: string | undefined, relativePath: string): string {
    const e = trimUrl(explicit);
    if (e) return e;
    const base = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    const p = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
    return base ? `${base}${p}` : relativePath;
}

function readEnv(name: string): string | undefined {
    const v = (import.meta.env as Record<string, string | undefined>)[name];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export const backendApi = {
    get login(): string {
        return resolveUrl(readEnv("VITE_API_LOGIN"), "/login");
    },
    get refresh(): string {
        return resolveUrl(readEnv("VITE_API_REFRESH"), "/refresh");
    },
    get logout(): string {
        return resolveUrl(readEnv("VITE_API_LOGOUT"), "/logout");
    },
    get me(): string {
        return resolveUrl(readEnv("VITE_API_ME"), "/me");
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
