export type OrchestratorRecomputeScope = "all_my_projects" | "project";

export interface OrchestratorRecomputeRequest {
    scope: OrchestratorRecomputeScope;
    project_id?: string;
}

export interface OrchestratorRecomputeResponse {
    status: string;
    message: string;
    scope?: string;
    projects_count?: number;
    estimated_duration_seconds?: number;
    trigger_source?: string;
    code?: string;
}
