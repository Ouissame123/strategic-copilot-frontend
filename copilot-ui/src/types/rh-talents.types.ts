/** Contrat WF_RH_Talents — GET /rh/talents et GET /rh/talents/:id */

export type RhTalentListSkill = {
    name: string;
    level: number;
    category?: string;
};

export type RhTalentListItem = {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    job_title?: string | null;
    department?: string | null;
    seniority_level?: string | null;
    status: string;
    hire_date?: string | null;
    current_load_pct: number;
    available_pct: number;
    active_projects_count: number;
    top_skills: RhTalentListSkill[];
};

export type RhTalentsListResponse = {
    status?: string;
    talents: RhTalentListItem[];
    count: number;
    distribution: {
        available: number;
        fully_loaded: number;
        by_department: Record<string, number>;
    };
};

export type RhTalentDetailSkill = {
    id?: string;
    skill_name: string;
    skill_category?: string;
    proficiency_level: number;
    years_experience?: number | null;
};

export type RhTalentAssignment = {
    id?: string;
    project_id?: string;
    project_name?: string;
    role_on_project?: string;
    allocation_pct?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
    project_priority?: number | null;
    criticality?: string | null;
};

export type RhTalentEmployment = {
    role?: string | null;
    contract_type?: string | null;
    salary?: string | number | null;
    integration_date?: string | null;
    manager_name?: string | null;
    manager_id?: string | null;
};

export type RhTalentProfile = {
    city?: string | null;
    country?: string | null;
};

export type RhTalentCapacity = {
    capacity_hours_per_week?: number | null;
};

export type RhTalentSummary = {
    total_allocation_pct?: number;
    overload?: boolean;
    tension?: boolean;
    active_projects_count?: number;
    active_alerts_count?: number;
    contract_ending_soon?: boolean;
    risk_level?: "low" | "medium" | "high" | string;
};

export type RhTalentAlert = {
    id?: string;
    severity?: string;
    message?: string;
    risk_type?: string;
    detected_at?: string | null;
};

export type RhTalentNineBox = {
    performance_score?: number;
    potential_score?: number;
    box_label?: string | null;
    rationale?: string | null;
};

export type RhTalentIpi = {
    ipi_score?: number;
    tech_score?: number;
    exp_score?: number;
    stability_score?: number;
    band?: string | null;
};

export type RhTalentMobility = {
    mobility_flag?: string | null;
    mobility_score?: number;
    drivers?: Array<string | { key?: string; value?: string | number }> | null;
};

export type RhTalentAnalyst = {
    nine_box?: RhTalentNineBox | null;
    ipi?: RhTalentIpi | null;
    mobility?: RhTalentMobility | null;
    recommendation?: string | null;
};

export type RhTalentBestMatch = {
    project_id?: string;
    project_name?: string;
    overall_score?: number;
    recommendation_type?: string;
};

/** Corps POST /rh/talents — WF_RH_Talents_CRUD create. */
export type CreateRhTalentPayload = {
    name: string;
    email: string;
    phone?: string | null;
    job_title?: string | null;
    department?: string | null;
    seniority_level?: string | null;
    status?: string;
    hire_date?: string | null;
    bio?: string | null;
};

export type CreateRhTalentResponse = {
    talent: RhTalentListItem;
    message: string;
};

/** Corps PATCH /rh/talents/:id — WF_RH_Talents_Update_v1 (champs partiels). */
export type UpdateRhTalentPayload = {
    name?: string;
    email?: string;
    phone?: string | null;
    job_title?: string | null;
    department?: string | null;
    seniority_level?: string | null;
    status?: string;
    hire_date?: string | null;
    bio?: string | null;
};

export type UpdateRhTalentResponse = {
    talent: RhTalentListItem;
    message: string;
};

export type RhTalentDetail = {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    job_title?: string | null;
    department?: string | null;
    seniority_level?: string | null;
    bio?: string | null;
    status: string;
    hire_date?: string | null;
    contract_end_date?: string | null;
    current_load_pct: number;
    available_pct: number;
    skills: RhTalentDetailSkill[];
    active_assignments: RhTalentAssignment[];
    past_assignments: RhTalentAssignment[];
    best_match?: RhTalentBestMatch | null;
    employment?: RhTalentEmployment | null;
    profile?: RhTalentProfile | null;
    capacity?: RhTalentCapacity | null;
    summary?: RhTalentSummary | null;
    active_alerts?: RhTalentAlert[];
    analyst?: RhTalentAnalyst | null;
};
