import type {
    ArbitrageOptionType,
    DashboardAgentKey,
    DashboardAgentsStatus,
    DashboardArbitrageOption,
    DashboardCopilotPulse,
    DashboardDecision,
    DashboardHealth,
    DashboardRecentDecision,
    DashboardRiskAlert,
    DashboardUrgency,
    HealthLabel,
    ManagerDashboardV3Response,
    ProjectFragilityItem,
    ProjectStateItem,
    RiskSeverity,
    ValidationConflictItem,
    ValidationQueueItem,
} from "@/features/manager/types/dashboard-v3";
import { DASHBOARD_AGENT_KEYS } from "@/features/manager/types/dashboard-v3";

function pickNum(v: unknown, fallback = 0): number {
    if (v == null || v === "") return fallback;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function pickNullableNum(v: unknown): number | null {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

function pickStr(v: unknown, fallback = ""): string {
    if (v == null) return fallback;
    const s = String(v).trim();
    return s || fallback;
}

function pickArr(v: unknown): unknown[] {
    return Array.isArray(v) ? v : [];
}

function pickRecord(v: unknown): Record<string, unknown> {
    return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function normalizeDecision(raw: unknown): DashboardDecision {
    const s = pickStr(raw).toLowerCase();
    if (s === "continue" || s === "proceed" || s === "go") return "Continue";
    if (s === "adjust" || s === "conditional") return "Adjust";
    if (s === "stop" || s === "reject" || s === "no_go") return "Stop";
    return null;
}

function normalizeUrgency(raw: unknown, healthLabel: HealthLabel): DashboardUrgency {
    const s = pickStr(raw).toLowerCase();
    if (s === "critical" || s === "high" || s === "medium" || s === "low") return s;
    if (healthLabel === "critical") return "critical";
    if (healthLabel === "attention") return "high";
    if (healthLabel === "watch") return "medium";
    return "low";
}

function normalizeSeverity(raw: unknown): RiskSeverity {
    const s = pickStr(raw).toLowerCase();
    if (s === "critical" || s === "critique") return "critical";
    if (s === "high" || s === "élevé" || s === "eleve") return "high";
    if (s === "medium" || s === "moyen") return "medium";
    return "low";
}

function normalizeOptionType(raw: unknown): ArbitrageOptionType {
    const s = pickStr(raw).toLowerCase().replace(/\s+/g, "_");
    if (s === "delay" || s === "report") return "delay";
    if (s === "reinforce" || s === "reinforcement") return "reinforce";
    if (s === "stop_scope" || s === "stop" || s === "scope") return "stop_scope";
    return "reallocation";
}

function normalizeHealthLabel(raw: unknown): HealthLabel {
    const s = pickStr(raw, "watch").toLowerCase();
    if (s === "healthy" || s === "watch" || s === "attention" || s === "critical") return s;
    return "watch";
}

function mapProjectStateItem(raw: unknown): ProjectStateItem | null {
    const r = pickRecord(raw);
    const id = pickStr(r.id ?? r.project_id);
    if (!id) return null;
    const scores = pickRecord(r.scores);
    const alerts = pickRecord(r.alerts);
    return {
        id,
        name: pickStr(r.name ?? r.project_name, id),
        status: pickStr(r.status, "active"),
        priority: pickNullableNum(r.priority),
        milestone_at: r.milestone_at != null ? pickStr(r.milestone_at) : null,
        days_to_deadline: pickNullableNum(r.days_to_deadline ?? r.days_to_milestone),
        viability_score: pickNullableNum(r.viability_score),
        decision: normalizeDecision(r.decision ?? r.latest_decision),
        viability_confidence: pickNullableNum(r.viability_confidence),
        scores: {
            skills_fit: pickNullableNum(scores.skills_fit),
            capacity: pickNullableNum(scores.capacity),
            budget: pickNullableNum(scores.budget),
            risk: pickNullableNum(scores.risk),
        },
        health_score: pickNullableNum(r.health_score ?? r.project_health_score),
        delay_days: pickNullableNum(r.delay_days),
        capacity_load_pct: pickNullableNum(r.capacity_load_pct),
        skill_gap_score: pickNullableNum(r.skill_gap_score),
        capacity_ratio: pickNullableNum(r.capacity_ratio),
        fragility_score: pickNullableNum(r.fragility_score),
        anxiety_pulse: pickNullableNum(r.anxiety_pulse),
        alerts: {
            total: pickNum(alerts.total ?? r.alerts_count ?? r.active_alerts_count),
            critical: pickNum(alerts.critical ?? r.critical_alerts_count),
        },
        team_size: pickNum(r.team_size),
        budget_consumed_pct: pickNullableNum(r.budget_consumed_pct),
    };
}

function mapRiskAlert(raw: unknown): DashboardRiskAlert | null {
    const r = pickRecord(raw);
    const id = pickStr(r.id ?? r.alert_id ?? r.risk_alert_id);
    if (!id) return null;
    return {
        id,
        risk_type: pickStr(r.risk_type ?? r.category),
        severity: normalizeSeverity(r.severity),
        message: pickStr(r.message ?? r.description ?? r.title),
        risk_score: pickNum(r.risk_score),
        entity_type: pickStr(r.entity_type),
        entity_id: pickStr(r.entity_id),
        impact_area: pickStr(r.impact_area),
        owner_role: pickStr(r.owner_role),
        detected_at: pickStr(r.detected_at ?? r.created_at),
        project_id: pickStr(r.project_id),
        project_name: pickStr(r.project_name),
        age_hours: pickNum(r.age_hours),
        pdf_rule: pickStr(r.pdf_rule ?? r.risk_type),
    };
}

function mapProjectFragility(raw: unknown): ProjectFragilityItem | null {
    const r = pickRecord(raw);
    const project_id = pickStr(r.project_id);
    if (!project_id) return null;
    return {
        project_id,
        project_name: pickStr(r.project_name, project_id),
        fragility_score: pickNum(r.fragility_score),
        anxiety_pulse: pickNum(r.anxiety_pulse),
        key_talent_dependency_score: pickNum(r.key_talent_dependency_score),
        chronic_overload_score: pickNum(r.chronic_overload_score),
        critical_skills_gap_score: pickNum(r.critical_skills_gap_score),
    };
}

function mapArbitrageOption(raw: unknown): DashboardArbitrageOption | null {
    const r = pickRecord(raw);
    const id = pickStr(r.id ?? r.option_id);
    if (!id) return null;
    const statusRaw = pickStr(r.status, "proposed").toLowerCase();
    const status =
        statusRaw === "executed" || statusRaw === "rejected" || statusRaw === "proposed"
            ? statusRaw
            : "proposed";
    return {
        id,
        option_type: normalizeOptionType(r.option_type ?? r.type),
        rationale: pickStr(r.rationale ?? r.description),
        confidence: pickNum(r.confidence),
        status,
        created_at: pickStr(r.created_at),
        impact_json: pickRecord(r.impact_json ?? r.impact),
        project_id: pickStr(r.project_id),
        project_name: pickStr(r.project_name),
        project_priority: pickNullableNum(r.project_priority),
        trade_off_label: pickStr(r.trade_off_label ?? r.label),
        user_confirmation_required: r.user_confirmation_required == null ? true : Boolean(r.user_confirmation_required),
        audit_logged: r.audit_logged == null ? true : Boolean(r.audit_logged),
    };
}

function mapValidationConflict(raw: unknown): ValidationConflictItem | null {
    const r = pickRecord(raw);
    const id = pickStr(r.id);
    if (!id) return null;
    return {
        id,
        type: pickStr(r.type),
        title: pickStr(r.title ?? r.message),
        talent_name: pickStr(r.talent_name),
        conflicting_project: pickStr(r.conflicting_project ?? r.project_name),
        age_days: pickNum(r.age_days),
        priority_score: pickNum(r.priority_score),
        why_explanation: pickStr(r.why_explanation ?? r.explanation),
        sla_overdue: Boolean(r.sla_overdue),
    };
}

function mapValidationQueueItem(raw: unknown): ValidationQueueItem | null {
    const r = pickRecord(raw);
    const id = pickStr(r.id);
    if (!id) return null;
    return {
        id,
        type: pickStr(r.type),
        title: pickStr(r.title ?? r.message),
        talent_name: pickStr(r.talent_name),
        age_days: pickNum(r.age_days),
        priority_score: pickNum(r.priority_score),
        why_explanation: pickStr(r.why_explanation ?? r.explanation ?? r.message),
    };
}

function mapRecentDecision(raw: unknown): DashboardRecentDecision | null {
    const row = pickRecord(raw);
    const id = pickStr(row.id);
    if (!id) return null;
    return {
        id,
        decision: pickStr(row.decision),
        reason: row.reason != null ? pickStr(row.reason) : null,
        score: pickNullableNum(row.score),
        confidence: pickNullableNum(row.confidence),
        project_id: pickStr(row.project_id),
        project_name: pickStr(row.project_name),
        created_at: pickStr(row.created_at),
    };
}

function mapCopilotPulse(raw: unknown, headline: string, healthLabel: HealthLabel): DashboardCopilotPulse {
    const r = pickRecord(raw);
    const priorities = pickArr(r.priority_actions ?? r.priorities).map((p, i) => {
        const row = pickRecord(p);
        return {
            rank: pickNum(row.rank, i + 1),
            icon: pickStr(row.icon, "•"),
            label: pickStr(row.label),
            action: pickStr(row.action ?? row.link),
        };
    });
    return {
        headline: pickStr(r.headline, headline),
        urgency: normalizeUrgency(r.urgency, healthLabel),
        priority_actions: priorities,
    };
}

function mapHealth(raw: unknown): DashboardHealth {
    const h = pickRecord(raw);
    return {
        score: pickNum(h.score),
        label: normalizeHealthLabel(h.label),
        avg_viability: pickNum(h.avg_viability),
    };
}

function emptyAgentsStatus(): DashboardAgentsStatus {
    return Object.fromEntries(DASHBOARD_AGENT_KEYS.map((k) => [k, { active: false, has_data: false }])) as DashboardAgentsStatus;
}

function mapAgentsStatus(raw: unknown): DashboardAgentsStatus {
    const src = pickRecord(raw);
    const out = emptyAgentsStatus();
    for (const key of DASHBOARD_AGENT_KEYS) {
        const row = pickRecord(src[key]);
        out[key] = {
            active: Boolean(row.active ?? row.status === "active"),
            has_data: Boolean(row.has_data ?? (row.status != null && row.status !== "empty")),
        };
    }
    return out;
}

function isV3Payload(root: Record<string, unknown>): boolean {
    return root.project_state != null && typeof root.project_state === "object";
}

function mapTeam(raw: unknown, kpiTeam: Record<string, unknown>): ManagerDashboardV3Response["team"] {
    const t = pickRecord(raw);
    return {
        total: pickNum(t.total ?? kpiTeam.size),
        overloaded: pickNum(t.overloaded ?? kpiTeam.overloaded),
        contract_ending_90d: pickNum(t.contract_ending_90d ?? t.contract_ending_soon ?? kpiTeam.contract_ending_soon),
    };
}

function mapMatchmaker(raw: unknown): ManagerDashboardV3Response["matchmaker"] {
    const m = pickRecord(raw);
    const summary = pickRecord(m.summary ?? m.stats);
    return {
        summary: {
            projects_scored: pickNum(summary.projects_scored ?? summary.projects_with_gaps ?? summary.projects_with_matching),
            avg_match_score: pickNum(summary.avg_match_score),
            total_skill_gaps: pickNum(summary.total_skill_gaps ?? summary.projects_with_gaps ?? summary.total_gaps),
            needs_recruitment: pickNum(summary.needs_recruitment ?? summary.recruitment_needed),
            can_redeploy: pickNum(summary.can_redeploy),
        },
        top_skill_gaps: pickArr(m.top_skill_gaps).map((g) => {
            const row = pickRecord(g);
            return {
                skill_name: pickStr(row.skill_name ?? row.skill),
                category: pickStr(row.category),
                projects_affected: pickNum(row.projects_affected ?? (row.project_name ? 1 : 0)),
                critical_count: pickNum(row.critical_count),
                avg_gap_size: pickNum(row.avg_gap_size ?? row.gap_score ?? row.score),
            };
        }),
        top_available_talents: pickArr(m.top_available_talents).map((tal) => {
            const row = pickRecord(tal);
            const availability = pickNullableNum(row.availability_pct ?? row.availability);
            const loadFromAvail = availability != null ? Math.max(0, 100 - availability) : null;
            return {
                talent_id: pickStr(row.talent_id ?? row.id),
                talent_name: pickStr(row.talent_name ?? row.name),
                job_title: pickStr(row.job_title ?? row.top_skill ?? row.skill),
                current_load_pct: pickNum(row.current_load_pct ?? loadFromAvail),
            };
        }),
    };
}

function mapAnalyst(raw: unknown): ManagerDashboardV3Response["analyst"] {
    const a = pickRecord(raw);
    const summary = pickRecord(a.summary ?? a.stats);
    const nineRaw = a.nine_box_distribution ?? a.nine_box_matrix;
    const nine_box_distribution = Array.isArray(nineRaw)
        ? pickArr(nineRaw).map((cell) => {
              const row = pickRecord(cell);
              return { box_label: pickStr(row.box_label ?? row.label), count: pickNum(row.count) };
          })
        : [];

    return {
        summary: {
            team_size: pickNum(summary.team_size),
            ipi_avg: pickNum(summary.ipi_avg),
            ipi_top: pickNum(summary.ipi_top),
            ipi_at_risk: pickNum(summary.ipi_at_risk ?? summary.at_risk_count),
            mob_stable: pickNum(summary.mob_stable ?? summary.stable_count),
            mob_watch: pickNum(summary.mob_watch ?? summary.watch_count),
            mob_at_risk: pickNum(summary.mob_at_risk ?? summary.at_risk_count),
            ninebox_stars: pickNum(summary.ninebox_stars),
            ninebox_critical: pickNum(summary.ninebox_critical),
        },
        nine_box_distribution,
        at_risk_talents: pickArr(a.at_risk_talents).map((tal) => {
            const row = pickRecord(tal);
            return {
                talent_id: pickStr(row.talent_id ?? row.id),
                talent_name: pickStr(row.talent_name ?? row.name),
                ipi_score: pickNullableNum(row.ipi_score),
                ipi_band: pickStr(row.ipi_band ?? row.band),
                mobility_flag: pickStr(row.mobility_flag, "stable"),
                mobility_score: pickNullableNum(row.mobility_score),
                box_label: pickStr(row.box_label),
                has_watchdog_alert: Boolean(row.has_watchdog_alert),
                contract_risk: row.contract_risk != null ? pickStr(row.contract_risk) : null,
            };
        }),
    };
}

function mapFromV3(root: Record<string, unknown>): ManagerDashboardV3Response {
    const health = mapHealth(root.health);
    const ps = pickRecord(root.project_state);
    const psSummary = pickRecord(ps.summary);
    const byStatus = pickRecord(psSummary.by_status);
    const byDecision = pickRecord(psSummary.by_decision);
    const trend = pickRecord(psSummary.viability_trend_7d);
    const ra = pickRecord(root.risk_alerts);
    const raSummary = pickRecord(ra.summary);
    const ao = pickRecord(root.arbitrage_options);
    const aoSummary = pickRecord(ao.summary);
    const aoByType = pickRecord(aoSummary.by_type);
    const vq = pickRecord(root.validation_queue);
    const vqSummary = pickRecord(vq.summary);

    return {
        status: pickStr(root.status, "success"),
        workflow: pickStr(root.workflow, "WF_Manager_Dashboard"),
        api_version: pickStr(root.api_version ?? pickRecord(root.meta).api_version),
        user_id: pickStr(root.user_id),
        enterprise_id: pickStr(root.enterprise_id),
        role: pickStr(root.role, "manager"),
        scope: pickStr(root.scope, "mine"),
        computed_at: pickStr(root.computed_at ?? pickRecord(root.meta).computed_at),
        __duration_ms: pickNum(root.__duration_ms ?? root.duration_ms),
        copilot_pulse: mapCopilotPulse(root.copilot_pulse, pickStr(root.headline), health.label),
        health,
        project_state: {
            summary: {
                total: pickNum(psSummary.total),
                by_status: {
                    active: pickNum(byStatus.active),
                    planned: pickNum(byStatus.planned),
                    completed: pickNum(byStatus.completed),
                },
                by_decision: {
                    continue: pickNum(byDecision.continue),
                    adjust: pickNum(byDecision.adjust),
                    stop: pickNum(byDecision.stop),
                    unscored: pickNum(byDecision.unscored),
                },
                avg_viability_score: pickNum(psSummary.avg_viability_score),
                avg_health_score: pickNum(psSummary.avg_health_score),
                viability_trend_7d: { this_week: pickNum(trend.this_week), last_week: pickNum(trend.last_week) },
            },
            projects: pickArr(ps.projects).map(mapProjectStateItem).filter((p): p is ProjectStateItem => p != null),
            recent_decisions: pickArr(ps.recent_decisions)
                .map(mapRecentDecision)
                .filter((d): d is DashboardRecentDecision => d != null),
        },
        risk_alerts: {
            summary: {
                total_open: pickNum(raSummary.total_open),
                critical: pickNum(raSummary.critical),
                high: pickNum(raSummary.high),
                medium: pickNum(raSummary.medium),
                new_24h: pickNum(raSummary.new_24h),
                avg_risk_score: pickNum(raSummary.avg_risk_score),
            },
            alerts: pickArr(ra.alerts).map(mapRiskAlert).filter((a): a is DashboardRiskAlert => a != null),
            by_type: pickArr(ra.by_type).map((t) => {
                const row = pickRecord(t);
                return { risk_type: pickStr(row.risk_type), count: pickNum(row.count) };
            }),
            project_fragility: pickArr(ra.project_fragility)
                .map(mapProjectFragility)
                .filter((p): p is ProjectFragilityItem => p != null),
        },
        arbitrage_options: {
            summary: {
                proposed: pickNum(aoSummary.proposed),
                executed: pickNum(aoSummary.executed),
                rejected: pickNum(aoSummary.rejected),
                by_type: {
                    reallocation: pickNum(aoByType.reallocation),
                    delay: pickNum(aoByType.delay),
                    reinforce: pickNum(aoByType.reinforce),
                    stop_scope: pickNum(aoByType.stop_scope),
                },
                avg_confidence: pickNum(aoSummary.avg_confidence),
            },
            options: pickArr(ao.options).map(mapArbitrageOption).filter((o): o is DashboardArbitrageOption => o != null),
            option_types: pickArr(ao.option_types).map((t) => {
                const row = pickRecord(t);
                return { type: pickStr(row.type), label: pickStr(row.label), description: pickStr(row.description) };
            }),
        },
        validation_queue: {
            summary: {
                total_pending: pickNum(vqSummary.total_pending),
                conflicts: pickNum(vqSummary.conflicts),
                missing_justif: pickNum(vqSummary.missing_justif),
                standard_queue: pickNum(vqSummary.standard_queue),
                sla_overdue: pickNum(vqSummary.sla_overdue),
                urgent_count: pickNum(vqSummary.urgent_count),
                avg_age_days: pickNum(vqSummary.avg_age_days),
            },
            conflicts: pickArr(vq.conflicts).map(mapValidationConflict).filter((v): v is ValidationConflictItem => v != null),
            missing_justif: pickArr(vq.missing_justif).map(mapValidationQueueItem).filter((v): v is ValidationQueueItem => v != null),
            standard_queue: pickArr(vq.standard_queue).map(mapValidationQueueItem).filter((v): v is ValidationQueueItem => v != null),
            priority_rules: pickArr(vq.priority_rules).map((r) => {
                const row = pickRecord(r);
                return {
                    order: pickNum(row.order),
                    rule: pickStr(row.rule),
                    label: pickStr(row.label),
                    description: pickStr(row.description),
                };
            }),
        },
        agents_status: mapAgentsStatus(root.agents_status),
        agents_active_count: pickNum(root.agents_active_count),
        agents_total: pickNum(root.agents_total, 7),
        team: mapTeam(root.team, pickRecord(pickRecord(root.kpi_cards).team)),
        matchmaker: mapMatchmaker(root.matchmaker),
        analyst: mapAnalyst(root.analyst),
    };
}

function mapFromLegacy(root: Record<string, unknown>): ManagerDashboardV3Response {
    const health = mapHealth(root.health);
    const kpi = pickRecord(root.kpi_cards);
    const projectsKpi = pickRecord(kpi.projects);
    const decisionsKpi = pickRecord(kpi.decisions);
    const alertsKpi = pickRecord(kpi.alerts);
    const widgets = pickRecord(root.widgets);
    const agents = pickRecord(root.agents);
    const watchdog = pickRecord(agents.watchdog);
    const ws = pickRecord(watchdog.stats);
    const strategist = pickRecord(agents.strategist);
    const ss = pickRecord(strategist.stats);
    const helper = pickRecord(agents.helper);
    const hs = pickRecord(helper.stats);
    const meta = pickRecord(root.meta);

    const fragileProjects = pickArr(widgets.fragile_projects).map(mapProjectStateItem).filter((p): p is ProjectStateItem => p != null);
    const topAlerts = pickArr(widgets.top_alerts).map(mapRiskAlert).filter((a): a is DashboardRiskAlert => a != null);
    const topOptions = pickArr(strategist.top_options).map(mapArbitrageOption).filter((o): o is DashboardArbitrageOption => o != null);

    return {
        status: pickStr(root.status, "success"),
        workflow: pickStr(root.workflow, "WF_Manager_Dashboard"),
        api_version: pickStr(meta.api_version),
        user_id: pickStr(root.user_id),
        enterprise_id: pickStr(root.enterprise_id),
        role: pickStr(root.role, "manager"),
        scope: pickStr(root.scope, "mine"),
        computed_at: pickStr(meta.computed_at),
        __duration_ms: pickNum(root.__duration_ms ?? root.duration_ms),
        copilot_pulse: mapCopilotPulse(root.copilot_pulse, pickStr(root.headline), health.label),
        health,
        project_state: {
            summary: {
                total: pickNum(projectsKpi.total),
                by_status: {
                    active: pickNum(projectsKpi.active),
                    planned: pickNum(projectsKpi.planned),
                    completed: pickNum(projectsKpi.completed),
                },
                by_decision: {
                    continue: pickNum(decisionsKpi.continue),
                    adjust: pickNum(decisionsKpi.adjust),
                    stop: pickNum(decisionsKpi.stop),
                    unscored: pickNum(decisionsKpi.unscored),
                },
                avg_viability_score: health.avg_viability,
                avg_health_score: health.score,
                viability_trend_7d: { this_week: 0, last_week: 0 },
            },
            projects: fragileProjects,
            recent_decisions: pickArr(widgets.recent_decisions)
                .map(mapRecentDecision)
                .filter((d): d is DashboardRecentDecision => d != null),
        },
        risk_alerts: {
            summary: {
                total_open: pickNum(ws.total_open_alerts ?? alertsKpi.total_open),
                critical: pickNum(ws.critical_count),
                high: pickNum(ws.high_count),
                medium: pickNum(ws.medium_count),
                new_24h: pickNum(ws.alerts_last_24h),
                avg_risk_score: pickNum(ws.avg_risk_score),
            },
            alerts: topAlerts,
            by_type: pickArr(watchdog.by_type).map((t) => {
                const row = pickRecord(t);
                return { risk_type: pickStr(row.risk_type), count: pickNum(row.count) };
            }),
            project_fragility: fragileProjects.map((p) => ({
                project_id: p.id,
                project_name: p.name,
                fragility_score: p.fragility_score ?? 0,
                anxiety_pulse: p.anxiety_pulse ?? 0,
                key_talent_dependency_score: 0,
                chronic_overload_score: 0,
                critical_skills_gap_score: p.skill_gap_score ?? 0,
            })),
        },
        arbitrage_options: {
            summary: {
                proposed: pickNum(ss.proposed_count),
                executed: pickNum(ss.executed_count),
                rejected: pickNum(ss.rejected_count),
                by_type: {
                    reallocation: pickNum(ss.reallocation_count),
                    delay: pickNum(ss.delay_count),
                    reinforce: pickNum(ss.reinforce_count),
                    stop_scope: pickNum(ss.stop_scope_count),
                },
                avg_confidence: pickNum(ss.avg_confidence),
            },
            options: topOptions,
            option_types: [],
        },
        validation_queue: {
            summary: {
                total_pending: pickNum(hs.total_pending),
                conflicts: pickNum(hs.conflicts_count),
                missing_justif: pickNum(hs.missing_count),
                standard_queue: pickNum(hs.standard_count),
                sla_overdue: pickNum(hs.sla_overdue_count),
                urgent_count: pickNum(hs.urgent_count),
                avg_age_days: pickNum(hs.avg_age_days),
            },
            conflicts: pickArr(helper.conflicts).map(mapValidationConflict).filter((v): v is ValidationConflictItem => v != null),
            missing_justif: pickArr(helper.missing_justif)
                .map(mapValidationQueueItem)
                .filter((v): v is ValidationQueueItem => v != null),
            standard_queue: pickArr(helper.standard_queue)
                .map(mapValidationQueueItem)
                .filter((v): v is ValidationQueueItem => v != null),
            priority_rules: [],
        },
        agents_status: mapAgentsStatus(root.agents_status),
        agents_active_count: pickNum(root.agents_active_count),
        agents_total: pickNum(root.agents_total, 7),
        team: mapTeam(root.team, pickRecord(kpi.team)),
        matchmaker: mapMatchmaker(root.matchmaker ?? agents.matchmaker),
        analyst: mapAnalyst(root.analyst ?? agents.analyst),
    };
}

export function normalizeManagerDashboardV3Response(raw: unknown): ManagerDashboardV3Response {
    const root = pickRecord(raw);
    return isV3Payload(root) ? mapFromV3(root) : mapFromLegacy(root);
}
