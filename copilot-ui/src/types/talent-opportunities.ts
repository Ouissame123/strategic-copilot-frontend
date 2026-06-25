export type ScoreTier = "excellent" | "good" | "fair" | "weak";
export type RecommendationType = "redeploy" | "training" | "recruitment";
export type SkillFitStatus = "match" | "gap" | "critical_gap";
export type ActionPriority = "high" | "medium" | "low";

export interface OpportunityListItem {
    project_id: string;
    project_name: string;
    project_description: string | null;
    project_status: string;
    project_status_label: string;
    project_priority: number | null;
    milestone_at: string | null;
    overall_score: number;
    score_tier: ScoreTier;
    score_label: string;
    skill_fit_score: number;
    availability_score: number;
    gap_count: number;
    recommendation_type: RecommendationType;
    recommendation_label: string;
    match_summary: string | null;
    team_size: number;
    already_interested: boolean;
}

export interface OpportunitySkillDetail {
    skill_id: string;
    skill_name: string;
    category: string | null;
    required_level: number;
    available_level: number;
    fit_score: number;
    fit_pct: number;
    is_critical: boolean;
    gap_detected: boolean;
    gap_size: number;
    status: SkillFitStatus;
}

export interface OpportunityRecommendedAction {
    action_type: string;
    action_type_label: string;
    priority_level: ActionPriority;
    priority_label: string;
    target_skill_id: string | null;
    target_skill_name: string | null;
    proposed_allocation_pct: number | null;
    action_summary: string | null;
}

export interface OpportunityMyInterest {
    request_id: string;
    status: string;
    status_label: string;
    title: string;
    created_at: string;
}

export interface OpportunityDetail {
    opportunity: OpportunityListItem & {
        project_start_date: string | null;
        budget_rh_planned: number | null;
        can_express_interest: boolean;
    };
    skill_details: OpportunitySkillDetail[];
    recommended_actions: OpportunityRecommendedAction[];
    my_interest: OpportunityMyInterest | null;
}

export interface OpportunitiesSummary {
    total_matches: number;
    by_tier: { excellent: number; good: number; fair: number };
    top_score: number;
    by_recommendation: { redeploy: number; training: number; recruitment: number };
}

export interface ExpressInterestPayload {
    message?: string;
}

export interface TalentOpportunitiesListFilters {
    min_score?: number;
    limit?: number;
}
