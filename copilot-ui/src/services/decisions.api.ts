import { httpClient } from "@/lib/http-client";

export interface CopilotDecision {
    id: string;
    enterprise_id: string;
    manager_id: string | null;
    project_id: string | null;
    project_name?: string;
    scope: string;
    decision: "Continue" | "Adjust" | "Stop" | "Proceed" | "Reject" | string;
    reason: string;
    score: number;
    confidence: number;
    analysis_run_id: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
}

export const decisionsApi = {
    list: (params?: { project_id?: string; scope?: string; limit?: number }) =>
        httpClient.get<{
            status: string;
            count: number;
            decisions: CopilotDecision[];
            by_decision: Record<string, number>;
        }>("/webhook/manager/copilot-decisions", { params }),
};
