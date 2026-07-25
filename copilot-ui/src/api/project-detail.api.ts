/**
 * Mission Control — GET/PATCH projet + agents IA (Orchestrator, Strategist, What-If).
 */
import { getManagerProjectDetailGetUrl } from "@/config/manager-projects-api.config";
import { managerProjectsApi, normalizeProjectDetail } from "@/api/manager-projects.api";
import { httpClient } from "@/lib/http-client";
import { API_ROUTES } from "@/lib/api-routes";
import { extractCopilotDataFromDetailRoot } from "@/lib/map-copilot-data";
import { normalizeAiRecommendation } from "@/features/manager/lib/ai-recommendation-normalize";
import type {
    ExecuteArbitrageRequest,
    ManagerProjectDetailResponse,
    PatchProjectPayload,
    ProjectDetail,
    ProjectDetailResponse,
    ProjectViability,
    ProjectViabilityDecision,
    RecomputeRequest,
    WhatIfRequest,
    WhatIfResponse,
} from "@/types/api.types";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function num(v: unknown): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function normalizeViabilityDecision(raw: unknown): ProjectViabilityDecision | null {
    const d = String(raw ?? "").trim();
    if (d === "Proceed" || d === "Continue") return "Proceed";
    if (d === "Adjust") return "Adjust";
    if (d === "Reject" || d === "Stop") return "Reject";
    return null;
}

/** Mappe `viability` / `latest_viability` du même GET — jamais de score inventé. */
function mapProjectViability(rawRoot: Record<string, unknown>, latest: ProjectDetailResponse["latest_viability"]): ProjectViability | null {
    const candidates: unknown[] = [rawRoot.viability, latest];
    for (const candidate of candidates) {
        if (candidate == null || typeof candidate !== "object" || Array.isArray(candidate)) continue;
        const o = candidate as Record<string, unknown>;
        const score = num(o.score ?? o.viability_score);
        const decision = normalizeViabilityDecision(o.decision);
        if (score == null || decision == null) continue;
        return {
            score,
            decision,
            explanation: o.explanation == null ? "" : String(o.explanation),
            computed_at: str(o.computed_at),
        };
    }
    return null;
}

function mapProjectDetail(
    raw: ProjectDetailResponse | ManagerProjectDetailResponse,
    enterpriseId: string,
    status: string,
    aiRaw: unknown,
    rawRoot: Record<string, unknown>,
): ProjectDetail {
    const p = raw.project;
    const latestViability = raw.latest_viability
        ? {
              viability_score:
                  num(
                      (raw.latest_viability as { viability_score?: unknown }).viability_score ??
                          (raw.latest_viability as { score?: unknown }).score,
                  ) ?? 0,
              decision: (raw.latest_viability.decision as ProjectDetail["latest_viability"] extends infer T
                  ? T extends null
                      ? never
                      : T extends { decision: infer D }
                        ? D
                        : never
                  : never) ?? "Continue",
              reason_code: str(
                  (raw.latest_viability as { reason_code?: unknown }).reason_code ??
                      (raw.latest_viability as { reason?: unknown }).reason,
              ),
              confidence: num((raw.latest_viability as { confidence?: unknown }).confidence) ?? 0,
              score_skills_fit: num((raw.latest_viability as { score_skills_fit?: unknown }).score_skills_fit) ?? null,
              score_capacity: num((raw.latest_viability as { score_capacity?: unknown }).score_capacity) ?? null,
              score_budget: num((raw.latest_viability as { score_budget?: unknown }).score_budget) ?? null,
              score_risk: num((raw.latest_viability as { score_risk?: unknown }).score_risk) ?? null,
              explanation: raw.latest_viability.explanation ?? null,
              computed_at: str(raw.latest_viability.computed_at),
          }
        : null;

    return {
        status,
        enterprise_id: enterpriseId,
        project: {
            id: p.id,
            name: p.name,
            status: p.status,
            priority: p.priority ?? null,
            milestone_at: p.milestone_at ?? null,
            start_date: p.start_date ?? null,
            budget_rh_planned: p.budget_rh_planned ?? null,
            budget_rh_actual: (p as { budget_rh_actual?: number }).budget_rh_actual ?? null,
            description: p.description ?? null,
            created_at: (p as { created_at?: string }).created_at ?? "",
            updated_at: (p as { updated_at?: string }).updated_at ?? "",
            capacity_load_pct: num((p as { capacity_load_pct?: unknown }).capacity_load_pct),
        },
        assignments: (raw.assignments ?? []).map((a) => ({
            id: str(a.id) || a.talent_id,
            talent_id: a.talent_id,
            talent_name: a.talent_name ?? null,
            talent_email: a.talent_email ?? null,
            allocation_pct: Number(a.allocation_pct) || 0,
            role_on_project: a.role_on_project ?? null,
            assignment_type: (a.assignment_type as ProjectDetail["assignments"][0]["assignment_type"]) ?? "full_time",
            start_date: a.start_date ?? null,
            end_date: a.end_date ?? null,
            status: str(a.status) || "active",
        })),
        requirements: (raw.requirements ?? []).map((r) => ({
            id: r.id,
            skill_id: r.skill_id,
            skill_name: r.skill_name ?? null,
            level_required: (r as { level_required?: number }).level_required ?? r.required_level ?? null,
            criticality: (r as { criticality?: string }).criticality ?? null,
            is_mandatory: (r as { is_mandatory?: boolean }).is_mandatory ?? true,
            weight: (r as { weight?: number }).weight ?? null,
        })),
        active_alerts: (raw.active_alerts ?? []).map((a) => ({
            id: a.id,
            risk_type: str(a.risk_type ?? a.title),
            severity: (a.severity as ProjectDetail["active_alerts"][0]["severity"]) ?? "medium",
            message: str(a.message ?? a.description ?? a.title),
            risk_score: num(a.risk_score) ?? 0,
            entity_type: str((a as { entity_type?: string }).entity_type) || "project",
            entity_id: str((a as { entity_id?: string }).entity_id) || p.id,
            impact_area: str((a as { impact_area?: string }).impact_area) || "delivery",
            owner_role: str((a as { owner_role?: string }).owner_role) || "manager",
            detected_at: str((a as { detected_at?: string }).detected_at) || "",
            pdf_rule: (a as { pdf_rule?: string }).pdf_rule,
        })),
        latest_viability: latestViability,
        viability: mapProjectViability(rawRoot, raw.latest_viability),
        latest_kpi: raw.latest_kpi
            ? {
                  progress_pct: raw.latest_kpi.progress_pct ?? null,
                  delay_days: raw.latest_kpi.delay_days ?? null,
                  capacity_load_pct: raw.latest_kpi.capacity_load_pct ?? null,
                  time_to_impact_days: (raw.latest_kpi as { time_to_impact_days?: number }).time_to_impact_days ?? null,
                  strategic_alignment_score: raw.latest_kpi.strategic_alignment_score ?? null,
                  project_health_score: raw.latest_kpi.project_health_score ?? null,
                  computed_at: str(raw.latest_kpi.computed_at),
              }
            : null,
        risk_scores: mapRiskScores((raw as { risk_scores?: unknown }).risk_scores),
        arbitrage_options: (raw.arbitrage_options ?? []).map((o) => ({
            id: o.id,
            option_type: o.option_type ?? "reallocation",
            rationale: o.rationale ?? o.label ?? "",
            confidence: num(o.confidence) ?? 0,
            status: (o.status === "executed" || o.status === "rejected" ? o.status : "proposed") as
                | "proposed"
                | "executed"
                | "rejected",
            created_at: str(o.created_at),
            impact_json: (o.impact_json as ProjectDetail["arbitrage_options"][0]["impact_json"]) ?? {},
            trade_off_label: (o as { trade_off_label?: string }).trade_off_label,
            user_confirmation_required: (o as { user_confirmation_required?: boolean }).user_confirmation_required,
            audit_logged: (o as { audit_logged?: boolean }).audit_logged,
        })),
        ai_recommendation: mapAiToDetail(aiRaw),
    };
}

function mapRiskScores(raw: unknown): ProjectDetail["risk_scores"] {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    return {
        fragility_score: num(r.fragility_score),
        anxiety_pulse: num(r.anxiety_pulse),
        key_talent_dependency_score: num(r.key_talent_dependency_score),
        chronic_overload_score: num(r.chronic_overload_score),
        critical_skills_gap_score: num(r.critical_skills_gap_score),
        conflict_score: num(r.conflict_score),
        turnover_score: num(r.turnover_score),
        computed_at: str(r.computed_at) || null,
    };
}

function mapAiToDetail(raw: unknown): ProjectDetail["ai_recommendation"] {
    const ai = normalizeAiRecommendation(raw);
    if (!ai) return null;
    return {
        decision: (ai.decision as ProjectDetail["ai_recommendation"] extends infer T
            ? T extends null
                ? never
                : T extends { decision: infer D }
                  ? D
                  : never
            : never) ?? null,
        decision_label: ai.decision_label ?? "",
        decision_color: (ai.decision_color as "green" | "orange" | "red" | "gray") ?? "gray",
        decision_icon: ai.decision_icon ?? "",
        viability_score: ai.viability_score,
        reason_code: ai.reason ?? "",
        reason_label: ai.reason_label ?? "",
        source_agent: ai.source_agent ?? "orchestrator",
        confidence: ai.confidence,
        explanation: ai.explanation,
        scores: {
            skills_fit: null,
            capacity: null,
            budget: null,
            risk: null,
        },
        arbitrage_options: [],
        risks_active: (ai.risks_active ?? []).map((r) => ({
            id: r.id ?? "",
            risk_type: r.risk_type ?? "",
            severity: (r.severity as ProjectDetail["active_alerts"][0]["severity"]) ?? "medium",
            message: r.message ?? r.description ?? "",
            risk_score: 0,
            entity_type: "project",
            entity_id: "",
            impact_area: "",
            owner_role: "manager",
            detected_at: "",
        })),
        computed_at: null,
    };
}

export async function fetchProjectDetail(id: string): Promise<ProjectDetail> {
    const res = await httpClient.get<ProjectDetailResponse | ManagerProjectDetailResponse>(
        getManagerProjectDetailGetUrl(id),
        { skipGlobalHttpErrorToast: true },
    );
    const rawRoot = unwrapN8nRoot(res.data) as Record<string, unknown>;
    const data = normalizeProjectDetail(res.data, id);
    const enterprise_id = str(rawRoot.enterprise_id) || str((data as ManagerProjectDetailResponse).enterprise_id);
    const status = str(rawRoot.status) || "success";
    const aiRaw = rawRoot.ai_recommendation ?? (data as Record<string, unknown>).ai_recommendation;
    const detail = mapProjectDetail(data, enterprise_id, status, aiRaw, rawRoot);
    return {
        ...detail,
        copilot_data: extractCopilotDataFromDetailRoot(rawRoot),
    };
}

export async function patchProject(id: string, payload: PatchProjectPayload): Promise<ProjectDetail> {
    await managerProjectsApi.update(id, payload);
    return fetchProjectDetail(id);
}

export async function recomputeProject(payload: RecomputeRequest): Promise<unknown> {
    const { data } = await httpClient.post(API_ROUTES.viability(), {
        ...payload,
        force_refresh: payload.force_refresh ?? true,
        enable_strategist: true,
    });
    return data;
}

export async function simulateWhatIf(payload: WhatIfRequest): Promise<WhatIfResponse> {
    const { data } = await httpClient.post<WhatIfResponse>(
        API_ROUTES.whatIf(),
        {
            project_id: payload.project_id,
            enterprise_id: payload.enterprise_id,
            modifications: payload.modifications,
        },
        { timeout: 120_000 },
    );
    return data;
}

export async function executeArbitrage(payload: ExecuteArbitrageRequest): Promise<unknown> {
    const { data } = await httpClient.post(API_ROUTES.strategistExecute(), payload);
    return data;
}
