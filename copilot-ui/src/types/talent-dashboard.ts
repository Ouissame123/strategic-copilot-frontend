export type AnalystBand = "high" | "mid" | "low";
export type MobilityFlag = "stable" | "watch" | "at_risk";
export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AllocationStatus = "available" | "light" | "engaged" | "busy" | "saturated";
export type HealthLabel = "excellent" | "bon" | "à surveiller" | "à améliorer" | "inconnu";
export type PriorityIcon = "contract" | "alert" | "opportunity" | "pending" | "check";
export type PriorityLevel = "high" | "medium" | "low";

export interface TalentDashboard {
    status: "success";
    talent_id: string;
    enterprise_id: string;

    header?: {
        greeting: string;
        first_name: string;
        job_title: string | null;
        department: string | null;
        seniority_label: string | null;
    };

    health?: {
        score: number | null;
        label: HealthLabel;
        has_data: boolean;
    };

    kpis?: {
        ipi: {
            score: number | null;
            band: AnalystBand | null;
            band_label: string | null;
            tech_score: number | null;
            exp_score: number | null;
            stability_score: number | null;
        };
        mobility: {
            flag: MobilityFlag | null;
            flag_label: string | null;
            score: number | null;
            drivers: string[];
        };
        nine_box: {
            performance_score: number | null;
            potential_score: number | null;
            box_label: string | null;
            rationale: string | null;
        };
        allocation: {
            total_pct: number;
            status: AllocationStatus;
            active_projects_count: number;
            available_pct: number;
        };
    };

    priorities?: Array<{
        icon: PriorityIcon;
        priority: PriorityLevel;
        label: string;
        link: string | null;
    }>;

    alerts?: Array<{
        id: string;
        risk_type: string;
        severity: AlertSeverity;
        severity_label: string;
        message: string;
        impact_area: string | null;
        age_hours: number;
        detected_at: string;
    }>;

    contract_alert?: {
        days_until_end: number;
        severity: "high" | "medium";
        message: string;
    } | null;

    active_projects?: Array<{
        assignment_id: string;
        project_id: string;
        project_name: string;
        project_status: string;
        project_priority: number | null;
        role_on_project: string | null;
        allocation_pct: number;
        start_date: string | null;
        end_date: string | null;
        milestone_at: string | null;
        days_to_milestone: number | null;
    }>;

    top_matches?: Array<{
        project_id: string;
        project_name: string;
        project_status: string;
        overall_score: number;
        skill_fit_score: number;
        availability_score: number;
        gap_count: number;
        recommendation_type: string;
    }>;

    top_skills?: Array<{
        skill_id: string;
        skill_name: string;
        category: string | null;
        level: number;
        years_experience: number | null;
        is_certified: boolean;
        last_used_at: string | null;
    }>;

    skills_stats?: { total: number; certified: number; avg_level: number };

    requests_summary?: {
        total: number;
        pending: number;
        accepted: number;
        rejected: number;
        in_progress: number;
        done: number;
    };

    capacity?: {
        hours_per_week: number | null;
        vacation_days_remaining: number | null;
    };

    manager?: { user_id: string; full_name: string; email: string } | null;
}
