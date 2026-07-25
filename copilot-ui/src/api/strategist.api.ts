import { buildBrowserFetchN8nUrl } from "@/lib/build-n8n-url";
import { authStorage } from "@/lib/auth-storage";
import { getApiAuthToken } from "@/utils/apiClient";
import type {
    ArbitrageImpactJson,
    ArbitrageOption,
    ArbitrageOptionStatus,
    ArbitrageOptionType,
    ExecuteRequest,
    ExecuteResponse,
    ProposeRequest,
    ProposeResponse,
    StrategistTopRecommendation,
} from "@/types/api.types";

const STRATEGIST_PROPOSE_PATH = "/webhook/api/strategist/propose";
const STRATEGIST_EXECUTE_PATH = "/webhook/api/strategist/execute";

const OPTION_TYPE_LABELS: Record<ArbitrageOptionType, string> = {
    reallocation: "Réallocation",
    delay: "Report",
    reinforce: "Renforcer",
    stop_scope: "Stop / Scope",
};

function asRecord(v: unknown): Record<string, unknown> {
    return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

export class StrategistApiError extends Error {
    readonly code?: string;
    readonly httpStatus?: number;

    constructor(message: string, code?: string, httpStatus?: number) {
        super(message);
        this.name = "StrategistApiError";
        this.code = code;
        this.httpStatus = httpStatus;
    }
}

function strategistErrorMessage(payload: unknown, fallback: string): string {
    const body = asRecord(payload);
    if (str(body.status).toLowerCase() === "error") {
        const code = str(body.code);
        const message = str(body.message) || fallback;
        return code ? `${message} (${code})` : message;
    }
    return str(body.message ?? body.error ?? body.detail) || fallback;
}

async function strategistFetch<T>(path: string, body: unknown): Promise<T> {
    const token = authStorage.getAccessToken()?.trim() || getApiAuthToken()?.trim() || "";
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(buildBrowserFetchN8nUrl(path), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    let payload: unknown = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    const bodyRecord = asRecord(payload);
    const errorCode = str(bodyRecord.code) || undefined;
    const errorMessage = strategistErrorMessage(payload, response.statusText || "Erreur Strategist");

    if (response.status >= 400 || str(bodyRecord.status).toLowerCase() === "error") {
        throw new StrategistApiError(errorMessage, errorCode, response.status);
    }

    return payload as T;
}

function parseOptionType(raw: unknown): ArbitrageOptionType | undefined {
    const key = str(raw).toLowerCase() as ArbitrageOptionType;
    return key === "reallocation" || key === "delay" || key === "reinforce" || key === "stop_scope" ? key : undefined;
}

function mapImpactToJson(impactRaw: Record<string, unknown>): ArbitrageImpactJson {
    return {
        score_delta:
            typeof impactRaw.expected_risk_reduction === "number"
                ? impactRaw.expected_risk_reduction
                : undefined,
        capacity_delta:
            typeof impactRaw.expected_capacity_gain_pct === "number"
                ? impactRaw.expected_capacity_gain_pct
                : undefined,
        timeline_days: typeof impactRaw.delta_days === "number" ? impactRaw.delta_days : undefined,
        budget_impact:
            typeof impactRaw.proposed_hires === "number" ? impactRaw.proposed_hires : undefined,
    };
}

function mapArbitrageOption(row: unknown): ArbitrageOption | null {
    const o = asRecord(row);
    const id = str(o.id);
    if (!id) return null;

    const optionType = parseOptionType(o.option_type);
    const impactRaw = asRecord(o.impact);
    const statusRaw = str(o.status).toLowerCase();
    const status: ArbitrageOptionStatus =
        statusRaw === "executed" || statusRaw === "rejected" || statusRaw === "expired"
            ? statusRaw
            : "proposed";

    const confidence = typeof o.confidence === "number" ? o.confidence : Number(o.confidence) || 0;

    return {
        id,
        label: optionType ? OPTION_TYPE_LABELS[optionType] : str(o.label) || "Option",
        rationale: str(o.rationale) || "—",
        impact_score:
            typeof impactRaw.expected_risk_reduction === "number" ? impactRaw.expected_risk_reduction : 0,
        option_type: optionType,
        impact_json: Object.keys(impactRaw).length ? mapImpactToJson(impactRaw) : null,
        confidence,
        status,
        created_at: str(o.created_at) || undefined,
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
        confidence: typeof o.confidence === "number" ? o.confidence : Number(o.confidence) || 0,
    };
}

export function normalizeProposeResponse(data: unknown): ProposeResponse {
    const root = asRecord(data);
    const rawOptions = Array.isArray(root.options) ? root.options : [];
    const options = rawOptions
        .map((row) => mapArbitrageOption(row))
        .filter((o): o is ArbitrageOption => o != null);

    return {
        status: "success",
        enterprise_id: str(root.enterprise_id) || undefined,
        project_id: str(root.project_id) || undefined,
        project_name: str(root.project_name) || undefined,
        analysis_run_id: str(root.analysis_run_id) || undefined,
        manager_summary: str(root.manager_summary) || undefined,
        top_recommendation: mapTopRecommendation(root.top_recommendation),
        options,
        context_summary:
            root.context_summary && typeof root.context_summary === "object"
                ? (root.context_summary as ProposeResponse["context_summary"])
                : undefined,
        ai:
            root.ai && typeof root.ai === "object"
                ? (root.ai as ProposeResponse["ai"])
                : undefined,
    };
}

function parseDecisionStatus(
    raw: unknown,
): NonNullable<ExecuteResponse["decision_executed"]>["status"] {
    const s = str(raw).toLowerCase();
    if (s === "rejected") return "rejected";
    if (s === "logged_only") return "logged_only";
    if (s === "failed") return "failed";
    return "executed";
}

export function normalizeExecuteResponse(data: unknown): ExecuteResponse {
    const root = asRecord(data);
    const decision = asRecord(root.decision_executed);
    const db = asRecord(root.db_result);
    const projectUpdated = asRecord(db.project_updated);
    const impact = asRecord(decision.impact);
    const uiRaw = asRecord(root.ui);

    const summary = str(decision.summary);
    const businessEffect = str(decision.business_effect);

    const badges = Array.isArray(uiRaw.badges)
        ? uiRaw.badges
              .map((row) => {
                  const b = asRecord(row);
                  const label = str(b.label);
                  if (!label) return null;
                  return { label, tone: str(b.tone) || "neutral" };
              })
              .filter((b): b is { label: string; tone: string } => b != null)
        : undefined;

    const highlights = Array.isArray(uiRaw.highlights)
        ? uiRaw.highlights.map((h) => str(h)).filter(Boolean)
        : undefined;

    return {
        status: str(root.status) || "success",
        action: (str(root.action) === "reject" ? "reject" : "execute") as ExecuteResponse["action"],
        option_id: str(root.option_id) || undefined,
        option_type: parseOptionType(root.option_type),
        project_id: str(root.project_id) || undefined,
        decision_executed: summary
            ? {
                  action: str(decision.action) || str(root.option_type),
                  summary,
                  business_effect: businessEffect,
                  status: parseDecisionStatus(decision.status),
                  impact: {
                      delay_days: typeof impact.delay_days === "number" ? impact.delay_days : 0,
                      dropped_requirements_count:
                          typeof impact.dropped_requirements_count === "number"
                              ? impact.dropped_requirements_count
                              : 0,
                      project_paused: Boolean(impact.project_paused),
                  },
              }
            : undefined,
        ui:
            badges?.length || highlights?.length
                ? {
                      badges: badges?.length ? badges : undefined,
                      highlights: highlights?.length ? highlights : undefined,
                  }
                : undefined,
        db_result: {
            project_updated: str(projectUpdated.id)
                ? { id: str(projectUpdated.id), milestone_at: str(projectUpdated.milestone_at) || null }
                : null,
            option_status: str(db.option_status) || undefined,
            rh_action_id: str(db.rh_action_id) || null,
            copilot_decision_id: str(db.copilot_decision_id) || null,
            notification_id: str(db.notification_id) || null,
        },
        user_message: summary || undefined,
        success: str(root.status).toLowerCase() === "success",
    };
}

export const strategistApi = {
    propose: async (body: ProposeRequest) => {
        const enterprise_id = body.enterprise_id?.trim();
        const project_id = body.project_id?.trim();
        if (!enterprise_id || !project_id) {
            throw new StrategistApiError("enterprise_id et project_id requis", "VALIDATION_FAILED", 400);
        }

        const data = await strategistFetch<unknown>(STRATEGIST_PROPOSE_PATH, {
            enterprise_id,
            project_id,
            use_ai: body.use_ai ?? true,
        });
        return { data: normalizeProposeResponse(data) };
    },

    execute: async (body: ExecuteRequest) => {
        const enterprise_id = body.enterprise_id?.trim();
        const option_id = body.option_id?.trim();
        if (!enterprise_id || !option_id) {
            throw new StrategistApiError("enterprise_id et option_id requis", "VALIDATION_FAILED", 400);
        }

        const payload: Record<string, string> = {
            enterprise_id,
            option_id,
            action: body.action,
        };
        const actor = body.actor_user_id?.trim();
        if (actor) payload.actor_user_id = actor;
        const runId = body.orchestrator_run_id?.trim();
        if (runId) payload.orchestrator_run_id = runId;

        const data = await strategistFetch<unknown>(STRATEGIST_EXECUTE_PATH, payload);
        return { data: normalizeExecuteResponse(data) };
    },
};
