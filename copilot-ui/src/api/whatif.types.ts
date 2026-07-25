/** Décision viabilité What-If — contrat POST /webhook/api/project/what-if */
export type ViabilityDecision = "Proceed" | "Adjust" | "Reject" | string;

/** Sous-scores contrat actuel (planning / capacity / alignment / skill_coverage). */
export interface ScoreBreakdown {
    planning: number | null;
    capacity: number | null;
    alignment: number | null;
    skill_coverage: number | null;
    /** Compat payloads legacy */
    skills_fit?: number | null;
    budget?: number | null;
    risk?: number | null;
}

export interface WhatIfModifications {
    allocation_pct: number;
    added_talent_id: string | null;
    training_skill_id: string | null;
}

export interface WhatIfRecommendationActionPayload {
    priority?: number;
    type?: string;
    rationale?: string;
    owner_role?: string;
}

export interface WhatIfArbitrageOptionPayload {
    option_type?: string;
    rationale?: string;
    confidence?: number;
    impact?: Record<string, unknown>;
}

export interface WhatIfRecommendationPayload {
    summary?: string;
    actions?: WhatIfRecommendationActionPayload[];
    arbitrage_options?: WhatIfArbitrageOptionPayload[];
}

export interface WhatIfRequest {
    project_id: string;
    modifications: WhatIfModifications;
}

export interface WhatIfLlmMeta {
    model?: string | null;
    latency_ms?: number | null;
    fallback?: boolean | null;
    error?: string | null;
    [key: string]: unknown;
}

export interface WhatIfResponse {
    status?: "success" | string;
    workflow?: "WF_What_If" | string;
    workflow_source?: "WF_What_If" | string;
    run_status?: "completed" | "failed" | string;
    run_completed_at?: string;

    project_id: string;
    enterprise_id?: string;
    analysis_run_id: string;
    simulation_mode: boolean;
    scenario_summary?: string;
    requested_by?: string;
    modifications?: WhatIfModifications;

    score_before: number;
    score_after: number;
    delta: number;

    decision_before: ViabilityDecision | null;
    decision_after: ViabilityDecision;
    decision_changed?: boolean;

    explanation_before?: string | null;
    explanation_after?: string | null;

    score_breakdown_before: ScoreBreakdown;
    score_breakdown_after: ScoreBreakdown;

    /** Recommandation structurée legacy */
    recommendation?: string | WhatIfRecommendationPayload | null;
    /** Recommandation texte contrat actuel */
    ai_recommendation?: string | WhatIfRecommendationPayload | null;

    kpi?: Record<string, unknown> | null;
    risks?: unknown[];
    source_agents?: unknown;

    meta?: {
        analysis_version?: number;
        scenario_type?: "simulation" | string;
        computed_at?: string;
    };

    impact_explained?: string;
    computed_at?: string;

    what_if_narrative?: string | null;
    key_change?: string | null;
    primary_lever?: string | null;
    approximation_notes?: string[] | null;

    /** true uniquement si narration LLM réussie — jamais true si LLM échoué */
    llm_enriched?: boolean | null;
    llm_meta?: WhatIfLlmMeta | null;
}

export type WhatIfErrorCode =
    | "validation_failed"
    | "forbidden"
    | "baseline_missing"
    | "observer_error"
    | "orchestrator_error"
    | "timeout";

export interface WhatIfError {
    status: "error";
    code: WhatIfErrorCode;
    message: string;
    errors?: Array<string | { field?: string; message?: string; path?: string }>;
}

export type WhatIfFieldKey = "allocation_pct" | "added_talent_id" | "training_skill_id" | "_form";

export type WhatIfFieldErrors = Partial<Record<WhatIfFieldKey, string>>;
