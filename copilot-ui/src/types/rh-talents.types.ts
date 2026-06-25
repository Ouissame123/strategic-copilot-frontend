/** Contrat WF_RH_Talents_CRUD v3 — GET/POST/PATCH/DELETE `/webhook/rh/talents` */

export type TalentStatus = "active" | "inactive";

export type RhTalentListSkill = {
    name: string;
    level: number;
    category?: string | null;
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
    created_at?: string;
    updated_at?: string;
};

export type RhTalentsListFiltersApplied = {
    search: string | null;
    status: string;
    department: string | null;
    available_only: boolean;
    limit: number;
};

export type RhTalentsListResponse = {
    status?: string;
    workflow?: string;
    operation?: "list";
    enterprise_id?: string;
    talents: RhTalentListItem[];
    count: number;
    filters_applied?: RhTalentsListFiltersApplied;
    distribution: {
        available: number;
        fully_loaded: number;
        by_department: Record<string, number>;
    };
    meta?: RhTalentMeta;
};

export type TalentsListFilters = {
    enterprise_id: string;
    status?: "active" | "inactive" | "all" | string;
    search?: string;
    department?: string;
    available_only?: boolean;
    limit?: number;
};

/** Alias historique — composants existants. */
export type RhTalentsListParams = TalentsListFilters;

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

/** Métadonnées WF_RH_Talents_CRUD v3. */
export type RhTalentMeta = {
    api_version?: string;
    source_agent?: string;
    recompute_recommended?: boolean;
    orchestrator_triggered?: boolean;
    estimated_duration_seconds?: number;
    computed_at?: string;
    deleted_at?: string;
};

/** Réponse mutation CRUD talent RH. */
export type RhTalentMutationResponse = {
    status?: "success" | "error";
    operation?: "create" | "update" | "delete" | "detail";
    action?: "created" | "updated" | "deleted";
    talent?: RhTalentListItem;
    talent_id?: string;
    deleted_id?: string;
    talent_name?: string;
    assignments_ended?: number;
    trigger_source?: string;
    meta?: RhTalentMeta;
    code?: string;
    message?: string;
    active_assignments_count?: number;
};

export type RhTalentDetailResponse = {
    status: "success";
    operation: "detail";
    enterprise_id?: string;
    talent: RhTalentDetail;
    meta?: RhTalentMeta;
};

export type RhTalentApiError = {
    status: "error";
    code:
        | "TALENT_NOT_FOUND"
        | "NOT_FOUND_OR_FORBIDDEN"
        | "CREATE_FAILED"
        | "ACTIVE_ASSIGNMENTS_BLOCKING"
        | "VALIDATION_FAILED"
        | "MISSING_BEARER"
        | "INVALID_TOKEN"
        | "TOKEN_EXPIRED"
        | "FORBIDDEN"
        | "NO_ENTERPRISE"
        | string;
    message: string;
    errors?: string[];
    active_assignments_count?: number;
};

/** Alias prompt v3. */
export type TalentApiError = RhTalentApiError;

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

/** Alias prompt v3. */
export type CreateTalentInput = CreateRhTalentPayload;

export type CreateRhTalentResponse = RhTalentMutationResponse & {
    talent: RhTalentListItem;
    message: string;
};

/** Corps PATCH /rh/talents/:id — champs partiels. */
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

/** Alias prompt v3. */
export type UpdateTalentInput = UpdateRhTalentPayload;

export type UpdateRhTalentResponse = RhTalentMutationResponse & {
    talent: RhTalentListItem;
    message: string;
};

export type DeleteRhTalentResponse = RhTalentMutationResponse & {
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
    created_at?: string;
    updated_at?: string;
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
