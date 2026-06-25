export type AgentStatus = "active" | "empty" | "inactive" | "unknown";

export type HealthLabel = "healthy" | "watch" | "attention" | "critical";

export type Decision = "Continue" | "Adjust" | "Stop" | null;

export type Severity = "critical" | "high" | "medium" | "low";

export interface ObserverStats {
    projects_analyzed: number;
    avg_health_score: number;
    avg_skill_gap_score: number;
    avg_capacity_load_pct: number;
    risk_high_count: number;
    risk_medium_count: number;
    risk_low_count: number;
    analyses_last_24h: number;
    last_analysis_at: string | null;
}

export interface WatchdogStats {
    total_open_alerts: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    unique_risk_types: number;
    avg_risk_score: number;
    alerts_last_24h: number;
    last_alert_at: string | null;
}

export interface StrategistStats {
    proposed_count: number;
    executed_count: number;
    rejected_count: number;
    reallocation_count: number;
    delay_count: number;
    reinforce_count: number;
    stop_scope_count: number;
    avg_confidence: number;
    options_last_24h: number;
}

export interface MatchmakerStats {
    projects_with_matching: number;
    avg_match_score: number;
    total_gaps: number;
    recruitment_needed: number;
    training_needed: number;
    redeploy_possible: number;
}

export interface AnalystStats {
    team_size: number;
    ipi_evaluated: number;
    mobility_evaluated: number;
    ninebox_evaluated: number;
    ipi_avg: number;
    ipi_high_count: number;
    ipi_mid_count: number;
    ipi_low_count: number;
    stable_count: number;
    watch_count: number;
    at_risk_count: number;
    stars_count: number;
    critical_box_count: number;
}

export interface HelperStats {
    total_pending: number;
    conflicts_count: number;
    missing_count: number;
    standard_count: number;
    sla_overdue_count: number;
    urgent_count: number;
    avg_age_days: number;
}

export interface OrchestratorStats {
    total_decisions_30d: number;
    continue_count: number;
    adjust_count: number;
    stop_count: number;
    avg_confidence: number;
    avg_score: number;
    decisions_last_24h: number;
}

export interface FragileProjectWidget {
    id: string;
    name: string;
    status?: string | null;
    priority?: number | null;
    viability_score?: number | null;
    decision?: string | null;
    project_health_score?: number | null;
    alerts_count?: number | null;
    critical_alerts_count?: number | null;
    team_size?: number | null;
    milestone_at?: string | null;
}

export interface TopAlertWidget {
    id: string;
    project_id?: string | null;
    project_name?: string | null;
    risk_type?: string | null;
    severity?: string | null;
    message?: string | null;
    risk_score?: number | null;
    age_hours?: number | null;
    detected_at?: string | null;
    impact_area?: string | null;
}

export interface RecentDecisionWidget {
    id: string;
    decision?: string | null;
    reason?: string | null;
    score?: number | null;
    confidence?: number | null;
    project_id?: string | null;
    project_name?: string | null;
    created_at?: string | null;
}

export interface DashboardResponse {
    status: "success";
    workflow: "WF_Manager_Dashboard";
    enterprise_id: string;
    user_id: string;
    role: "manager" | "rh";
    scope: "mine" | "enterprise";
    headline: string;
    priorities: Array<{ icon: string; label: string; link: string }>;
    health: { score: number; label: HealthLabel; avg_viability: number };
    kpi_cards: {
        projects: { total: number; active: number; planned: number; completed: number; on_hold: number };
        decisions: { continue: number; adjust: number; stop: number; unscored: number };
        alerts: { total_open: number; critical_or_high: number };
        team: { size: number; overloaded: number; contract_ending_soon: number; with_alerts: number };
        pending_rh_actions: number;
        unread_notifications: number;
    };
    widgets: {
        fragile_projects: FragileProjectWidget[];
        top_alerts: TopAlertWidget[];
        recent_notifications: unknown[];
        pending_rh_actions: unknown[];
        recent_decisions: RecentDecisionWidget[];
    };
    agents: {
        observer: { stats: ObserverStats; active: boolean };
        watchdog: { stats: WatchdogStats; by_type: Array<{ risk_type: string; count: number }>; active: boolean };
        strategist: { stats: StrategistStats; top_options: unknown[]; active: boolean };
        matchmaker: {
            stats: MatchmakerStats;
            top_unassigned_matches: unknown[];
            top_skill_gaps: unknown[];
            top_recommendations?: unknown[];
            top_talents_by_project?: unknown[];
            explanation?: string;
            errors?: unknown[];
            llm_enriched_count?: number;
            active: boolean;
        };
        analyst: {
            stats: AnalystStats;
            mobility_breakdown: unknown[];
            ipi_top_performers: unknown[];
            at_risk_talents: unknown[];
            nine_box_matrix: unknown;
            nine_box_distribution?: unknown;
            active: boolean;
        };
        helper: { stats: HelperStats; conflicts: unknown[]; missing_justif: unknown[]; standard_queue: unknown[]; active: boolean };
        orchestrator: { stats: OrchestratorStats; active: boolean };
    };
    agents_status: Record<string, { name?: string; status: AgentStatus; active: boolean }>;
    agents_active_count: number;
    agents_total: number;
    meta: { api_version?: string; computed_at: string };
}
