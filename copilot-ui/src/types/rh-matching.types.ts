/** WF_RH_Matching_Run — talent matching & workforce arbitration */

export type RhMatchingRecommendationType = "recommended" | "possible" | "potential" | string;

export type RhMatchingTopMatch = {
    talent_id: string;
    talent_name: string;
    email: string | null;
    job_title: string | null;
    overall_score: number;
    skill_fit_score: number;
    skill_level_score: number;
    availability_score: number;
    recommendation_type: RhMatchingRecommendationType;
    available_pct: number;
    current_load_pct: number;
    matched_skills_count: number;
    gap_count: number;
    skills: unknown[];
    match_summary: string | null;
};

export type RhMatchingSummary = {
    candidates_evaluated?: number;
    recommendations_count?: number;
    top_candidate_name?: string | null;
    execution_time_ms?: number | null;
    [key: string]: unknown;
};

export type RhMatchingRunPayload = {
    project_id: string;
    top_n?: number;
    min_availability_pct?: number;
};

export type RhMatchingRunResponse = {
    status: string;
    workflow?: string;
    operation?: string;
    enterprise_id?: string;
    project_id: string;
    project?: Record<string, unknown>;
    required_skills: unknown[];
    match_narrative: string | null;
    llm_enriched?: boolean;
    top_matches: RhMatchingTopMatch[];
    meta_matching: Record<string, unknown>;
    summary: RhMatchingSummary;
};

export type RhProjectOption = {
    id: string;
    name: string;
};
