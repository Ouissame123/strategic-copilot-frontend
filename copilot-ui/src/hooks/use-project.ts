import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiGet, apiPost } from "@/utils/apiClient";
import { normalizeDecision } from "@/utils/decisionConfig";

export type DecisionType = "Continue" | "Adjust" | "Stop";

export interface ProjectKpi {
    progress_pct: number;
    delay_days: number;
    capacity_load_pct: number;
    skills_fit_score: number;
}

export interface ProjectRisk {
    type: string;
    severity: string;
    description: string;
}

export interface RecommendationAction {
    type: string;
    talent?: string;
    skill?: string;
    allocation?: number;
}

export interface ProjectRecommendation {
    summary: string;
    actions: RecommendationAction[];
}

export interface ProjectViability {
    project_id: string;
    viability_score: number;
    decision: DecisionType;
    kpi: ProjectKpi;
    risks: ProjectRisk[];
    recommendation: ProjectRecommendation;
    explanation: string;
}

export interface TalentFitItem {
    id: string;
    name: string;
    skill_fit_score: number;
    action: "redeploy" | "training" | "recruit";
}

export interface ProjectRisksPayload {
    fragility_score?: number;
    anxiety_pulse?: number;
    alerts?: Array<{ type: string; severity: string; description: string }>;
}

export interface WhatIfPayload {
    project_id: string;
    allocation_changes?: Array<{ talent_id: string; new_allocation_pct: number }>;
    add_talent?: { talent_id: string; allocation_pct: number };
    simulate_training?: { skill_id: string };
}

export interface WhatIfResult {
    new_score: number;
    delta: number;
    decision: DecisionType;
    impact_explanation?: string;
}

const toNumber = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function normalizeViability(payload: unknown): ProjectViability | null {
    if (!payload || typeof payload !== "object") return null;
    const r = payload as Record<string, unknown>;
    const kpi = (r.kpi as Record<string, unknown>) ?? {};
    const recommendation = (r.recommendation as Record<string, unknown>) ?? {};
    const actions = Array.isArray(recommendation.actions) ? recommendation.actions : [];
    return {
        project_id: String(r.project_id ?? ""),
        viability_score: toNumber(r.viability_score, 0),
        decision: normalizeDecision(r.decision),
        kpi: {
            progress_pct: toNumber(kpi.progress_pct, 0),
            delay_days: toNumber(kpi.delay_days, 0),
            capacity_load_pct: toNumber(kpi.capacity_load_pct, 0),
            skills_fit_score: toNumber(kpi.skills_fit_score, 0),
        },
        risks: Array.isArray(r.risks) ? (r.risks as ProjectRisk[]) : [],
        recommendation: {
            summary: String(recommendation.summary ?? ""),
            actions: actions as RecommendationAction[],
        },
        explanation: String(r.explanation ?? ""),
    };
}

const DEFAULT_TIMEOUT = 15000;

export function useProject(projectId: string | undefined, options: { timeout?: number } = {}) {
    const { timeout = DEFAULT_TIMEOUT } = options;
    const [viability, setViability] = useState<ProjectViability | null>(null);
    const [details, setDetails] = useState<ProjectKpi | null>(null);
    const [talents, setTalents] = useState<TalentFitItem[]>([]);
    const [risks, setRisks] = useState<ProjectRisksPayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(
        async (signal?: AbortSignal) => {
            if (!projectId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            const base = "/api/project";
            try {
                const [vRes, dRes, tRes, rRes] = await Promise.all([
                    apiGet<unknown>(`${base}/viability?project_id=${encodeURIComponent(projectId)}`, { timeout, signal }),
                    apiGet<unknown>(`${base}/details?project_id=${encodeURIComponent(projectId)}`, { timeout, signal }),
                    apiGet<unknown>(`${base}/talents?project_id=${encodeURIComponent(projectId)}`, { timeout, signal }),
                    apiGet<unknown>(`${base}/risks?project_id=${encodeURIComponent(projectId)}`, { timeout, signal }),
                ]);

                const vNorm = normalizeViability(vRes);
                setViability(vNorm);

                if (dRes && typeof dRes === "object") {
                    const d = dRes as Record<string, unknown>;
                    setDetails({
                        progress_pct: toNumber(d.progress_pct, 0),
                        delay_days: toNumber(d.delay_days, 0),
                        capacity_load_pct: toNumber(d.capacity_load_pct, 0),
                        skills_fit_score: toNumber(d.skills_fit_score, 0),
                    });
                } else setDetails(vNorm?.kpi ?? null);

                if (Array.isArray(tRes)) setTalents(tRes as TalentFitItem[]);
                else if (tRes && typeof tRes === "object" && Array.isArray((tRes as Record<string, unknown>).items))
                    setTalents((tRes as Record<string, unknown>).items as TalentFitItem[]);
                else setTalents([]);

                if (rRes && typeof rRes === "object") setRisks(rRes as ProjectRisksPayload);
                else setRisks(null);
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") return;
                setViability(null);
                setDetails(null);
                setTalents([]);
                setRisks(null);
                setError(err instanceof ApiError ? err.message : "Erreur de connexion");
            } finally {
                setIsLoading(false);
            }
        },
        [projectId, timeout],
    );

    useEffect(() => {
        const c = new AbortController();
        void fetchAll(c.signal);
        return () => c.abort();
    }, [fetchAll]);

    const retry = useCallback(() => void fetchAll(), [fetchAll]);

    const runWhatIf = useCallback(
        async (payload: WhatIfPayload): Promise<WhatIfResult | null> => {
            if (!projectId) return null;
            try {
                const body = { ...payload, project_id: projectId };
                const res = await apiPost<WhatIfResult>("/api/project/what-if", body, { timeout });
                return res ?? null;
            } catch {
                return null;
            }
        },
        [projectId, timeout],
    );

    return useMemo(
        () => ({
            viability,
            details,
            talents,
            risks,
            isLoading,
            error,
            retry,
            runWhatIf,
        }),
        [viability, details, talents, risks, isLoading, error, retry, runWhatIf],
    );
}
