import type { ScoreBreakdown, WhatIfResponse } from "@/api/whatif.types";

export type ParsedWhatIfAction = {
    priority: number | null;
    type: string;
    rationale: string;
    owner_role: string;
};

export type ParsedWhatIfArbitrageOption = {
    option_type: string;
    rationale: string;
    confidence: number | null;
    impact: Record<string, unknown> | null;
};

export type ParsedWhatIfRecommendation = {
    summary: string | null;
    actions: ParsedWhatIfAction[];
    arbitrage_options: ParsedWhatIfArbitrageOption[];
};

export type BreakdownDimensionKey = "planning" | "capacity" | "alignment" | "skill_coverage";

export const BREAKDOWN_DIMENSIONS: { key: BreakdownDimensionKey; labelKey: string; legacyKeys?: string[] }[] = [
    { key: "planning", labelKey: "breakdownPlanning", legacyKeys: ["budget"] },
    { key: "capacity", labelKey: "breakdownCapacity" },
    { key: "alignment", labelKey: "breakdownAlignment", legacyKeys: ["risk"] },
    { key: "skill_coverage", labelKey: "breakdownSkillCoverage", legacyKeys: ["skills_fit"] },
];

function asRecord(v: unknown): Record<string, unknown> | null {
    return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function readStr(v: unknown): string {
    return v != null && String(v).trim() ? String(v).trim() : "";
}

function readNum(v: unknown): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export function parseWhatIfRecommendation(
    raw: WhatIfResponse["recommendation"] | WhatIfResponse["ai_recommendation"],
): ParsedWhatIfRecommendation {
    if (raw == null) {
        return { summary: null, actions: [], arbitrage_options: [] };
    }
    if (typeof raw === "string") {
        const s = raw.trim();
        return { summary: s || null, actions: [], arbitrage_options: [] };
    }

    const o = asRecord(raw);
    if (!o) return { summary: null, actions: [], arbitrage_options: [] };

    const summary = readStr(o.summary) || null;

    const actionsRaw = o.actions;
    const actions: ParsedWhatIfAction[] = Array.isArray(actionsRaw)
        ? actionsRaw.map((item) => {
              const r = asRecord(item) ?? {};
              return {
                  priority: readNum(r.priority),
                  type: readStr(r.type ?? r.action_type ?? r.option_type) || "—",
                  rationale: readStr(r.rationale ?? r.action_summary ?? r.summary ?? r.message) || "—",
                  owner_role: readStr(r.owner_role) || "—",
              };
          })
        : [];

    const arbitrageRaw = o.arbitrage_options;
    const arbitrage_options: ParsedWhatIfArbitrageOption[] = Array.isArray(arbitrageRaw)
        ? arbitrageRaw.map((item) => {
              const r = asRecord(item) ?? {};
              const impactRaw = r.impact ?? r.impact_json;
              return {
                  option_type: readStr(r.option_type ?? r.type) || "—",
                  rationale: readStr(r.rationale ?? r.label) || "—",
                  confidence: readNum(r.confidence),
                  impact: asRecord(impactRaw),
              };
          })
        : [];

    return { summary, actions, arbitrage_options };
}

export function readWhatIfNarrative(result: WhatIfResponse): string | null {
    const n = result.what_if_narrative;
    return typeof n === "string" && n.trim() ? n.trim() : null;
}

/** Texte recommandation : `ai_recommendation` prioritaire, sinon `recommendation`. */
export function readAiRecommendationText(result: WhatIfResponse): string | null {
    const fromAi = parseWhatIfRecommendation(result.ai_recommendation);
    if (fromAi.summary) return fromAi.summary;
    const fromLegacy = parseWhatIfRecommendation(result.recommendation);
    return fromLegacy.summary;
}

export function readApproximationNotes(result: WhatIfResponse): string[] {
    const notes = result.approximation_notes;
    if (!Array.isArray(notes)) return [];
    return notes.map((n) => String(n ?? "").trim()).filter(Boolean);
}

export function readBreakdownValue(breakdown: ScoreBreakdown | null | undefined, key: BreakdownDimensionKey): number | null {
    if (!breakdown) return null;
    const direct = breakdown[key];
    if (direct != null && Number.isFinite(Number(direct))) return Number(direct);

    const dim = BREAKDOWN_DIMENSIONS.find((d) => d.key === key);
    for (const legacy of dim?.legacyKeys ?? []) {
        const v = (breakdown as Record<string, unknown>)[legacy];
        if (v != null && Number.isFinite(Number(v))) return Number(v);
    }
    return null;
}

/** Provenance : badge IA uniquement si `llm_enriched === true` (jamais si LLM échoué). */
export function isLlmEnriched(result: WhatIfResponse): boolean {
    return result.llm_enriched === true;
}
