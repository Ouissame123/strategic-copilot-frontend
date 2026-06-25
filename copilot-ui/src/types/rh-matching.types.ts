/** WF_RH_Matching_Run — talent matching & workforce arbitration (PDF strict). */

export type RecommendationType = "redeploy" | "training" | "recruitment" | "bench";

export type RhMatchingTopMatch = {
    talent_id: string;
    talent_name: string;
    email: string | null;
    job_title: string | null;
    department: string | null;
    seniority_level: string | null;
    overall_score: number;
    skill_fit_score: number;
    /** @deprecated préférer `adequacy_score` — conservé pour affichage legacy */
    skill_level_score: number;
    adequacy_score: number;
    availability_score: number;
    recommendation_type: RecommendationType;
    /** @deprecated affichage dispo % — donnée backend si présente */
    available_pct: number;
    current_load_pct: number;
    matched_skills_count: number;
    gap_count: number;
    gap_detected: boolean;
    analysis_run_id: string;
    analysis_version: number;
    skills: unknown[];
    match_summary: string | null;
    computed_at?: string | null;
};

export type RhMatchingTopCandidate = {
    name: string;
    score: number;
    talent_id: string;
    summary: string;
};

export type RhMatchingSummary = {
    redeploy: number;
    training: number;
    recruitment: number;
    bench: number;
    top_candidate: RhMatchingTopCandidate | null;
};

export type RhMatchingMeta = {
    total_candidates_evaluated: number;
    top_n_returned?: number;
    min_availability_filter?: number;
    persisted_count?: number;
    computed_at?: string;
};

export type RhMatchingProject = {
    id: string;
    name: string;
    description?: string;
    status?: string;
    priority?: number;
    milestone_at?: string;
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
    project?: RhMatchingProject;
    required_skills: unknown[];
    match_narrative: string | null;
    llm_enriched?: boolean;
    top_matches: RhMatchingTopMatch[];
    meta_matching: RhMatchingMeta;
    summary: RhMatchingSummary;
    /** Nombre de résultats persistés (GET cache). */
    count?: number;
};

export type RhProjectOption = {
    id: string;
    name: string;
    status?: "active" | "planned" | string;
    priority?: number;
    milestone_at?: string;
};

export type RhMatchingCachedResultRow = {
    talent_id: string;
    talent_name: string;
    email: string;
    job_title: string;
    department: string;
    project_id: string;
    project_name: string;
    overall_score: number;
    skill_fit_score: number;
    adequacy_score: number;
    availability_score: number;
    recommendation_type: RecommendationType;
    gap_count: number;
    gap_detected: boolean;
    analysis_run_id: string;
    analysis_version: number;
    computed_at: string;
};

export type RhMatchingResultsResponse = {
    status: "success";
    count: number;
    results: RhMatchingCachedResultRow[];
};
