import { readEnv, trimUrl } from "@/config/resolve-api-url";

/** Dev / même origine : proxy Vite ou relais (ex. Vercel) vers n8n. */
const MANAGER_PROJECTS_FALLBACK_REL = "/webhook/manager/projects";

/**
 * Racine WF_Manager_Projects (liste, détail, POST, PATCH, assignments).
 * Si `VITE_API_BASE_URL` est défini (ex. `https://n8nprod…/webhook`), renvoie une URL absolue
 * `{VITE_API_BASE_URL}/manager/projects` pour éviter d’appeler l’origine Vite (`:5173`).
 * Sinon : `/webhook/manager/projects`.
 */
export function getManagerProjectsBaseUrl(): string {
    const base = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (base) return `${base}/manager/projects`;
    return MANAGER_PROJECTS_FALLBACK_REL;
}

/**
 * PATCH `WF_Manager_Projects` — même ressource que `getManagerProjectsBaseUrl() + '/:id'`.
 * Surcharge optionnelle : `VITE_MANAGER_PROJECTS_UPDATE_URL` avec `:id`.
 */
export function getManagerProjectsPatchUrl(projectId: string): string {
    const explicit = readEnv("VITE_MANAGER_PROJECTS_UPDATE_URL");
    const enc = encodeURIComponent(projectId);
    if (explicit) {
        if (/^https?:\/\//i.test(explicit)) {
            if (explicit.includes(":id")) return explicit.split(":id").join(enc);
            return `${explicit.replace(/\/$/, "")}/${enc}`;
        }
        const rel = explicit.includes(":id") ? explicit.split(":id").join(enc) : `${explicit.replace(/\/$/, "")}/${enc}`;
        return rel.startsWith("/") ? rel : `/${rel}`;
    }
    return `${getManagerProjectsBaseUrl()}/${enc}`;
}
