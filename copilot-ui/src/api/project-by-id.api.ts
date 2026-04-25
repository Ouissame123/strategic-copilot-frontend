import { getProjectApiBase, getProjectByIdUrl } from "@/config/project-api";
import { apiGet, type ApiClientOptions } from "@/utils/apiClient";
import { assertEnterpriseId, assertUuid } from "@/api/manager-api-contract";

/** Réponse brute webhook fiche projet (GET par id dans le chemin). */
export type ProjectWebhookDetail = Record<string, unknown>;

export type ProjectDetailsResponse = Record<string, unknown>;
export type ProjectTalentsResponse = Record<string, unknown>;
export type ProjectRisksResponse = Record<string, unknown>;
export type ProjectViabilityResponse = Record<string, unknown>;

/** Si `enterpriseId` est absent ou vide, requête Bearer-only (pas de `enterprise_id` en query). */
function withProjectId(path: string, projectId?: string, enterpriseId?: string): string {
    const qs = new URLSearchParams();
    const pid = projectId?.trim();
    if (pid) qs.set("project_id", assertUuid(pid, "project_id"));
    const e = enterpriseId?.trim();
    if (e) qs.set("enterprise_id", assertEnterpriseId(e));
    const suffix = qs.size ? `?${qs.toString()}` : "";
    return `${getProjectApiBase()}${path}${suffix}`;
}

export async function getProjectDetails(
    projectId?: string,
    enterpriseId?: string,
    opts?: ApiClientOptions,
): Promise<ProjectDetailsResponse> {
    return apiGet<ProjectDetailsResponse>(withProjectId("/details", projectId, enterpriseId), opts);
}

export async function getProjectTalents(
    projectId?: string,
    enterpriseId?: string,
    opts?: ApiClientOptions,
): Promise<ProjectTalentsResponse> {
    return apiGet<ProjectTalentsResponse>(withProjectId("/talents", projectId, enterpriseId), opts);
}

export async function getProjectRisks(
    projectId?: string,
    enterpriseId?: string,
    opts?: ApiClientOptions,
): Promise<ProjectRisksResponse> {
    return apiGet<ProjectRisksResponse>(withProjectId("/risks", projectId, enterpriseId), opts);
}

export async function getProjectViability(
    projectId?: string,
    enterpriseId?: string,
    opts?: ApiClientOptions,
): Promise<ProjectViabilityResponse> {
    return apiGet<ProjectViabilityResponse>(withProjectId("/viability", projectId, enterpriseId), opts);
}

/** GET fiche projet complète (URL `getProjectByIdUrl` — `VITE_PROJECT_BY_ID_URL` ou défaut). */
export async function getProjectById(
    projectId: string,
    enterpriseId?: string,
    opts?: ApiClientOptions,
): Promise<ProjectWebhookDetail> {
    const e = enterpriseId?.trim();
    // Manager JWT flow: endpoint dédié workspace manager (pas de `enterprise_id` requis).
    if (!e) {
        const qs = new URLSearchParams();
        qs.set("project_id", assertUuid(projectId, "project_id"));
        return apiGet<ProjectWebhookDetail>(`/webhook/api/workspace/manager/project-detail?${qs.toString()}`, opts);
    }
    const url = new URL(getProjectByIdUrl(projectId), window.location.origin);
    if (e) url.searchParams.set("enterprise_id", assertEnterpriseId(e));
    return apiGet<ProjectWebhookDetail>(
        url.origin === window.location.origin ? `${url.pathname}${url.search}` : url.toString(),
        opts,
    );
}
