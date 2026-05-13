import { httpClient } from "@/lib/http-client";
import type { ExecuteResponse, ProjectAnalysisResponse, RiskKpiResponse, TalentMatchingResponse } from "@/types/api.types";

/** Réponses métier variables selon n8n — typage souple côté POST agents. */
export type CopilotRecomputeResponse = Record<string, unknown>;

export const agentsApi = {
    /** Cascade agents Copilot — POST /webhook/api/copilot/recompute */
    recomputeFull: (projectId: string) =>
        httpClient.post<CopilotRecomputeResponse>("/webhook/api/copilot/recompute", { project_id: projectId }),

    /** Observer / KPI projet — POST /webhook/api/project/details */
    observerKpi: (projectId: string) =>
        httpClient.post<ProjectAnalysisResponse>("/webhook/api/project/details", { project_id: projectId }),

    /** Watchdog / Risk KPI — POST /webhook/api/project/risks */
    riskKpi: (projectId: string) =>
        httpClient.post<RiskKpiResponse>("/webhook/api/project/risks", { project_id: projectId, use_ai: true }),

    /** Matchmaker — POST /webhook/api/project/talents */
    matchmakerTalents: (projectId: string) =>
        httpClient.post<TalentMatchingResponse>("/webhook/api/project/talents", {
            project_id: projectId,
            use_ai: true,
            top_n: 5,
        }),

    /** Strategist — POST /webhook/api/strategist/execute */
    executeArbitrage: (optionId: string, action: "execute" | "reject") =>
        httpClient.post<ExecuteResponse>("/webhook/api/strategist/execute", { option_id: optionId, action }),
};
