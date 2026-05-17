import { agentsApi } from "./agents.api";
import { managerProjectsApi } from "./manager-projects.api";
import { orchestratorApi } from "./orchestrator.api";

export type ProjectDetailsResponse = Record<string, unknown>;
export type ProjectTalentsResponse = Record<string, unknown>;
export type ProjectRisksResponse = Record<string, unknown>;
export type ProjectViabilityResponse = Record<string, unknown>;
export interface ProjectByIdRequestOptions {
    signal?: AbortSignal;
    timeout?: number;
}

export async function getProjectById(
    projectId: string,
    _enterpriseId?: string,
    _options?: ProjectByIdRequestOptions,
) {
    return getProjectDetails(projectId);
}

export async function getProjectDetails(projectId: string) {
    return managerProjectsApi.detail(projectId).then((r) => r.data as unknown as ProjectDetailsResponse);
}
export async function getProjectTalents(projectId: string) {
    return agentsApi.talentMatching({ project_id: projectId }).then((r) => r.data as unknown as ProjectTalentsResponse);
}
export async function getProjectRisks(projectId: string) {
    return agentsApi.riskKpi({ project_id: projectId, use_ai: true }).then((r) => r.data as unknown as ProjectRisksResponse);
}
export async function getProjectViability(projectId: string, enterpriseId?: string) {
    const body = enterpriseId?.trim()
        ? {
              project_id: projectId,
              enterprise_id: enterpriseId.trim(),
              enable_strategist: true,
              use_ai: true,
              force_refresh: true,
          }
        : { project_id: projectId, use_ai: true, force_refresh: true };
    return orchestratorApi.computeViability(body).then((r) => r.data as unknown as ProjectViabilityResponse);
}
