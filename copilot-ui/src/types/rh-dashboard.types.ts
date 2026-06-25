export type RhAnalyticsAlertLevel = "critical" | "high" | "medium" | "info";

export type RhLoadTalent = {
    name: string;
    load_pct?: number;
    available_pct?: number;
    department?: string | null;
    seniority?: string | null;
};

export type RhTopSkill = {
    skill_name: string;
    skill_category?: string;
    talent_count: number;
    avg_level: number;
    max_level: number;
    projects_with_gap?: number;
};

export type RhAnalyticsAlert = {
    level: RhAnalyticsAlertLevel;
    message: string;
    action?: string;
};

export type RhAnalyticsKpis = {
    talents: {
        total: number;
        active: number;
        inactive: number;
        on_leave: number;
        by_department: Record<string, number>;
        by_seniority: Record<string, number>;
    };
    load: {
        avg_load_pct: number;
        avg_available_pct: number;
        unassigned: number;
        light_load: number;
        heavy_load: number;
        overloaded: number;
        most_loaded: RhLoadTalent[];
        most_available: RhLoadTalent[];
    };
    skills: {
        total_unique_skills: number;
        top_skills: RhTopSkill[];
        by_category: Record<string, RhTopSkill[]>;
        skills_with_gaps: number;
    };
    projects: {
        active_projects: number;
        talents_assigned: number;
        avg_progress_pct: number;
        projects_without_team: number;
        assignments_ending_soon: number;
        critical_rh_alerts: number;
    };
};

export type RhAnalytics = {
    rh_score: number | null;
    kpis: RhAnalyticsKpis;
    alerts: RhAnalyticsAlert[];
};

export type RhNotificationSeverity = "low" | "medium" | "high" | "critical";

export type RhNotification = {
    id: string;
    type: string;
    title: string;
    message?: string;
    severity: RhNotificationSeverity;
    entity_type?: string;
    entity_id?: string;
    project_id?: string | null;
    talent_id?: string | null;
    is_read?: boolean;
    created_at: string;
};

export type RhNotificationsResponse = {
    summary: {
        unread_count: number;
        critical_unread: number;
        high_unread: number;
        by_type: Record<string, number>;
    };
    notifications: RhNotification[];
    count: number;
};
