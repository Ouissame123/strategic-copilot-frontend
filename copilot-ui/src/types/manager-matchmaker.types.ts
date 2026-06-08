import type { DashboardMatchmaker } from "@/types/api.types";

export type ManagerProjectTalentMatchingBody = {
    project_id: string;
    enterprise_id: string;
    manager_id: string;
    top_n: number;
    simulation_mode: boolean;
    use_ai: boolean;
};

export type ManagerProjectTalentMatchingAction = {
    action_type: string;
    action_summary: string;
    priority_level: string;
    skill?: string;
};

export type ManagerProjectTalentMatchingTalent = {
    talent_name: string;
    overall_score: number | null;
    skill_fit_score: number | null;
    missing_skills: string[];
};

/** Réponse normalisée d’un appel POST /webhook/api/project/talents. */
export type ManagerProjectTalentMatchingResult = {
    project_id: string;
    project_name: string;
    adequacy_score: number | null;
    gap_count: number;
    recommended_actions: ManagerProjectTalentMatchingAction[];
    top_talents: ManagerProjectTalentMatchingTalent[];
    critical_gaps: string[];
};

export type ManagerMatchmakerTalentPickRationale = {
    talent_id?: string;
    talent_name?: string;
    why_selected?: string;
    conditions?: string[];
};

export type ManagerMatchmakerCriticalGap = {
    skill?: string;
    severity?: string;
    mitigation?: string;
};

export type ManagerMatchmakerTalentsProjectGroup = {
    project_id?: string;
    project_name?: string;
    adequacy_score?: number;
    candidates?: ManagerMatchmakerBatchTalentCandidate[];
    top_picks_rationale?: ManagerMatchmakerTalentPickRationale[];
    critical_gaps?: ManagerMatchmakerCriticalGap[];
};

export type ManagerMatchmakerDashboard = DashboardMatchmaker & {
    /** Projets sans réponse exploitable (pour debug interne, optionnel). */
    failed_project_ids?: string[];
    explanation?: string;
    errors?: unknown[];
    llm_enriched_count?: number;
    top_talents_by_project?: ManagerMatchmakerTalentsProjectGroup[];
};

/** Corps POST /webhook/api/matchmaker/batch — pas d'enterprise_id ni manager_id (JWT). */
export type ManagerMatchmakerBatchBody = {
    top_n?: number;
    limit_projects?: number;
    use_ai?: boolean;
    simulation_mode?: boolean;
    project_ids?: string[];
};

export type ManagerMatchmakerBatchStats = {
    projects_analyzed?: number;
    avg_match_score?: number;
    ecarts_identifies?: number;
    besoins_recrutement?: number;
    besoins_formation?: number;
    reaffectations_possibles?: number;
};

export type ManagerMatchmakerBatchRecommendation = {
    project_id?: string;
    project_name?: string;
    adequacy_score?: number;
    top_recommendation?: string;
    priority_label?: string;
    summary?: string;
    ai_narrative?: string | null;
    hr_decision?: string | null;
    confidence?: number | null;
    llm_enriched?: boolean;
};

export type ManagerMatchmakerBatchTalentCandidate = {
    talent_id?: string;
    talent_name?: string;
    overall_score?: number;
    skill_fit_score?: number;
    availability_score?: number;
    gap_count?: number;
    score_mode?: string;
    current_allocation_pct?: number;
};

export type ManagerMatchmakerBatchTalentsByProject = {
    project_id?: string;
    project_name?: string;
    adequacy_score?: number;
    candidates?: ManagerMatchmakerBatchTalentCandidate[];
    top_picks_rationale?: ManagerMatchmakerTalentPickRationale[];
    critical_gaps?: ManagerMatchmakerCriticalGap[];
};

export type ManagerMatchmakerBatchSkillGap = {
    skill?: string;
    severity?: string;
    action_type?: string;
    signalements?: number;
    sample_project?: string;
};

/** Réponse POST /webhook/api/matchmaker/batch (agrégée côté backend). */
export type ManagerMatchmakerBatchResponse = {
    status: string;
    workflow?: string;
    batch_run_id?: string;
    stats?: ManagerMatchmakerBatchStats;
    top_recommendations?: ManagerMatchmakerBatchRecommendation[];
    top_talents_by_project?: ManagerMatchmakerBatchTalentsByProject[];
    top_skill_gaps?: ManagerMatchmakerBatchSkillGap[];
    errors?: unknown[];
    explanation?: string;
    llm_enriched_count?: number;
    audit?: Record<string, unknown>;
    meta?: Record<string, unknown>;
};
