/** Contrat POST `/api/project/viability` (WF_Strategic_Orchestrator) — affichage strict, sans recalcul UI. */

export type CopilotDecision = "Continue" | "Adjust" | "Stop" | string;

export type CopilotRiskSeverity = "low" | "medium" | "high" | "critical" | string;

export type CopilotArbitrageOptionType = "reinforce" | "reallocation" | "delay" | string;

export type CopilotActionOwnerRole = "manager" | "rh" | "direction" | "pmo" | string;

export interface CopilotScores {
    skills_fit?: number | null;
    capacity?: number | null;
    budget?: number | null;
    risk?: number | null;
}

export interface CopilotKpi {
    progress_pct?: number | null;
    delay_days?: number | null;
    capacity_load_pct?: number | null;
    time_to_impact_days?: number | null;
    strategic_alignment_score?: number | null;
    project_health_score?: number | null;
    skills_fit_score?: number | null;
    fragility_score?: number | null;
}

export interface CopilotRisk {
    type?: string | null;
    severity?: CopilotRiskSeverity | null;
    title?: string | null;
    description?: string | null;
    source_agent?: string | null;
}

export interface CopilotReallocationCandidate {
    name?: string | null;
    matching_skills_count?: number | null;
    proposed_allocation_pct?: number | null;
}

export interface CopilotArbitrageImpact {
    recruitment_count?: number | null;
    recruitments?: number | null;
    proposed_hires?: number | null;
    skills_covered?: number | null;
    skills_covered_count?: number | null;
    uncovered_skills_count?: number | null;
    delay_days?: number | null;
    delta_days?: number | null;
    milestone_at?: string | null;
    milestone_date?: string | null;
    proposed_milestone_at?: string | null;
    candidates?: CopilotReallocationCandidate[] | null;
    [key: string]: unknown;
}

export interface CopilotArbitrageOption {
    id?: string | null;
    option_type?: CopilotArbitrageOptionType | null;
    rationale?: string | null;
    confidence?: number | null;
    impact?: CopilotArbitrageImpact | null;
}

export interface CopilotStrategistDecision {
    recommended_action?: string | null;
    priority_level?: string | null;
    summary?: string | null;
    explanation?: string | null;
    confidence?: number | null;
}

export interface CopilotRecommendationAction {
    priority?: number | null;
    type?: string | null;
    rationale?: string | null;
    owner_role?: CopilotActionOwnerRole | null;
    linked_arbitrage_id?: string | null;
}

export interface CopilotRecommendation {
    summary?: string | null;
    key_drivers?: string[] | null;
    actions?: CopilotRecommendationAction[] | null;
    warnings?: string[] | null;
}

export interface CopilotSourceAgentEntry {
    status?: string | null;
    duration_ms?: number | null;
    manager_summary?: string | null;
    confidence?: number | null;
}

export interface CopilotSourceAgents {
    project_analysis?: CopilotSourceAgentEntry | null;
    talent_matching?: CopilotSourceAgentEntry | null;
    risk_kpi?: CopilotSourceAgentEntry | null;
    strategist?: CopilotSourceAgentEntry | null;
    llm_synthesize?: CopilotSourceAgentEntry | null;
}

export interface CopilotData {
    status?: string | null;
    viability_score?: number | null;
    decision?: CopilotDecision | null;
    decision_reason_code?: string | null;
    confidence_score?: number | null;
    scores?: CopilotScores | null;
    kpi?: CopilotKpi | null;
    risks?: CopilotRisk[] | null;
    arbitrage_options?: CopilotArbitrageOption[] | null;
    strategist_decision?: CopilotStrategistDecision | null;
    recommendation?: CopilotRecommendation | null;
    explanation?: string | null;
    source_agents?: CopilotSourceAgents | null;
    llm_enriched?: boolean | null;
    computed_at?: string | null;
}
