import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import { API_ROUTES } from "@/lib/api-routes";

const silent: HttpClientRequestConfig = { skipGlobalHttpErrorToast: true };

export type DecisionLogPeriod = "7d" | "30d" | "90d" | "all";

export type DecisionLogStatus = "open" | "handled" | "dismissed" | "deleted";

export type DecisionStatusAction = "handled" | "dismissed" | "reopen";

export type DecisionLogDecision = {
    decision_id: string;
    decision: "continue" | "adjust" | "stop" | "other" | string;
    project_id: string | null;
    project_name: string | null;
    score: number;
    confidence: number;
    reason_code: string;
    scope: string;
    created_at: string;
    status: DecisionLogStatus;
    handled_at: string | null;
    synthesis: string;
};

export type DecisionLogKpis = {
    total: number;
    continue: number;
    adjust: number;
    stop: number;
    other: number;
    avg_confidence_pct: number;
    avg_score: number;
    watch_count: number;
    handled_count: number;
};

export type DecisionLogReasonTop = { code: string; label: string; count: number };
export type DecisionLogProjectTop = { project_id: string; name: string; count: number };
export type DecisionLogTimeSeriesPoint = { day: string; avg_confidence: number | null; count: number };

export type DecisionLogHeatmapRow = { low: number; medium: number; high: number };

export type ManagerDecisionLogQueryParams = {
    period?: DecisionLogPeriod;
    type?: string;
    project_id?: string;
    /** Legacy — le backend identifie le manager via JWT si absent. */
    enterprise_id?: string;
};

export type ManagerDecisionLogResponse = {
    success: boolean;
    count: number;
    decisions: DecisionLogDecision[];
    kpis: DecisionLogKpis;
    reasons_top: DecisionLogReasonTop[];
    projects_top: DecisionLogProjectTop[];
    time_series: DecisionLogTimeSeriesPoint[];
    watch_decision: DecisionLogDecision | null;
    /** Legacy — certains workflows renvoient encore heatmap. */
    heatmap?: Record<string, DecisionLogHeatmapRow>;
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
        project_name: d.project_name ?? undefined,
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

function buildLogQueryParams(params?: ManagerDecisionLogQueryParams): Record<string, string> {
    const query: Record<string, string> = {
        period: params?.period ?? "30d",
    };
    if (params?.type && params.type !== "all") query.type = params.type;
    if (params?.project_id?.trim()) query.project_id = params.project_id.trim();
    if (params?.enterprise_id?.trim()) query.enterprise_id = params.enterprise_id.trim();
    return query;
}

export const decisionsApi = {
    list: (params?: { project_id?: string; scope?: string; limit?: number }) =>
        httpClient.get<{
            status: string;
            count: number;
            decisions: CopilotDecision[];
            by_decision: Record<string, number>;
        }>(API_ROUTES.copilotDecisions(), { params }),

    /** GET `/webhook/manager/decisions/log?period=&type=&project_id=` */
    getManagerLog: (params?: ManagerDecisionLogQueryParams) =>
        httpClient
            .get<ManagerDecisionLogResponse>("/webhook/manager/decisions/log", {
                params: buildLogQueryParams(params),
                ...silent,
            })
            .then((r) => r.data),

    /** POST `/webhook/manager/decisions/delete` */
    deleteManagerDecision: (decisionId: string, mode: "soft" | "hard" = "soft") =>
        httpClient
            .post<DeleteManagerDecisionResponse>(
                "/webhook/manager/decisions/delete",
                { decision_id: decisionId.trim(), mode },
                { ...silent },
            )
            .then((r) => r.data),

    /** POST `/webhook/manager/decisions/mark-handled` */
    markManagerDecisionHandled: (decisionId: string, action: DecisionStatusAction) =>
        httpClient
            .post<MarkManagerDecisionHandledResponse>(
                "/webhook/manager/decisions/mark-handled",
                { decision_id: decisionId.trim(), action },
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
