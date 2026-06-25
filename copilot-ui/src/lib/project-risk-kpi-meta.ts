import type { ProjectDetailResponse } from "@/types/api.types";

function readFiniteNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function readFragilityFromBag(bag: Record<string, unknown> | null | undefined): number | null {
    if (!bag) return null;
    return readFiniteNumber(bag.fragility_score);
}

/**
 * Lit `fragility_score` depuis le détail projet (Risk_KPI / `project_risk_scores`).
 * TODO backend: garantir `risk_scores.fragility_score` dans GET `/manager/projects/:id` si absent.
 */
export function readProjectFragilityScore(detail?: ProjectDetailResponse): number | null {
    if (!detail) return null;

    const fromRiskScores = readFragilityFromBag(detail.risk_scores as Record<string, unknown> | null | undefined);
    if (fromRiskScores != null) return fromRiskScores;

    const fromProjectRiskScores = readFragilityFromBag(
        detail.project_risk_scores as Record<string, unknown> | null | undefined,
    );
    if (fromProjectRiskScores != null) return fromProjectRiskScores;

    const projectBag = detail.project as unknown as Record<string, unknown> | undefined;
    const nestedRiskScore = projectBag?.risk_score;
    if (nestedRiskScore && typeof nestedRiskScore === "object") {
        const fromProject = readFragilityFromBag(nestedRiskScore as Record<string, unknown>);
        if (fromProject != null) return fromProject;
    }

    return null;
}

/** Conversion affichage : fragilité 0 = sain, 10 = danger → santé sur /10. */
export function fragilityToHealthDisplayScore(fragility: number): number {
    return Math.max(0, Math.min(10, +(10 - fragility).toFixed(1)));
}

/** Lit `risk_kpi.last_run_at` ou `risks.last_run_at` si le backend l'expose — sinon `null`. */
export function readRiskKpiLastRunAt(detail?: ProjectDetailResponse): string | null {
    const fromMeta = detail?.risk_kpi?.last_run_at;
    if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();

    const risksRaw = detail?.risks as unknown;
    if (risksRaw && typeof risksRaw === "object" && !Array.isArray(risksRaw)) {
        const nested = (risksRaw as Record<string, unknown>).last_run_at;
        if (typeof nested === "string" && nested.trim()) return nested.trim();
    }

    return null;
}
