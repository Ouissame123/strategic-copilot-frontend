export type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled";
export type AllocationStatus = "available" | "light" | "engaged" | "busy" | "saturated";
export type ProjectTab = "all" | "active" | "planned" | "past";

export interface TalentProjectListItem {
    assignment_id: string;
    project_id: string;
    project_name: string;
    project_description: string | null;
    project_status: ProjectStatus;
    project_status_label: string;
    project_priority: number | null;
    role_on_project: string | null;
    allocation_pct: number;
    assignment_status: string | null;
    assignment_start_date: string | null;
    assignment_end_date: string | null;
    project_start_date: string | null;
    milestone_at: string | null;
    days_to_milestone: number | null;
    team_size: number;
    computed_tab: "active" | "planned" | "past";
    computed_tab_label: string;
}

export interface TalentProjectDetail {
    project: {
        assignment_id: string;
        project_id: string;
        project_name: string;
        project_description: string | null;
        project_status: ProjectStatus;
        project_status_label: string;
        project_priority: number | null;
        project_start_date: string | null;
        milestone_at: string | null;
        days_to_milestone: number | null;
        budget_rh_planned: number | null;
        budget_rh_actual: number | null;
        my_role: string | null;
        my_allocation_pct: number;
        my_start_date: string | null;
        my_end_date: string | null;
    };
    team: Array<{
        talent_id: string;
        name: string;
        email: string;
        job_title: string;
        role_on_project: string | null;
        allocation_pct: number;
        start_date: string | null;
        end_date: string | null;
        is_me: boolean;
    }>;
    requirements: Array<{
        skill_id: string;
        skill_name: string;
        category: string | null;
        level_required: number;
        criticality: string | null;
        is_mandatory: boolean;
        weight: number | null;
    }>;
    viability: {
        score: number | null;
        decision: string | null;
        decision_label: string | null;
        confidence: number | null;
    } | null;
    alerts: Array<{
        id: string;
        risk_type: string;
        severity: "critical" | "high" | "medium" | "low";
        severity_label: string;
        message: string;
        impact_area: string | null;
        detected_at: string;
    }>;
}

export interface TalentProjectsSummary {
    total: number;
    by_tab: { active: number; planned: number; past: number };
    unique_active_projects: number;
    total_allocation_pct_active: number;
    allocation_status: AllocationStatus;
    available_pct: number;
    upcoming_milestones: number;
}
