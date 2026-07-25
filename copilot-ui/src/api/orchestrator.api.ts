import { httpClient } from "../lib/http-client";
import { API_CONFIG } from "../config/api.config";
import { logWhatIf } from "@/api/whatif-debug";
import { API_ROUTES } from "@/lib/api-routes";
import type {
    ArbitrageOptionType,
    StrategistTopRecommendation,
    ViabilityRequest,
    ViabilityResponse,
    WhatIfModifications,
    WhatIfResponse,
} from "../types/api.types";

/** Décision Orchestrateur v2 — distincte de Continue/Adjust/Stop de la liste projets. */
export type OrchestratorAskDecision = "Proceed" | "Adjust" | "Reject";

export type OrchestratorAskRequest = {
    question: string;
    context: {
        project_id: string;
        modifications?: WhatIfModifications;
    };
};

/** Impact Strategist — champ `impact` (ou `impact_json` legacy) dans `arbitrage_options`. */
export type OrchestratorArbitrageImpact = {
    expected_risk_reduction?: number;
    expected_capacity_gain_pct?: number;
    delta_days?: number;
    current_milestone_at?: string;
    proposed_milestone_at?: string;
    proposed_hires?: number;
    uncovered_skills?: string[];
    uncovered_skills_count?: number;
    critical_gap_count?: number;
    candidates?: Array<{
        talent_id?: string;
        talent_name?: string;
        current_load_pct?: number;
        matching_skills_count?: number;
        proposed_allocation_pct?: number;
    }>;
    business_cost?: string;
    droppable_requirements?: Array<{
        id?: string;
        skill_id?: string;
        skill_name?: string;
        priority?: number | string;
        weight?: number;
    }>;
    note?: string;
};

/**
 * Option d'arbitrage renvoyée par l'Orchestrateur (tool `strategist_propose`).
 * Champ réel consommé dans l'app : `arbitrage_options` (copilot-data, mission control, détail projet).
 */
export type OrchestratorArbitrageOption = {
    id: string;
    option_type: ArbitrageOptionType;
    rationale: string;
    impact: OrchestratorArbitrageImpact;
    confidence: number;
    status: "proposed" | "executed" | "rejected";
    created_at: string;
};

export type OrchestratorStrategistDecision = {
    recommended_action?: string | null;
    priority_level?: string | null;
    summary?: string | null;
    explanation?: string | null;
    confidence?: number | null;
};

export type OrchestratorAskResponse = {
    status: string;
    workflow: string;
    answer: string;
    data: {
        final_score: number;
        decision: OrchestratorAskDecision | string;
        key_drivers: string[];
        recommendations: string[];
        pending_validations_total: number;
        /** Présent si le tool Strategist a produit des options (variante nested). */
        arbitrage_options?: OrchestratorArbitrageOption[];
        strategist_decision?: OrchestratorStrategistDecision | null;
        top_recommendation?: StrategistTopRecommendation | null;
    };
    /** Champ principal déjà consommé ailleurs (`map-copilot-data`, Mission Control). */
    arbitrage_options?: OrchestratorArbitrageOption[];
    strategist_decision?: OrchestratorStrategistDecision | null;
    top_recommendation?: StrategistTopRecommendation | null;
    triggered_agents: string[];
    meta: {
        fallback_used: boolean;
        agent_error: string | null;
        analysis_run_id: string;
        project_id: string;
        enterprise_id: string;
        duration_ms: number;
    };
};

function asRecord(v: unknown): Record<string, unknown> {
    return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function num(v: unknown): number | undefined {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

function parseOptionType(raw: unknown): ArbitrageOptionType | null {
    const key = str(raw).toLowerCase();
    if (key === "reallocation" || key === "delay" || key === "reinforce" || key === "stop_scope") {
        return key;
    }
    return null;
}

function mapOrchestratorImpact(raw: unknown): OrchestratorArbitrageImpact {
    const o = asRecord(raw);
    const candidatesRaw = Array.isArray(o.candidates) ? o.candidates : [];
    const droppableRaw = Array.isArray(o.droppable_requirements) ? o.droppable_requirements : [];
    const uncoveredRaw = Array.isArray(o.uncovered_skills) ? o.uncovered_skills : [];

    return {
        expected_risk_reduction: num(o.expected_risk_reduction ?? o.score_delta),
        expected_capacity_gain_pct: num(o.expected_capacity_gain_pct ?? o.capacity_delta),
        delta_days: num(o.delta_days ?? o.timeline_days ?? o.delay_days),
        current_milestone_at: str(o.current_milestone_at) || undefined,
        proposed_milestone_at:
            str(o.proposed_milestone_at ?? o.milestone_at ?? o.milestone_date) || undefined,
        proposed_hires: num(o.proposed_hires ?? o.recruitment_count ?? o.recruitments),
        uncovered_skills: uncoveredRaw.map((s) => str(s)).filter(Boolean),
        uncovered_skills_count: num(o.uncovered_skills_count),
        critical_gap_count: num(o.critical_gap_count),
        candidates: candidatesRaw.map((row) => {
            const c = asRecord(row);
            return {
                talent_id: str(c.talent_id) || undefined,
                talent_name: str(c.talent_name ?? c.name) || undefined,
                current_load_pct: num(c.current_load_pct),
                matching_skills_count: num(c.matching_skills_count),
                proposed_allocation_pct: num(c.proposed_allocation_pct),
            };
        }),
        business_cost: str(o.business_cost) || undefined,
        droppable_requirements: droppableRaw.map((row) => {
            const d = asRecord(row);
            return {
                id: str(d.id) || undefined,
                skill_id: str(d.skill_id) || undefined,
                skill_name: str(d.skill_name) || undefined,
                priority: (d.priority as number | string | undefined) ?? undefined,
                weight: num(d.weight),
            };
        }),
        note: str(o.note) || undefined,
    };
}

function mapOrchestratorArbitrageOption(row: unknown): OrchestratorArbitrageOption | null {
    const o = asRecord(row);
    const id = str(o.id);
    const optionType = parseOptionType(o.option_type ?? o.type);
    if (!id || !optionType) return null;

    const statusRaw = str(o.status).toLowerCase();
    const status: OrchestratorArbitrageOption["status"] =
        statusRaw === "executed" || statusRaw === "rejected" ? statusRaw : "proposed";

    const impactSource =
        o.impact != null && typeof o.impact === "object" && !Array.isArray(o.impact)
            ? o.impact
            : o.impact_json != null && typeof o.impact_json === "object" && !Array.isArray(o.impact_json)
              ? o.impact_json
              : {};

    const confidence = num(o.confidence) ?? 0;

    return {
        id,
        option_type: optionType,
        rationale: str(o.rationale) || str(o.label) || "—",
        impact: mapOrchestratorImpact(impactSource),
        confidence,
        status,
        created_at: str(o.created_at) || "",
    };
}

function mapTopRecommendation(raw: unknown): StrategistTopRecommendation | null {
    const o = asRecord(raw);
    const id = str(o.id);
    const optionType = parseOptionType(o.option_type);
    if (!id || !optionType) return null;
    return {
        id,
        option_type: optionType,
        rationale: str(o.rationale) || "—",
        confidence: num(o.confidence) ?? 0,
    };
}

function mapStrategistDecision(raw: unknown): OrchestratorStrategistDecision | null {
    const o = asRecord(raw);
    if (!Object.keys(o).length) return null;
    return {
        recommended_action: str(o.recommended_action) || null,
        priority_level: str(o.priority_level) || null,
        summary: str(o.summary) || null,
        explanation: str(o.explanation) || null,
        confidence: num(o.confidence) ?? null,
    };
}

/**
 * Extrait le tableau d'options — champ réel déjà consommé : `arbitrage_options`.
 * Alias `options` uniquement si présent (forme ProposeResponse / tool strategist_propose).
 */
export function extractOrchestratorArbitrageOptions(
    response: OrchestratorAskResponse | Record<string, unknown>,
): OrchestratorArbitrageOption[] {
    const root = asRecord(response);
    const data = asRecord(root.data);

    const raw =
        (Array.isArray(root.arbitrage_options) && root.arbitrage_options.length
            ? root.arbitrage_options
            : null) ??
        (Array.isArray(data.arbitrage_options) && data.arbitrage_options.length
            ? data.arbitrage_options
            : null) ??
        (Array.isArray(root.options) && root.options.length ? root.options : null) ??
        (Array.isArray(data.options) && data.options.length ? data.options : null) ??
        [];

    return raw
        .map((row) => mapOrchestratorArbitrageOption(row))
        .filter((o): o is OrchestratorArbitrageOption => o != null);
}

export function extractOrchestratorStrategistDecision(
    response: OrchestratorAskResponse | Record<string, unknown>,
): OrchestratorStrategistDecision | null {
    const root = asRecord(response);
    const data = asRecord(root.data);
    return (
        mapStrategistDecision(root.strategist_decision) ??
        mapStrategistDecision(data.strategist_decision)
    );
}

export function extractOrchestratorTopRecommendation(
    response: OrchestratorAskResponse | Record<string, unknown>,
): StrategistTopRecommendation | null {
    const root = asRecord(response);
    const data = asRecord(root.data);
    return mapTopRecommendation(root.top_recommendation) ?? mapTopRecommendation(data.top_recommendation);
}

function normalizeOrchestratorAskResponse(raw: unknown): OrchestratorAskResponse {
    const root = asRecord(raw);
    const data = asRecord(root.data);
    const meta = asRecord(root.meta);

    const arbitrage_options = extractOrchestratorArbitrageOptions(root);
    const strategist_decision = extractOrchestratorStrategistDecision(root);
    const top_recommendation = extractOrchestratorTopRecommendation(root);

    return {
        status: str(root.status) || "success",
        workflow: str(root.workflow),
        answer: typeof root.answer === "string" ? root.answer : str(root.answer),
        data: {
            final_score: num(data.final_score) ?? 0,
            decision: (str(data.decision) || "Adjust") as OrchestratorAskDecision | string,
            key_drivers: Array.isArray(data.key_drivers)
                ? data.key_drivers.map((k) => str(k)).filter(Boolean)
                : [],
            recommendations: Array.isArray(data.recommendations)
                ? data.recommendations.map((k) => str(k)).filter(Boolean)
                : [],
            pending_validations_total: num(data.pending_validations_total) ?? 0,
            arbitrage_options: arbitrage_options.length ? arbitrage_options : undefined,
            strategist_decision,
            top_recommendation,
        },
        arbitrage_options: arbitrage_options.length ? arbitrage_options : undefined,
        strategist_decision,
        top_recommendation,
        triggered_agents: Array.isArray(root.triggered_agents)
            ? root.triggered_agents.map((a) => str(a)).filter(Boolean)
            : [],
        meta: {
            fallback_used: Boolean(meta.fallback_used),
            agent_error: str(meta.agent_error) || null,
            analysis_run_id: str(meta.analysis_run_id),
            project_id: str(meta.project_id),
            enterprise_id: str(meta.enterprise_id),
            duration_ms: num(meta.duration_ms) ?? 0,
        },
    };
}

function toFiniteNumber(value: unknown): number | null {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

/** Formulaires peuvent omettre allocation_pct → 0. Négatif / positif OK (contrat What-If). */
function sanitizeModifications(m: Partial<WhatIfModifications>): WhatIfModifications {
    const allocation = toFiniteNumber(m.allocation_pct);
    const allocation_pct = allocation != null ? allocation : 0;

    let added_talent_id: string | null | undefined = m.added_talent_id;
    if (typeof added_talent_id === "string") {
        const t = added_talent_id.trim();
        if (!t.length) {
            added_talent_id = null;
        } else {
            const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
            // N’envoyer un talent qu’en UUID : un nom (ex. bug données) provoque des 500 côté Orchestrator.
            added_talent_id = uuid ? t : null;
        }
    }

    let training_skill_id: string | null | undefined = m.training_skill_id;
    if (typeof training_skill_id === "string") {
        const t = training_skill_id.trim();
        training_skill_id = t.length ? t : null;
    }

    const out: WhatIfModifications = { allocation_pct };
    if (added_talent_id != null) out.added_talent_id = added_talent_id;
    if (training_skill_id != null) out.training_skill_id = training_skill_id;
    const delay = toFiniteNumber(m.delay_days);
    if (delay != null) out.delay_days = delay;

    return out;
}

export interface CopilotRecomputeResponse {
    success?: boolean;
    status?: string;
    [key: string]: unknown;
}

export const orchestratorApi = {
    computeViability: (body: ViabilityRequest) => httpClient.post<ViabilityResponse>("/webhook/api/project/viability", body),

    /**
     * POST /webhook/api/orchestrator/ask — seul déclencheur Orchestrateur de l'app (onglet Copilot).
     * Latence réelle jusqu'à ~50s : timeout client dédié.
     * Les options Strategist arrivent via le tool interne `strategist_propose` → champ `arbitrage_options`.
     */
    ask: async (body: OrchestratorAskRequest): Promise<OrchestratorAskResponse> => {
        const response = await httpClient.post(API_ROUTES.orchestratorAsk(), body, {
            skipGlobalHttpErrorToast: true,
            timeout: API_CONFIG.ORCHESTRATOR_ASK_TIMEOUT_MS,
        } as Parameters<typeof httpClient.post>[2]);
        return normalizeOrchestratorAskResponse(response.data);
    },

    /**
     * POST /webhook/api/project/what-if — JWT via httpClient.
     * Body : { project_id, modifications } (pas d’enterprise_id côté client).
     */
    whatIf: async (projectId: string, modifications: Partial<WhatIfModifications>) => {
        const body = {
            project_id: projectId,
            modifications: sanitizeModifications(modifications),
        };
        logWhatIf("1/6 — avant appel HTTP POST (orchestratorApi)", {
            url: "/webhook/api/project/what-if",
            body,
            timeoutMs: API_CONFIG.WHAT_IF_TIMEOUT_MS,
        });
        try {
            const response = await httpClient.post<WhatIfResponse>("/webhook/api/project/what-if", body, {
                skipGlobalHttpErrorToast: true,
                timeout: API_CONFIG.WHAT_IF_TIMEOUT_MS,
            });
            logWhatIf("2/6 — réponse HTTP reçue (orchestratorApi)", {
                status: response.status,
                hasData: response.data != null,
            });
            logWhatIf("3/6 — corps JSON parsé (orchestratorApi)", {
                status: (response.data as WhatIfResponse | null)?.status,
                score_before: (response.data as WhatIfResponse | null)?.score_before,
            });
            return response;
        } catch (err) {
            logWhatIf("catch — erreur (orchestratorApi)", err);
            throw err;
        }
    },

    /** POST /webhook/api/copilot/recompute — relance analyses / scores projet (JWT). */
    recomputeFull: (projectId: string) =>
        httpClient.post<CopilotRecomputeResponse>("/webhook/api/copilot/recompute", { project_id: projectId }),

    /** POST `/webhook/api/orchestrator/recompute` — batch ou projet (202 accepted). */
    recompute: (payload: { scope: "all_my_projects" | "project"; project_id?: string }) =>
        httpClient
            .post<{ status: string; message?: string; estimated_duration_seconds?: number }>(
                "/webhook/api/orchestrator/recompute",
                payload,
                { skipGlobalHttpErrorToast: true },
            )
            .then((r) => r.data),
};
