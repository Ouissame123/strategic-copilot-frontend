/** Utilitaires partagés pour résoudre les URLs API (n8n / backend). */

export function trimUrl(u: string | undefined): string {
    return (u ?? "").trim().replace(/\/$/, "");
}

export function readEnv(name: string): string | undefined {
    const v = (import.meta.env as Record<string, string | undefined>)[name];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/**
 * @param explicit URL absolue (https://…) ou chemin relatif (ex. `/webhook/...`) — dans ce cas préfixé par `VITE_API_BASE_URL` si défini
 * @param relativePath chemin par défaut si `explicit` absent
 */
export function resolveApiUrl(explicit: string | undefined, relativePath: string): string {
    const e = trimUrl(explicit);
    if (e) {
        if (/^https?:\/\//i.test(e)) return e;
        const base = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
        const p = e.startsWith("/") ? e : `/${e}`;
        return base ? `${base}${p}` : p;
    }
    const base = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    const p = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
    return base ? `${base}${p}` : p;
}
