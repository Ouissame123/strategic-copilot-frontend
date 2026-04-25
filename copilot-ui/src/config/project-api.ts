/**
 * URLs API « projet » (webhooks n8n sous /webhook/api/project/…).
 */

import { readEnv, trimUrl } from "@/config/resolve-api-url";

export function getProjectApiBase(): string {
    const raw = (import.meta.env.VITE_PROJECT_API_BASE as string | undefined)?.trim().replace(/\/$/, "");
    return raw || "/webhook/api/project";
}

export function getDecisionLogUrl(): string {
    const explicit = (import.meta.env.VITE_PROJECT_DECISION_LOG_URL as string | undefined)?.trim();
    if (explicit) return explicit;
    return `${getProjectApiBase()}/decision-log`;
}

export function getProjectDetailsUrl(projectId: string): string {
    const explicit = (import.meta.env.VITE_PROJECT_DETAILS_URL as string | undefined)?.trim();
    if (explicit) {
        if (explicit.includes(":id")) return explicit.replace(":id", encodeURIComponent(projectId));
        return `${explicit.replace(/\/$/, "")}?project_id=${encodeURIComponent(projectId)}`;
    }
    return `${getProjectApiBase()}/details?project_id=${encodeURIComponent(projectId)}`;
}

/**
 * GET fiche projet par id (webhook n8n).
 * `VITE_PROJECT_BY_ID_URL` peut contenir `:id` (remplacé par l’identifiant encodé).
 * Sinon : `{VITE_API_BASE_URL}/webhook/api/projects/{id}` (à ajuster via env si votre n8n utilise un autre chemin).
 */
export function getProjectByIdUrl(projectId: string): string {
    const explicit = readEnv("VITE_PROJECT_BY_ID_URL");
    if (explicit) {
        if (explicit.includes(":id")) return explicit.replace(":id", encodeURIComponent(projectId));
        return `${explicit.replace(/\/$/, "")}/${encodeURIComponent(projectId)}`;
    }
    const base = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    const path = `/webhook/api/projects/${encodeURIComponent(projectId)}`;
    return base ? `${base}${path}` : path;
}

/** WF_Talent_Matching — GET avec `project_id` (même schéma que les autres webhooks projet). */
export function getProjectTalentMatchingUrl(projectId: string): string {
    const explicit = (import.meta.env.VITE_PROJECT_TALENT_MATCHING_URL as string | undefined)?.trim();
    if (explicit) {
        if (explicit.includes(":id")) return explicit.replace(":id", encodeURIComponent(projectId));
        return `${explicit.replace(/\/$/, "")}?project_id=${encodeURIComponent(projectId)}`;
    }
    return `${getProjectApiBase()}/talents?project_id=${encodeURIComponent(projectId)}`;
}

/**
 * Chemin pour POST `{ project_id }` — si `VITE_PROJECT_TALENT_MATCHING_USE_POST=true`
 * (webhooks n8n souvent en POST).
 */
export function getProjectTalentMatchingPath(projectId: string): string {
    const explicit = (import.meta.env.VITE_PROJECT_TALENT_MATCHING_URL as string | undefined)?.trim();
    if (explicit) {
        const base = explicit.split("?")[0] ?? explicit;
        if (base.includes(":id")) return base.replace(":id", encodeURIComponent(projectId));
        return base.replace(/\/$/, "");
    }
    return `${getProjectApiBase()}/talents`;
}
