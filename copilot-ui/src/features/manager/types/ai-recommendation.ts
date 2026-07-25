export type AiDecision = "Continue" | "Adjust" | "Stop" | null;

export type AiSeverity = "low" | "medium" | "high" | "critical";

export interface AiTopAction {
    id?: string | null;
    type?: string | null;
    label?: string | null;
    rationale?: string | null;
    confidence?: number | null;
}

export interface AiArbitrageOption {
    id?: string | null;
    type?: string | null;
    label?: string | null;
    rationale?: string | null;
    confidence?: number | null;
}

export interface AiActiveRisk {
    id?: string | null;
    title?: string | null;
    message?: string | null;
    description?: string | null;
    severity?: AiSeverity | string | null;
    risk_type?: string | null;
    alert_code?: string | null;
}

export interface AiRecommendation {
    decision?: AiDecision | string | null;
    decision_label?: string | null;
    decision_color?: string | null;
    decision_icon?: string | null;
    viability_score?: number | null;
    reason?: string | null;
    reason_code?: string | null;
    reason_label?: string | null;
    source_agent?: string | null;
    confidence?: number | null;
    explanation?: string | null;
    explanation_clean?: string | null;
    computed_at?: string | null;
    top_action?: AiTopAction | null;
    arbitrages_pending?: number | null;
    risks_count?: number | null;
    arbitrage_options?: AiArbitrageOption[] | null;
    risks_active?: AiActiveRisk[] | null;
    warnings?: string[] | null;
}
