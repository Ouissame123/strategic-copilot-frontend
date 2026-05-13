import { httpClient } from "../lib/http-client";
import type { ProjectAnalysisResponse, RiskKpiResponse, TalentMatchingResponse } from "../types/api.types";

export const agentsApi = {
    projectAnalysis: (body: { project_id: string }) =>
        httpClient.post<ProjectAnalysisResponse>("/webhook/api/project/details", body),
    riskKpi: (body: { project_id?: string; use_ai?: boolean }) =>
        httpClient.post<RiskKpiResponse>("/webhook/api/project/risks", body),
    talentMatching: (body: { project_id: string; use_ai?: boolean; top_n?: number }) =>
        httpClient.post<TalentMatchingResponse>("/webhook/api/project/talents", body),
};
