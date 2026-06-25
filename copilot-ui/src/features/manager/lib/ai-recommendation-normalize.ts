import type {
    AiActiveRisk,
    AiArbitrageOption,
    AiRecommendation,
    AiTopAction,
} from "@/features/manager/types/ai-recommendation";

function pickOptionalString(value: unknown): string | null {
    if (value == null) return null;
    const s = String(value).trim();
    return s || null;
}

function pickOptionalNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeTopAction(raw: unknown): AiTopAction | null {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
    const t = raw as Record<string, unknown>;
    return {
        id: pickOptionalString(t.id),
        type: pickOptionalString(t.type),
        label: pickOptionalString(t.label),
        rationale: pickOptionalString(t.rationale),
        confidence: pickOptionalNumber(t.confidence),
    };
}

function normalizeArbitrageOption(raw: unknown): AiArbitrageOption | null {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    const id = pickOptionalString(r.id);
    if (!id) return null;
    return {
        id,
        type: pickOptionalString(r.type ?? r.option_type),
        label: pickOptionalString(r.label),
        rationale: pickOptionalString(r.rationale),
        confidence: pickOptionalNumber(r.confidence),
    };
}

function normalizeActiveRisk(raw: unknown): AiActiveRisk | null {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    const id = pickOptionalString(r.id);
    if (!id) return null;
    return {
        id,
        title: pickOptionalString(r.title),
        message: pickOptionalString(r.message ?? r.description),
        description: pickOptionalString(r.description),
        severity: pickOptionalString(r.severity) as AiActiveRisk["severity"],
        risk_type: pickOptionalString(r.risk_type ?? r.risk_code ?? r.category),
        alert_code: pickOptionalString(r.alert_code),
    };
}

function normalizeStringArray(raw: unknown): string[] | null {
    if (!Array.isArray(raw)) return null;
    const items = raw.map((item) => String(item ?? "").trim()).filter(Boolean);
    return items.length > 0 ? items : null;
}

/** Pass-through des champs `ai_recommendation` renvoyés par n8n — aucun calcul métier. */
export function normalizeAiRecommendation(raw: unknown): AiRecommendation | null {
    if (raw == null) return null;
    if (typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;

    const arbitrage_options = Array.isArray(r.arbitrage_options)
        ? r.arbitrage_options
              .map((item) => normalizeArbitrageOption(item))
              .filter((item): item is AiArbitrageOption => item != null)
        : null;

    const risks_active = Array.isArray(r.risks_active)
        ? r.risks_active.map((item) => normalizeActiveRisk(item)).filter((item): item is AiActiveRisk => item != null)
        : null;

    return {
        decision: r.decision === null ? null : pickOptionalString(r.decision),
        decision_label: pickOptionalString(r.decision_label),
        decision_color: pickOptionalString(r.decision_color),
        decision_icon: pickOptionalString(r.decision_icon),
        viability_score: pickOptionalNumber(r.viability_score),
        reason: pickOptionalString(r.reason),
        reason_label: pickOptionalString(r.reason_label),
        source_agent: pickOptionalString(r.source_agent),
        confidence: pickOptionalNumber(r.confidence),
        explanation: pickOptionalString(r.explanation),
        top_action: normalizeTopAction(r.top_action),
        arbitrages_pending: pickOptionalNumber(r.arbitrages_pending),
        risks_count: pickOptionalNumber(r.risks_count),
        arbitrage_options: arbitrage_options && arbitrage_options.length > 0 ? arbitrage_options : null,
        risks_active: risks_active && risks_active.length > 0 ? risks_active : null,
        warnings: normalizeStringArray(r.warnings),
    };
}

export const AI_SEVERITY_RANK: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
};

export function sortAiRisksBySeverity(risks: AiActiveRisk[]): AiActiveRisk[] {
    return [...risks].sort((a, b) => {
        const sa = AI_SEVERITY_RANK[String(a.severity ?? "").toLowerCase()] ?? 99;
        const sb = AI_SEVERITY_RANK[String(b.severity ?? "").toLowerCase()] ?? 99;
        return sa - sb;
    });
}
