export type ViabilityDecision = "GO" | "NO_GO" | "CONDITIONAL" | "Unknown" | string;

export interface ScoreBreakdown {
    skills_fit: number | null;
    capacity: number | null;
    budget: number | null;
    risk: number | null;
}

export interface WhatIfModifications {
    allocation_pct: number;
    added_talent_id: string | null;
    training_skill_id: string | null;
}

export interface WhatIfRequest {
    project_id: string;
    modifications: WhatIfModifications;
}

export interface WhatIfResponse {
    status: "success";
    workflow?: "WF_What_If";
    workflow_source?: "WF_What_If";
    run_status?: "completed" | "failed";
    run_completed_at?: string;

    project_id: string;
    enterprise_id?: string;
    analysis_run_id: string;
    simulation_mode: boolean | true;
    scenario_summary: string;
    requested_by?: string;
    modifications?: WhatIfModifications;

    score_before: number;
    score_after: number;
    delta: number;

    decision_before: ViabilityDecision | null;
    decision_after: ViabilityDecision;

    explanation_before: string | null;
    explanation_after: string | null;

    score_breakdown_before: ScoreBreakdown;
    score_breakdown_after: ScoreBreakdown;

    recommendation: string | Record<string, unknown> | null;
    kpi: Record<string, unknown> | null;
    risks: unknown[];
    source_agents?: unknown;

    meta?: {
        analysis_version: number;
        scenario_type: "simulation";
        computed_at: string;
    };

    impact_explained: string;
    computed_at: string;
}

export interface WhatIfError {
    status: "error";
    code: "validation_failed" | "forbidden" | "baseline_missing" | "orchestrator_error";
    message: string;
    errors?: string[];
}
