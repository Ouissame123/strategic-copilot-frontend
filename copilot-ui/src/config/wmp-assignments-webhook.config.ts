import { readEnv, trimUrl } from "@/config/resolve-api-url";

/**
 * Préfixe POST affectations — n8n `wmp-assign-v1`.
 * - Dev (proxy Vite `/webhook`) : `/webhook/wmp-assign-v1/manager/projects`
 * - Prod avec `VITE_API_BASE_URL` = `https://host/.../webhook` : `{base}/wmp-assign-v1/manager/projects`
 * - Surcharge : `VITE_WMP_ASSIGN_PROJECTS_PREFIX` (sans slash final), ex. `https://n8n…/webhook/wmp-assign-v1/manager/projects`
 */
export function getWmpAssignProjectsPrefix(): string {
    const explicit = readEnv("VITE_WMP_ASSIGN_PROJECTS_PREFIX")?.trim().replace(/\/$/, "");
    if (explicit) return explicit;
    const apiBase = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/wmp-assign-v1/manager/projects`;
    return "/webhook/wmp-assign-v1/manager/projects";
}

/** Préfixe DELETE désaffectation — n8n `wmp-unassign-v1`. */
export function getWmpUnassignProjectsPrefix(): string {
    const explicit = readEnv("VITE_WMP_UNASSIGN_PROJECTS_PREFIX")?.trim().replace(/\/$/, "");
    if (explicit) return explicit;
    const apiBase = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/wmp-unassign-v1/manager/projects`;
    return "/webhook/wmp-unassign-v1/manager/projects";
}

export function getWmpAssignPostUrl(projectId: string): string {
    const enc = encodeURIComponent(validateWmpId(projectId, "projectId"));
    return `${getWmpAssignProjectsPrefix()}/${enc}/assignments`;
}

export function getWmpUnassignDeleteUrl(projectId: string, talentId: string): string {
    const p = encodeURIComponent(validateWmpId(projectId, "projectId"));
    const t = encodeURIComponent(validateWmpId(talentId, "talentId"));
    return `${getWmpUnassignProjectsPrefix()}/${p}/assignments/${t}`;
}

function validateWmpId(raw: string, role: "projectId" | "talentId"): string {
    const id = String(raw ?? "").trim();
    if (!id) throw new Error(`Missing ${role}`);
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === ":talentid" || lower === ":projectid") {
        throw new Error(`Invalid ${role} (placeholder)`);
    }
    return id;
}
