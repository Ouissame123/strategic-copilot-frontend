/** WF_Talent_Matching — JSON serveur (aucun recalcul front). */

export interface TalentMatchingKpi {
    skills_fit_score: number;
    availability_score: number;
    overall_score: number;
    talents_processed: number;
}

export interface TalentMatchingRecommendedAction {
    type: string;
    skill?: string;
    talent?: string;
    reason?: string;
}

export interface TalentMatchingResult {
    /** Corps JSON brut du workflow (audit / exhaustivité). */
    raw?: unknown;
    status?: string;
    workflow?: string;
    project_id: string;
    enterprise_id?: string;
    analysis_run_id?: string;
    kpi: TalentMatchingKpi;
    scores?: {
        skills_fit: number;
        availability: number;
        overall: number;
    };
    recommended_actions: TalentMatchingRecommendedAction[];
    meta?: {
        analysis_version?: number;
        scenario_type?: string;
        computed_at?: string;
    };
    explanation: string;
}
