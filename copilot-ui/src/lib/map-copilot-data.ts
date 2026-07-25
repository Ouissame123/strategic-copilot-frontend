import type {
    CopilotArbitrageOption,
    CopilotData,
    CopilotRecommendation,
    CopilotRecommendationAction,
    CopilotRisk,
    CopilotScores,
    CopilotSourceAgents,
    CopilotSourceAgentEntry,
} from "@/types/copilot-data.types";

function asRecord(raw: unknown): Record<string, unknown> | null {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
    return raw as Record<string, unknown>;
}

function asArray(raw: unknown): unknown[] {
    return Array.isArray(raw) ? raw : [];
}

function passthroughNumber(value: unknown): number | null | undefined {
    if (value == null) return value as null | undefined;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function passthroughString(value: unknown): string | null | undefined {
    if (value == null) return value as null | undefined;
    const s = String(value).trim();
    return s || null;
}

function mapScores(raw: unknown): CopilotScores | null {
    const r = asRecord(raw);
    if (!r) return null;
    return {
        skills_fit: passthroughNumber(r.skills_fit),
        capacity: passthroughNumber(r.capacity),
        budget: passthroughNumber(r.budget),
        risk: passthroughNumber(r.risk),
    };
}

function mapRecommendationActions(raw: unknown): CopilotRecommendationAction[] {
    return asArray(raw)
        .map((item) => {
            const r = asRecord(item);
            if (!r) return null;
            return {
                priority: passthroughNumber(r.priority),
                type: passthroughString(r.type),
                rationale: passthroughString(r.rationale),
                owner_role: passthroughString(r.owner_role),
                linked_arbitrage_id: passthroughString(r.linked_arbitrage_id),
            };
        })
        .filter((item): item is CopilotRecommendationAction => item != null);
}

function mapRecommendation(raw: unknown): CopilotRecommendation | null {
    const r = asRecord(raw);
    if (!r) return null;
    const keyDrivers = asArray(r.key_drivers)
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
    const warnings = asArray(r.warnings)
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
    const actions = mapRecommendationActions(r.actions);
    return {
        summary: passthroughString(r.summary),
        key_drivers: keyDrivers.length ? keyDrivers : null,
        actions: actions.length ? actions : null,
        warnings: warnings.length ? warnings : null,
    };
}

function mapRisks(raw: unknown): CopilotRisk[] {
    return asArray(raw)
        .map((item) => {
            const r = asRecord(item);
            if (!r) return null;
            return {
                type: passthroughString(r.type ?? r.risk_type ?? r.risk_code),
                severity: passthroughString(r.severity),
                title: passthroughString(r.title),
                description: passthroughString(r.description ?? r.message),
                source_agent: passthroughString(r.source_agent),
            };
        })
        .filter((item): item is CopilotRisk => item != null);
}

function mapArbitrageOptions(raw: unknown): CopilotArbitrageOption[] {
    return asArray(raw)
        .map((item) => {
            const r = asRecord(item);
            if (!r) return null;
            const impactRaw = r.impact;
            const impact =
                impactRaw != null && typeof impactRaw === "object" && !Array.isArray(impactRaw)
                    ? (impactRaw as CopilotArbitrageOption["impact"])
                    : null;
            return {
                id: passthroughString(r.id),
                option_type: passthroughString(r.option_type ?? r.type),
                rationale: passthroughString(r.rationale ?? r.label),
                confidence: passthroughNumber(r.confidence),
                impact,
            };
        })
        .filter((item): item is CopilotArbitrageOption => item != null);
}

function mapSourceAgentEntry(raw: unknown): CopilotSourceAgentEntry | null {
    const r = asRecord(raw);
    if (!r) return null;
    return {
        status: passthroughString(r.status),
        duration_ms: passthroughNumber(r.duration_ms),
        manager_summary: passthroughString(r.manager_summary),
        confidence: passthroughNumber(r.confidence),
    };
}

function mapSourceAgents(raw: unknown): CopilotSourceAgents | null {
    const r = asRecord(raw);
    if (!r) return null;
    return {
        project_analysis: mapSourceAgentEntry(r.project_analysis),
        talent_matching: mapSourceAgentEntry(r.talent_matching),
        risk_kpi: mapSourceAgentEntry(r.risk_kpi),
        strategist: mapSourceAgentEntry(r.strategist),
        llm_synthesize: mapSourceAgentEntry(r.llm_synthesize),
    };
}

/** Extraction pass-through depuis un blob API (viability ou racine wmp-detail). */
export function mapRawToCopilotData(raw: unknown): CopilotData | null {
    const r = asRecord(raw);
    if (!r) return null;

    const viabilityScore =
        passthroughNumber(r.viability_score) ??
        passthroughNumber(r.score);

    const scores =
        mapScores(r.scores) ??
        mapScores({
            skills_fit: r.score_skills_fit ?? r.skills_fit,
            capacity: r.score_capacity ?? r.capacity,
            budget: r.score_budget ?? r.budget,
            risk: r.score_risk ?? r.risk,
        });

    const recommendation = mapRecommendation(r.recommendation);
    const decision = passthroughString(r.decision);
    const hasSignal =
        viabilityScore != null ||
        decision != null ||
        recommendation?.summary != null ||
        (recommendation?.key_drivers?.length ?? 0) > 0 ||
        (scores?.skills_fit != null || scores?.capacity != null || scores?.budget != null || scores?.risk != null);

    if (!hasSignal) return null;

    return {
        status: passthroughString(r.status),
        viability_score: viabilityScore,
        decision,
        decision_reason_code: passthroughString(r.decision_reason_code ?? r.reason_code ?? r.reason),
        confidence_score: passthroughNumber(r.confidence_score ?? r.confidence),
        scores,
        kpi: asRecord(r.kpi) ? (r.kpi as CopilotData["kpi"]) : null,
        risks: mapRisks(r.risks ?? r.risks_active),
        arbitrage_options: mapArbitrageOptions(r.arbitrage_options),
        strategist_decision: asRecord(r.strategist_decision)
            ? (r.strategist_decision as CopilotData["strategist_decision"])
            : null,
        recommendation,
        explanation: passthroughString(r.explanation),
        source_agents: mapSourceAgents(r.source_agents),
        llm_enriched: r.llm_enriched === true ? true : r.llm_enriched === false ? false : null,
        computed_at: passthroughString(r.computed_at),
    };
}

/** Fusionne `latest_viability` et champs racine wmp-detail sans recalcul métier. */
export function extractCopilotDataFromDetailRoot(rawRoot: Record<string, unknown>): CopilotData | null {
    const direct = mapRawToCopilotData(rawRoot);
    if (direct) return direct;

    const latest = rawRoot.latest_viability;
    if (latest != null && typeof latest === "object" && !Array.isArray(latest)) {
        const lv = latest as Record<string, unknown>;
        const merged: Record<string, unknown> = {
            ...lv,
            arbitrage_options: rawRoot.arbitrage_options ?? lv.arbitrage_options,
            recommendation: rawRoot.recommendation ?? lv.recommendation,
            risks: rawRoot.risks ?? lv.risks ?? rawRoot.active_alerts,
            source_agents: rawRoot.source_agents ?? lv.source_agents,
            kpi: rawRoot.kpi ?? rawRoot.latest_kpi ?? lv.kpi,
            llm_enriched: rawRoot.llm_enriched ?? lv.llm_enriched,
            strategist_decision: rawRoot.strategist_decision ?? lv.strategist_decision,
            explanation: lv.explanation ?? rawRoot.explanation,
            computed_at: lv.computed_at ?? rawRoot.computed_at,
        };
        const fromLatest = mapRawToCopilotData(merged);
        if (fromLatest) return fromLatest;
    }

    const ai = rawRoot.ai_recommendation;
    if (ai != null) {
        const fromAi = mapRawToCopilotData(ai);
        if (fromAi) {
            return {
                ...fromAi,
                arbitrage_options:
                    fromAi.arbitrage_options?.length
                        ? fromAi.arbitrage_options
                        : mapArbitrageOptions(rawRoot.arbitrage_options),
                risks: fromAi.risks?.length ? fromAi.risks : mapRisks(rawRoot.risks ?? rawRoot.active_alerts),
                source_agents: fromAi.source_agents ?? mapSourceAgents(rawRoot.source_agents),
            };
        }
    }

    return null;
}

export function hasCopilotAnalysis(data: CopilotData | null | undefined): boolean {
    if (!data) return false;
    return (
        data.viability_score != null ||
        data.decision != null ||
        Boolean(data.recommendation?.summary) ||
        (data.recommendation?.key_drivers?.length ?? 0) > 0 ||
        (data.arbitrage_options?.length ?? 0) > 0
    );
}
