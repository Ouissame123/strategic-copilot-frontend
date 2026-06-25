import { readEnv } from "@/config/resolve-api-url";
import { API_ROUTES } from "@/lib/api-routes";

/**
 * Racine WF_Manager_Projects — **liste** (GET avec `params`) et **création** (POST sur la collection).
 * Le **détail** d’un projet utilise `getManagerProjectDetailGetUrl` (webhook `wmp-detail-v1` par défaut).
 */
export function getManagerProjectsBaseUrl(): string {
    return API_ROUTES.projectsList();
}

/**
 * PATCH mise à jour projet — défaut `PATCH /webhook/wmp-update-v1/manager/projects/{id}`.
 * Surcharge : `VITE_MANAGER_PROJECTS_UPDATE_URL` ou préfixes `VITE_WMP_UPDATE_*` (via `api-routes.ts`).
 */
export function getManagerProjectsPatchUrl(projectId: string): string {
    const explicit = readEnv("VITE_MANAGER_PROJECTS_UPDATE_URL");
    if (explicit) return resolveExplicitProjectUrl(projectId, explicit);
    return API_ROUTES.projectUpdate(projectId);
}

/**
 * GET détail projet (équipe, alertes, viabilité, exigences…).
 * Surcharge : `VITE_MANAGER_PROJECTS_DETAIL_URL` ou préfixes `VITE_WMP_DETAIL_*` (via `api-routes.ts`).
 */
export function getManagerProjectDetailGetUrl(projectId: string): string {
    const explicit = readEnv("VITE_MANAGER_PROJECTS_DETAIL_URL");
    if (explicit) return resolveExplicitProjectUrl(projectId, explicit);
    return API_ROUTES.projectDetail(projectId);
}

/**
 * DELETE projet `wmp-delete-v1`.
 * Surcharge : `VITE_MANAGER_PROJECTS_DELETE_URL` ou préfixes `VITE_WMP_DELETE_*` (via `api-routes.ts`).
 */
export function getManagerProjectsDeleteUrl(projectId: string): string {
    const explicit = readEnv("VITE_MANAGER_PROJECTS_DELETE_URL");
    if (explicit) return resolveExplicitProjectUrl(projectId, explicit);
    return API_ROUTES.projectDelete(projectId);
}

/** @deprecated Utiliser `getManagerProjectTasksListUrl` / `getManagerProjectTasksCreateUrl` (wmt-*-v1). */
export function getManagerProjectTasksBaseUrl(projectId: string): string {
    return API_ROUTES.taskList(projectId);
}

function resolveExplicitProjectUrl(projectId: string, explicit: string): string {
    const id = String(projectId ?? "").trim();
    if (!id) throw new Error("Missing project id");
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === ":projectid") throw new Error("Invalid project id placeholder");
    const enc = encodeURIComponent(id);

    const hasPlaceholder = explicit.includes(":id") || explicit.includes(":projectId");
    const resolved = explicit.split(":projectId").join(enc).split(":id").join(enc);
    if (/^https?:\/\//i.test(explicit)) {
        return hasPlaceholder ? resolved : `${explicit.replace(/\/$/, "")}/${enc}`;
    }
    const rel = hasPlaceholder ? resolved : `${explicit.replace(/\/$/, "")}/${enc}`;
    return rel.startsWith("/") ? rel : `/${rel}`;
}
