import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";

const silent: HttpClientRequestConfig = { skipGlobalHttpErrorToast: true };

export type DecisionLogStatus = "open" | "handled" | "dismissed";

export type DecisionStatusAction = "handled" | "dismissed" | "reopen";

export type DecisionLogDecision = {
    decision_id: string;
    decision: string;
    project_id: string;
    project_name: string;
    score: number;
    confidence: number;
    reason_code: string;
    scope: string;
    created_at: string;
    synthesis: string;
    status?: DecisionLogStatus;
};

export type DecisionLogKpis = {
    total: number;
    continue: number;
    adjust: number;
    stop: number;
    other: number;
    avg_confidence?: number | null;
    avg_confidence_pct?: number | null;
    avg_score: number;
};

export type DecisionLogReasonTop = { code: string; label: string; count: number };
export type DecisionLogProjectTop = { project_id: string; name: string; count: number };

export type DecisionLogHeatmapRow = { low: number; medium: number; high: number };

export type ManagerDecisionLogResponse = {
    success: boolean;
    count: number;
    decisions: DecisionLogDecision[];
    kpis: DecisionLogKpis;
    reasons_top: DecisionLogReasonTop[];
    projects_top: DecisionLogProjectTop[];
    heatmap: Record<string, DecisionLogHeatmapRow>;
};

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

/** Map entrée journal manager → format Copilot (drawer / liens existants). */
export function decisionLogToCopilot(d: DecisionLogDecision, enterpriseId: string): CopilotDecision {
    const kind = String(d.decision ?? "").trim().toLowerCase();
    const decisionLabel =
        kind === "continue" ? "Continue" : kind === "adjust" ? "Adjust" : kind === "stop" ? "Stop" : "Other";
    return {
        id: d.decision_id,
        enterprise_id: enterpriseId,
        manager_id: null,
        project_id: d.project_id,
        project_name: d.project_name,
        scope: d.scope,
        decision: decisionLabel,
        reason: d.synthesis ?? "",
        score: Number(d.score ?? 0),
        confidence: Number(d.confidence ?? 0),
        analysis_run_id: null,
        payload: { reason_code: d.reason_code },
        created_at: d.created_at,
    };
}

export const decisionsApi = {
    list: (params?: { project_id?: string; scope?: string; limit?: number }) =>
        httpClient.get<{
            status: string;
            count: number;
            decisions: CopilotDecision[];
            by_decision: Record<string, number>;
        }>("/webhook/manager/copilot-decisions", { params }),

    /** GET /webhook/manager/decisions/log (proxy Vite `/webhook` ou base n8n + chemin webhook). */
    getManagerLog: (enterpriseId: string, params?: { limit?: number }) =>
        httpClient.get<ManagerDecisionLogResponse>("/webhook/manager/decisions/log", {
            params: { enterprise_id: enterpriseId.trim(), limit: params?.limit ?? 100 },
            ...silent,
        }),

    /** POST /webhook/manager/decisions/delete */
    deleteManagerDecision: (enterpriseId: string, decisionId: string, mode: "soft" | "hard" = "soft") =>
        httpClient
            .post<DeleteManagerDecisionResponse>(
                "/webhook/manager/decisions/delete",
                {
                    enterprise_id: enterpriseId.trim(),
                    decision_id: decisionId.trim(),
                    mode,
                },
                { ...silent },
            )
            .then((r) => r.data),

    /** POST /webhook/manager/decisions/mark-handled */
    markManagerDecisionHandled: (enterpriseId: string, decisionId: string, action: DecisionStatusAction) =>
        httpClient
            .post<MarkManagerDecisionHandledResponse>(
                "/webhook/manager/decisions/mark-handled",
                {
                    enterprise_id: enterpriseId.trim(),
                    decision_id: decisionId.trim(),
                    action,
                },
                { ...silent },
            )
            .then((r) => r.data),
};

export type MarkManagerDecisionHandledResponse = {
    success: boolean;
    decision_id?: string;
    status?: DecisionLogStatus;
    handled_at?: string;
    handled_by?: string | null;
    message?: string;
};

export type DeleteManagerDecisionResponse = {
    success: boolean;
    decision_id?: string;
    deleted_at?: string;
    message?: string;
};
