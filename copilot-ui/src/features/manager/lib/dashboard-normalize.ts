import type { DashboardResponse } from "@/features/manager/types/dashboard";

function pickNum(v: unknown, fallback = 0): number {
    if (v == null || v === "") return fallback;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function pickStr(v: unknown, fallback = ""): string {
    if (v == null) return fallback;
    const s = String(v).trim();
    return s || fallback;
}

function pickBool(v: unknown, fallback = false): boolean {
    if (typeof v === "boolean") return v;
    return fallback;
}

function pickArr<T>(v: unknown): T[] {
    return Array.isArray(v) ? (v as T[]) : [];
}

/** Pass-through léger — structure attendue par l'UI, sans calcul métier. */
export function normalizeManagerDashboardResponse(raw: unknown): DashboardResponse {
    const root = raw != null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const health = (root.health ?? {}) as Record<string, unknown>;
    const kpi = (root.kpi_cards ?? {}) as Record<string, unknown>;
    const widgets = (root.widgets ?? {}) as Record<string, unknown>;
    const agents = (root.agents ?? {}) as Record<string, unknown>;
    const meta = (root.meta ?? {}) as Record<string, unknown>;

    const observer = (agents.observer ?? {}) as Record<string, unknown>;
    const watchdog = (agents.watchdog ?? {}) as Record<string, unknown>;
    const strategist = (agents.strategist ?? {}) as Record<string, unknown>;
    const matchmaker = (agents.matchmaker ?? {}) as Record<string, unknown>;
    const analyst = (agents.analyst ?? {}) as Record<string, unknown>;
    const helper = (agents.helper ?? {}) as Record<string, unknown>;
    const orchestrator = (agents.orchestrator ?? {}) as Record<string, unknown>;

    const os = (observer.stats ?? {}) as Record<string, unknown>;
    const ws = (watchdog.stats ?? {}) as Record<string, unknown>;
    const ss = (strategist.stats ?? {}) as Record<string, unknown>;
    const ms = (matchmaker.stats ?? {}) as Record<string, unknown>;
    const as = (analyst.stats ?? {}) as Record<string, unknown>;
    const hs = (helper.stats ?? {}) as Record<string, unknown>;
    const ors = (orchestrator.stats ?? {}) as Record<string, unknown>;

    const projects = (kpi.projects ?? {}) as Record<string, unknown>;
    const decisions = (kpi.decisions ?? {}) as Record<string, unknown>;
    const alerts = (kpi.alerts ?? {}) as Record<string, unknown>;
    const team = (kpi.team ?? {}) as Record<string, unknown>;

    return {
        status: "success",
        workflow: "WF_Manager_Dashboard",
        enterprise_id: pickStr(root.enterprise_id),
        user_id: pickStr(root.user_id),
        role: (pickStr(root.role, "manager") as DashboardResponse["role"]) || "manager",
        scope: (pickStr(root.scope, "mine") as DashboardResponse["scope"]) || "mine",
        headline: pickStr(root.headline),
        priorities: pickArr(root.priorities),
        health: {
            score: pickNum(health.score),
            label: (pickStr(health.label, "watch") as DashboardResponse["health"]["label"]) || "watch",
            avg_viability: pickNum(health.avg_viability),
        },
        kpi_cards: {
            projects: {
                total: pickNum(projects.total),
                active: pickNum(projects.active),
                planned: pickNum(projects.planned),
                completed: pickNum(projects.completed),
                on_hold: pickNum(projects.on_hold),
            },
            decisions: {
                continue: pickNum(decisions.continue),
                adjust: pickNum(decisions.adjust),
                stop: pickNum(decisions.stop),
                unscored: pickNum(decisions.unscored),
            },
            alerts: {
                total_open: pickNum(alerts.total_open),
                critical_or_high: pickNum(alerts.critical_or_high),
            },
            team: {
                size: pickNum(team.size),
                overloaded: pickNum(team.overloaded),
                contract_ending_soon: pickNum(team.contract_ending_soon),
                with_alerts: pickNum(team.with_alerts),
            },
            pending_rh_actions: pickNum(kpi.pending_rh_actions),
            unread_notifications: pickNum(kpi.unread_notifications),
        },
        widgets: {
            fragile_projects: pickArr(widgets.fragile_projects),
            top_alerts: pickArr(widgets.top_alerts),
            recent_notifications: pickArr(widgets.recent_notifications),
            pending_rh_actions: pickArr(widgets.pending_rh_actions),
            recent_decisions: pickArr(widgets.recent_decisions),
        },
        agents: {
            observer: {
                stats: {
                    projects_analyzed: pickNum(os.projects_analyzed),
                    avg_health_score: pickNum(os.avg_health_score),
                    avg_skill_gap_score: pickNum(os.avg_skill_gap_score),
                    avg_capacity_load_pct: pickNum(os.avg_capacity_load_pct),
                    risk_high_count: pickNum(os.risk_high_count),
                    risk_medium_count: pickNum(os.risk_medium_count),
                    risk_low_count: pickNum(os.risk_low_count),
                    analyses_last_24h: pickNum(os.analyses_last_24h),
                    last_analysis_at: os.last_analysis_at == null ? null : pickStr(os.last_analysis_at) || null,
                },
                active: pickBool(observer.active),
            },
            watchdog: {
                stats: {
                    total_open_alerts: pickNum(ws.total_open_alerts),
                    critical_count: pickNum(ws.critical_count),
                    high_count: pickNum(ws.high_count),
                    medium_count: pickNum(ws.medium_count),
                    low_count: pickNum(ws.low_count),
                    unique_risk_types: pickNum(ws.unique_risk_types),
                    avg_risk_score: pickNum(ws.avg_risk_score),
                    alerts_last_24h: pickNum(ws.alerts_last_24h),
                    last_alert_at: ws.last_alert_at == null ? null : pickStr(ws.last_alert_at) || null,
                },
                by_type: pickArr(watchdog.by_type),
                active: pickBool(watchdog.active),
            },
            strategist: {
                stats: {
                    proposed_count: pickNum(ss.proposed_count),
                    executed_count: pickNum(ss.executed_count),
                    rejected_count: pickNum(ss.rejected_count),
                    reallocation_count: pickNum(ss.reallocation_count),
                    delay_count: pickNum(ss.delay_count),
                    reinforce_count: pickNum(ss.reinforce_count),
                    stop_scope_count: pickNum(ss.stop_scope_count),
                    avg_confidence: pickNum(ss.avg_confidence),
                    options_last_24h: pickNum(ss.options_last_24h),
                },
                top_options: pickArr(strategist.top_options),
                active: pickBool(strategist.active),
            },
            matchmaker: {
                stats: {
                    projects_with_matching: pickNum(ms.projects_with_matching),
                    avg_match_score: pickNum(ms.avg_match_score),
                    total_gaps: pickNum(ms.total_gaps),
                    recruitment_needed: pickNum(ms.recruitment_needed),
                    training_needed: pickNum(ms.training_needed),
                    redeploy_possible: pickNum(ms.redeploy_possible),
                },
                top_unassigned_matches: pickArr(matchmaker.top_unassigned_matches),
                top_skill_gaps: pickArr(matchmaker.top_skill_gaps),
                top_recommendations: pickArr(matchmaker.top_recommendations),
                top_talents_by_project: pickArr(matchmaker.top_talents_by_project),
                ...(matchmaker.explanation != null && String(matchmaker.explanation).trim()
                    ? { explanation: pickStr(matchmaker.explanation) }
                    : {}),
                ...(pickArr(matchmaker.errors).length > 0 ? { errors: pickArr(matchmaker.errors) } : {}),
                ...(matchmaker.llm_enriched_count != null
                    ? { llm_enriched_count: pickNum(matchmaker.llm_enriched_count) }
                    : {}),
                active: pickBool(matchmaker.active),
            },
            analyst: {
                stats: {
                    team_size: pickNum(as.team_size),
                    ipi_evaluated: pickNum(as.ipi_evaluated),
                    mobility_evaluated: pickNum(as.mobility_evaluated),
                    ninebox_evaluated: pickNum(as.ninebox_evaluated),
                    ipi_avg: pickNum(as.ipi_avg),
                    ipi_high_count: pickNum(as.ipi_high_count),
                    ipi_mid_count: pickNum(as.ipi_mid_count),
                    ipi_low_count: pickNum(as.ipi_low_count),
                    stable_count: pickNum(as.stable_count),
                    watch_count: pickNum(as.watch_count),
                    at_risk_count: pickNum(as.at_risk_count),
                    stars_count: pickNum(as.stars_count),
                    critical_box_count: pickNum(as.critical_box_count),
                },
                mobility_breakdown: pickArr(analyst.mobility_breakdown),
                ipi_top_performers: pickArr(analyst.ipi_top_performers),
                at_risk_talents: pickArr(analyst.at_risk_talents),
                nine_box_matrix: analyst.nine_box_matrix ?? pickArr(analyst.nine_box_matrix),
                ...(analyst.nine_box_distribution != null ? { nine_box_distribution: analyst.nine_box_distribution } : {}),
                active: pickBool(analyst.active),
            },
            helper: {
                stats: {
                    total_pending: pickNum(hs.total_pending),
                    conflicts_count: pickNum(hs.conflicts_count),
                    missing_count: pickNum(hs.missing_count),
                    standard_count: pickNum(hs.standard_count),
                    sla_overdue_count: pickNum(hs.sla_overdue_count),
                    urgent_count: pickNum(hs.urgent_count),
                    avg_age_days: pickNum(hs.avg_age_days),
                },
                conflicts: pickArr(helper.conflicts),
                missing_justif: pickArr(helper.missing_justif),
                standard_queue: pickArr(helper.standard_queue),
                active: pickBool(helper.active),
            },
            orchestrator: {
                stats: {
                    total_decisions_30d: pickNum(ors.total_decisions_30d),
                    continue_count: pickNum(ors.continue_count),
                    adjust_count: pickNum(ors.adjust_count),
                    stop_count: pickNum(ors.stop_count),
                    avg_confidence: pickNum(ors.avg_confidence),
                    avg_score: pickNum(ors.avg_score),
                    decisions_last_24h: pickNum(ors.decisions_last_24h),
                },
                active: pickBool(orchestrator.active),
            },
        },
        agents_status: (root.agents_status ?? {}) as DashboardResponse["agents_status"],
        agents_active_count: pickNum(root.agents_active_count),
        agents_total: pickNum(root.agents_total, 7),
        meta: {
            api_version: meta.api_version == null ? undefined : pickStr(meta.api_version),
            computed_at: pickStr(meta.computed_at),
        },
    };
}
