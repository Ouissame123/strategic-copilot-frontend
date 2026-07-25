export type DashboardUrgency = "critical" | "high" | "medium" | "low";
export type HealthLabel = "healthy" | "watch" | "attention" | "critical";
export type DashboardDecision = "Continue" | "Adjust" | "Stop" | null;
export type RiskSeverity = "critical" | "high" | "medium" | "low";
export type ArbitrageOptionType = "reallocation" | "delay" | "reinforce" | "stop_scope";
export type ArbitrageOptionStatus = "proposed" | "executed" | "rejected";

export type DashboardAgentKey =
    | "observer"
    | "watchdog"
    | "strategist"
    | "matchmaker"
    | "analyst"
    | "helper"
    | "orchestrator";

export interface DashboardAgentStatus {
    active: boolean;
    has_data: boolean;
}

export interface DashboardCopilotPulse {
    headline: string;
    urgency: DashboardUrgency;
    priority_actions: Array<{
        rank: number;
        icon: string;
        label: string;
        action: string;
    }>;
}

export interface DashboardHealth {
    score: number;
    label: HealthLabel;
    avg_viability: number;
}

export interface ProjectStateItem {
    id: string;
    name: string;
    status: string;
    priority: number | null;
    milestone_at: string | null;
    days_to_deadline: number | null;
    viability_score: number | null;
    decision: DashboardDecision;
    viability_confidence: number | null;
    scores: {
        skills_fit: number | null;
        capacity: number | null;
        budget: number | null;
        risk: number | null;
    };
    health_score: number | null;
    delay_days: number | null;
    capacity_load_pct: number | null;
    skill_gap_score: number | null;
    capacity_ratio: number | null;
    fragility_score: number | null;
    anxiety_pulse: number | null;
    alerts: { total: number; critical: number };
    team_size: number;
    budget_consumed_pct: number | null;
}

export interface ProjectStateSummary {
    total: number;
    by_status: { active: number; planned: number; completed: number };
    by_decision: { continue: number; adjust: number; stop: number; unscored: number };
    avg_viability_score: number;
    avg_health_score: number;
    viability_trend_7d: { this_week: number; last_week: number };
}

export interface DashboardRecentDecision {
    id: string;
    decision: string;
    reason: string | null;
    score: number | null;
    confidence: number | null;
    project_id: string;
    project_name: string;
    created_at: string;
}

export interface DashboardRiskAlert {
    id: string;
    risk_type: string;
    severity: RiskSeverity;
    message: string;
    risk_score: number;
    entity_type: string;
    entity_id: string;
    impact_area: string;
    owner_role: string;
    detected_at: string;
    project_id: string;
    project_name: string;
    age_hours: number;
    pdf_rule: string;
}

export interface WatchdogSummary {
    total_open: number;
    critical: number;
    high: number;
    medium: number;
    new_24h: number;
    avg_risk_score: number;
}

export interface ProjectFragilityItem {
    project_id: string;
    project_name: string;
    fragility_score: number;
    anxiety_pulse: number;
    key_talent_dependency_score: number;
    chronic_overload_score: number;
    critical_skills_gap_score: number;
}

export interface DashboardArbitrageOption {
    id: string;
    option_type: ArbitrageOptionType;
    rationale: string;
    confidence: number;
    status: ArbitrageOptionStatus;
    created_at: string;
    impact_json: Record<string, unknown>;
    project_id: string;
    project_name: string;
    project_priority: number | null;
    trade_off_label: string;
    user_confirmation_required: boolean;
    audit_logged: boolean;
}

export interface StrategistSummary {
    proposed: number;
    executed: number;
    rejected: number;
    by_type: { reallocation: number; delay: number; reinforce: number; stop_scope: number };
    avg_confidence: number;
}

/** Conflits — champs contractuels exacts. */
export interface ValidationConflictItem {
    id: string;
    type: string;
    title: string;
    talent_name: string;
    conflicting_project: string;
    age_days: number;
    priority_score: number;
    why_explanation: string;
    sla_overdue: boolean;
}

/** Missing justif / standard queue — forme contractuelle. */
export interface ValidationQueueItem {
    id: string;
    type: string;
    title: string;
    talent_name: string;
    age_days: number;
    priority_score: number;
    why_explanation: string;
}

export interface ValidationQueue {
    summary: {
        total_pending: number;
        conflicts: number;
        missing_justif: number;
        standard_queue: number;
        sla_overdue: number;
        urgent_count: number;
        avg_age_days: number;
    };
    conflicts: ValidationConflictItem[];
    missing_justif: ValidationQueueItem[];
    standard_queue: ValidationQueueItem[];
    priority_rules: Array<{
        order: number;
        rule: string;
        label: string;
        description: string;
    }>;
}

export interface DashboardTeam {
    total: number;
    overloaded: number;
    contract_ending_90d: number;
}

export interface DashboardSkillGap {
    skill_name: string;
    category: string;
    projects_affected: number;
    critical_count: number;
    avg_gap_size: number;
}

export interface DashboardAvailableTalent {
    talent_id: string;
    talent_name: string;
    job_title: string;
    current_load_pct: number;
}

export interface DashboardMatchmakerSection {
    summary: {
        projects_scored: number;
        avg_match_score: number;
        total_skill_gaps: number;
        needs_recruitment: number;
        can_redeploy: number;
    };
    top_skill_gaps: DashboardSkillGap[];
    top_available_talents: DashboardAvailableTalent[];
}

export interface DashboardAtRiskTalent {
    talent_id: string;
    talent_name: string;
    ipi_score: number | null;
    ipi_band: string;
    mobility_flag: "stable" | "watch" | "at_risk" | string;
    mobility_score: number | null;
    box_label: string;
    has_watchdog_alert: boolean;
    contract_risk: string | null;
}

export interface DashboardNineBoxCell {
    box_label: string;
    count: number;
}

export interface DashboardAnalystSection {
    summary: {
        team_size: number;
        ipi_avg: number;
        ipi_top: number;
        ipi_at_risk: number;
        mob_stable: number;
        mob_watch: number;
        mob_at_risk: number;
        ninebox_stars: number;
        ninebox_critical: number;
    };
    nine_box_distribution: DashboardNineBoxCell[];
    at_risk_talents: DashboardAtRiskTalent[];
}

export type DashboardAgentsStatus = Record<DashboardAgentKey, DashboardAgentStatus>;

export interface ManagerDashboardV3Response {
    status: string;
    workflow: string;
    api_version: string;
    user_id: string;
    enterprise_id: string;
    role: string;
    scope: string;
    computed_at: string;
    /** Contrat backend exact (nœud n8n). */
    __duration_ms: number;
    copilot_pulse: DashboardCopilotPulse;
    health: DashboardHealth;
    team: DashboardTeam;
    matchmaker: DashboardMatchmakerSection;
    analyst: DashboardAnalystSection;
    project_state: {
        summary: ProjectStateSummary;
        projects: ProjectStateItem[];
        recent_decisions: DashboardRecentDecision[];
    };
    risk_alerts: {
        summary: WatchdogSummary;
        alerts: DashboardRiskAlert[];
        by_type: Array<{ risk_type: string; count: number }>;
        project_fragility: ProjectFragilityItem[];
    };
    arbitrage_options: {
        summary: StrategistSummary;
        options: DashboardArbitrageOption[];
        option_types: Array<{ type: string; label: string; description: string }>;
    };
    validation_queue: ValidationQueue;
    agents_status: DashboardAgentsStatus;
    agents_active_count: number;
    agents_total: number;
}

export const DASHBOARD_AGENT_KEYS: readonly DashboardAgentKey[] = [
    "observer",
    "watchdog",
    "strategist",
    "matchmaker",
    "analyst",
    "helper",
    "orchestrator",
] as const;
