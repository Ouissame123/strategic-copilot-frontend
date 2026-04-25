/**
 * WF_Talent_Matching — GET ou POST `project_id` (variables `VITE_PROJECT_TALENT_MATCHING_*`).
 */

import {
    getProjectTalentMatchingPath,
    getProjectTalentMatchingUrl,
} from "@/config/project-api";
import type {
    TalentMatchingRecommendedAction,
    TalentMatchingResult,
} from "@/types/talent-matching";
import { apiGet, apiPost, getHttpTimeoutMs } from "@/utils/apiClient";
import type { ApiClientOptions } from "@/utils/apiClient";

const toNumber = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

const talentMatchingUsePost = (import.meta.env as Record<string, string | undefined>).VITE_PROJECT_TALENT_MATCHING_USE_POST === "true";

/** GET ou POST brut (pour enchaînement avec d’autres appels en parallèle). */
export async function fetchTalentMatchingHttp(
    projectId: string,
    opts: { timeout: number; signal?: AbortSignal },
): Promise<unknown> {
    if (talentMatchingUsePost) {
        return apiPost<unknown>(getProjectTalentMatchingPath(projectId), { project_id: projectId }, opts);
    }
    return apiGet<unknown>(getProjectTalentMatchingUrl(projectId), opts);
}

export function parseTalentMatchingPayload(raw: unknown, projectId: string): TalentMatchingResult | null {
    if (!raw || typeof raw !== "object") return null;
    const payload = raw as Record<string, unknown>;
    if (payload.status && String(payload.status).toLowerCase() !== "success") return null;
    const kpiRaw = (payload.kpi ?? {}) as Record<string, unknown>;
    const kpi = {
        skills_fit_score: toNumber(kpiRaw.skills_fit_score, 0),
        availability_score: toNumber(kpiRaw.availability_score, 0),
        overall_score: toNumber(kpiRaw.overall_score, 0),
        talents_processed: Math.round(toNumber(kpiRaw.talents_processed, 0)),
    };
    const scoresRaw = payload.scores;
    let scores: TalentMatchingResult["scores"];
    if (scoresRaw && typeof scoresRaw === "object") {
        const s = scoresRaw as Record<string, unknown>;
        scores = {
            skills_fit: toNumber(s.skills_fit, kpi.skills_fit_score),
            availability: toNumber(s.availability, kpi.availability_score),
            overall: toNumber(s.overall, kpi.overall_score),
        };
    }
    const recRaw = Array.isArray(payload.recommended_actions) ? payload.recommended_actions : [];
    const recommended_actions: TalentMatchingRecommendedAction[] = recRaw.map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return {
            type: o.type != null ? String(o.type) : "",
            skill: o.skill != null ? String(o.skill) : undefined,
            talent: o.talent != null ? String(o.talent) : undefined,
            reason: o.reason != null ? String(o.reason) : undefined,
        };
    });
    const metaRaw = payload.meta;
    let meta: TalentMatchingResult["meta"];
    if (metaRaw && typeof metaRaw === "object") {
        const m = metaRaw as Record<string, unknown>;
        meta = {
            analysis_version: typeof m.analysis_version === "number" ? m.analysis_version : undefined,
            scenario_type: m.scenario_type != null ? String(m.scenario_type) : undefined,
            computed_at: m.computed_at != null ? String(m.computed_at) : undefined,
        };
    }
    return {
        raw,
        status: payload.status != null ? String(payload.status) : undefined,
        workflow: payload.workflow != null ? String(payload.workflow) : undefined,
        project_id: String(payload.project_id ?? projectId),
        enterprise_id: payload.enterprise_id != null ? String(payload.enterprise_id) : undefined,
        analysis_run_id: payload.analysis_run_id != null ? String(payload.analysis_run_id) : undefined,
        kpi,
        scores,
        recommended_actions,
        meta,
        explanation: payload.explanation != null ? String(payload.explanation) : "",
    };
}

/** Réseau : lance une erreur HTTP ; JSON invalide → `null`. */
export async function fetchProjectTalentMatching(
    projectId: string,
    options?: ApiClientOptions,
): Promise<TalentMatchingResult | null> {
    const timeout = options?.timeout ?? getHttpTimeoutMs();
    const raw = await fetchTalentMatchingHttp(projectId, { timeout, signal: options?.signal });
    return parseTalentMatchingPayload(raw, projectId);
}
