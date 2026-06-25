import { getJwtEnterpriseId } from "@/auth/jwt";
import { httpClient } from "@/lib/http-client";
import type { ExecuteResponse, ProjectAnalysisResponse, RiskKpiResponse } from "@/types/api.types";

/** Réponses métier variables selon n8n — typage souple côté POST agents. */
export type CopilotRecomputeResponse = Record<string, unknown>;

// ============================================================
// Types stricts conformes à WF_Talent_Matching_Senior_v3
// ============================================================

export type MatchingScoreMode = "balanced" | "redeployment_required";

export type MatchedSkill = {
    skill_id: string;
    skill_name: string;
    fit: number;
    talent_level: number;
    required_level: number;
    certified: boolean;
    years_experience: number;
};

export type MissingSkill = {
    skill_id: string;
    skill_name: string;
    level_required: number;
    criticality: number;
};

export type MatchmakerTalent = {
    talent_id: string;
    talent_name: string;
    talent_email: string | null;
    enterprise_id: string;
    rank: number;
    skill_fit_score: number;
    availability_score: number;
    experience_score: number;
    overall_score: number;
    score_mode: MatchingScoreMode;
    requires_redeployment: boolean;
    requires_upskill: boolean;
    current_allocation_pct: number;
    capacity_hours_per_week: number;
    gap_count: number;
    gap_detected: boolean;
    matched_skills_count: number;
    missing_skills_count: number;
    matched_skills: MatchedSkill[];
    missing_skills: MissingSkill[];
};

export type MatchmakerRecommendedAction = {
    action_type: "recruitment" | "training" | "redeploy";
    priority_level: "low" | "medium" | "high";
    target_skill_id?: string;
    skill?: string;
    criticality?: number;
    action_summary: string;
};

export type MatchmakerResponse = {
    status: "success" | "no_matching_results" | "error";
    workflow: "WF_Talent_Matching";
    analysis_run_id: string;
    project_id: string;
    enterprise_id: string;
    project: { id: string; name: string; status: string; priority: number };
    matching: {
        project_adequacy_score: number;
        top_talents: MatchmakerTalent[];
        all_talents_count: number;
        requirements_count: number;
        top_recommendation: "recruitment" | "training" | "redeploy";
    };
    recommended_actions: MatchmakerRecommendedAction[];
    ai: {
        provider: "groq" | null;
        llm_enriched: boolean;
        matching_narrative: string;
        top_picks_rationale: Array<{
            talent_id: string;
            talent_name: string;
            why_selected: string;
            conditions?: string[];
        }>;
        critical_gaps: Array<{ skill: string; severity: string; mitigation: string }>;
        hr_decision: string;
        confidence: number;
    };
    copilot: { message: string; explanation: string; actions: string[] };
    explanation: string;
};

const MATCHMAKER_TIMEOUT_MS = 35_000;
const silent = { skipGlobalHttpErrorToast: true as const };

export const matchmakerApi = {
    runForProject: (
        projectId: string,
        opts?: { useAI?: boolean; topN?: number },
        req?: { signal?: AbortSignal; timeout?: number },
    ) => {
        const enterprise_id = getJwtEnterpriseId();
        if (!enterprise_id?.trim()) {
            return Promise.reject(new Error("enterprise_id requis pour le Matchmaker."));
        }
        return httpClient.post<MatchmakerResponse>(
            "/webhook/api/project/talents",
            {
                project_id: projectId.trim(),
                enterprise_id,
                use_ai: opts?.useAI ?? true,
                top_n: opts?.topN ?? 5,
            },
            { ...silent, timeout: req?.timeout ?? MATCHMAKER_TIMEOUT_MS, signal: req?.signal },
        );
    },
};

export const agentsApi = {
    /**
     * @deprecated PDF §7.3 — utiliser `orchestratorApi.recompute({ scope: 'project', project_id })`.
     */
    recomputeFull: (projectId: string) =>
        httpClient.post<CopilotRecomputeResponse>("/webhook/api/copilot/recompute", { project_id: projectId }),

    /**
     * @deprecated PDF §4.4 — Observer via Orchestrator ; lire KPI persistés dans project detail.
     */
    observerKpi: (projectId: string) =>
        httpClient.post<ProjectAnalysisResponse>("/webhook/api/project/details", { project_id: projectId }),

    /**
     * @deprecated PDF §4.4 — Watchdog via Orchestrator ; lire `dashboard.widgets.top_alerts`.
     */
    riskKpi: (projectId: string) =>
        httpClient.post<RiskKpiResponse>("/webhook/api/project/risks", { project_id: projectId, use_ai: true }),

    /**
     * @deprecated PDF §4.4 — Matchmaker via Orchestrator.
     */
    matchmakerTalents: (projectId: string, opts?: { useAI?: boolean; topN?: number }) =>
        matchmakerApi.runForProject(projectId, opts),

    /** Strategist — POST /webhook/api/strategist/execute */
    executeArbitrage: (optionId: string, action: "execute" | "reject") =>
        httpClient.post<ExecuteResponse>("/webhook/api/strategist/execute", { option_id: optionId, action }),
};
