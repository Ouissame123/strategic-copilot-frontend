import { readEnv, trimUrl } from "@/config/resolve-api-url";

/** Dev / même origine : proxy Vite ou relais (ex. Vercel) vers n8n. */
const MANAGER_PROJECTS_FALLBACK_REL = "/webhook/manager/projects";

/**
 * Racine WF_Manager_Projects — **liste** (GET avec `params`) et **création** (POST sur la collection).
 * Le **détail** d’un projet utilise `getManagerProjectDetailGetUrl` (webhook `wmp-detail-v1` par défaut, aligné avec assign/unassign).
 */
export function getManagerProjectsBaseUrl(): string {
    const base = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (base) return `${base}/manager/projects`;
    return MANAGER_PROJECTS_FALLBACK_REL;
}

/**
 * PATCH mise à jour projet `wmp-update-v1` — `…/manager/projects/{id}` (id encodé, jamais `:id` littéral).
 *
 * Surcharges :
 * - `VITE_MANAGER_PROJECTS_UPDATE_URL` : modèle avec `:id` ou `:projectId`, ou URL/chemin + id en suffixe.
 * - `VITE_WMP_UPDATE_PROJECTS_PREFIX` : préfixe avant `/{projectId}` (sans slash final).
 */
export function getManagerProjectsPatchUrl(projectId: string): string {
    const id = String(projectId ?? "").trim();
    if (!id) throw new Error("Missing project id");
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === ":projectid") throw new Error("Invalid project id placeholder");
    const enc = encodeURIComponent(id);

    const explicit = readEnv("VITE_MANAGER_PROJECTS_UPDATE_URL");
    if (explicit) {
        const hasPlaceholder = explicit.includes(":id") || explicit.includes(":projectId");
        const resolved = explicit.split(":projectId").join(enc).split(":id").join(enc);
        if (/^https?:\/\//i.test(explicit)) {
            return hasPlaceholder ? resolved : `${explicit.replace(/\/$/, "")}/${enc}`;
        }
        const rel = hasPlaceholder ? resolved : `${explicit.replace(/\/$/, "")}/${enc}`;
        return rel.startsWith("/") ? rel : `/${rel}`;
    }

    const prefix = readEnv("VITE_WMP_UPDATE_PROJECTS_PREFIX")?.trim().replace(/\/$/, "");
    if (prefix) return `${prefix}/${enc}`;

    const apiBase = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/wmp-update-v1/manager/projects/${enc}`;
    return `/webhook/wmp-update-v1/manager/projects/${enc}`;
}

/**
 * GET détail projet (équipe, alertes, viabilité, exigences…).
 *
 * Par défaut : `/webhook/wmp-detail-v1/manager/projects/{id}` (même famille que `wmp-assign-v1` / `wmp-unassign-v1`).
 * Si votre n8n expose encore `GET /webhook/manager/projects/:id`, définissez par ex.
 * `VITE_WMP_DETAIL_PROJECTS_PREFIX=/webhook/manager/projects` (sans id final).
 *
 * Surcharges :
 * - `VITE_MANAGER_PROJECTS_DETAIL_URL` : modèle avec `:id` ou URL/chemin + id en suffixe.
 * - `VITE_WMP_DETAIL_PROJECTS_PREFIX` : préfixe avant `/{projectId}` (sans slash final).
 */
export function getManagerProjectDetailGetUrl(projectId: string): string {
    const id = String(projectId ?? "").trim();
    if (!id) throw new Error("Missing project id");
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === ":projectid") throw new Error("Invalid project id placeholder");
    const enc = encodeURIComponent(id);

    const explicit = readEnv("VITE_MANAGER_PROJECTS_DETAIL_URL");
    if (explicit) {
        if (/^https?:\/\//i.test(explicit)) {
            if (explicit.includes(":id")) return explicit.split(":id").join(enc);
            return `${explicit.replace(/\/$/, "")}/${enc}`;
        }
        const rel = explicit.includes(":id") ? explicit.split(":id").join(enc) : `${explicit.replace(/\/$/, "")}/${enc}`;
        return rel.startsWith("/") ? rel : `/${rel}`;
    }

    const prefix = readEnv("VITE_WMP_DETAIL_PROJECTS_PREFIX")?.trim().replace(/\/$/, "");
    if (prefix) return `${prefix}/${enc}`;

    const apiBase = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/wmp-detail-v1/manager/projects/${enc}`;
    return `/webhook/wmp-detail-v1/manager/projects/${enc}`;
}
