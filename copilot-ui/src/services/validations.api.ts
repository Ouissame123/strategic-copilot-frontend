import { httpClient } from "@/lib/http-client";

/** POST `/webhook/api/helpe/validations` — file de validations Copilot (Agent 6). */
export const COPILOT_VALIDATIONS_PATH = "/webhook/api/helpe/validations";

export type ValidationType = "rh_action" | "arbitrage" | "decision";
export type ValidationCategory = "conflict" | "missing_justification" | "standard";

export interface PendingValidation {
    id: string;
    type: ValidationType;
    type_label: string;
    subtype: string;
    priority_score: number;
    category: ValidationCategory;
    category_order: 1 | 2 | 3;
    suggested_order: number;
    blocking: boolean;
    why: string;
    project_id: string | null;
    project_name: string | null;
    project_priority: number | null;
    talent_id: string | null;
    talent_name: string | null;
    due_date: string | null;
    created_at: string;
    payload: Record<string, unknown>;
}

export interface ValidationsSummary {
    total_pending: number;
    conflict_count: number;
    missing_justification_count: number;
    standard_count: number;
    blocking_count: number;
    by_type: { rh_action: number; arbitrage: number; decision: number };
}

export interface ValidationsListParams {
    scope?: "mine" | "enterprise";
    types?: ValidationType[];
    limit?: number;
}

export interface ValidationsResponse {
    status: string;
    summary: ValidationsSummary;
    pending_validations: PendingValidation[];
    meta?: unknown;
}

export const validationsApi = {
    list: (params?: ValidationsListParams) =>
        httpClient.post<ValidationsResponse>(COPILOT_VALIDATIONS_PATH, params ?? {}),
};
