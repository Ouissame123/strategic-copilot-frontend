/** WF_RH_Assignments_v2 — slugs workflow n8n par opération. */

export type RhAssignmentRow = {
    /** Clé stable : `talent_id` si le backend ne renvoie pas d'id d'affectation. */
    id: string;
    talent_id?: string | null;
    talent_name?: string | null;
    talent_email?: string | null;
    job_title?: string | null;
    department?: string | null;
    talent_status?: string | null;
    manager_user_id?: string | null;
    manager_name?: string | null;
    manager_email?: string | null;
    has_manager?: boolean | null;
    updated_at?: string | null;
};

export type RhUnassignedTalent = {
    talent_id: string;
    talent_name?: string | null;
    talent_email?: string | null;
    job_title?: string | null;
};

export type RhAssignmentsListSummary = {
    assigned_to_manager: number;
    without_manager: number;
    total_managers_pool: number;
    total_unassigned: number;
};

export type RhAssignmentsListFiltersApplied = {
    talent_id?: string | null;
    manager_user_id?: string | null;
    status?: string;
    search?: string | null;
    limit?: number;
};

export type RhAssignmentsMeta = {
    api_version?: string;
    source_agent?: string;
    recompute_recommended?: boolean;
    orchestrator_triggered?: boolean;
    computed_at?: string;
    deleted_at?: string;
};

export type RhAssignmentsListResponse = {
    status?: string;
    workflow?: string;
    operation?: "list";
    enterprise_id?: string;
    count?: number;
    assignments: RhAssignmentRow[];
    available_managers?: RhAvailableManager[];
    unassigned_talents?: RhUnassignedTalent[];
    summary?: RhAssignmentsListSummary;
    filters_applied?: RhAssignmentsListFiltersApplied;
    meta?: RhAssignmentsMeta;
    message?: string | null;
};

/** Managers éligibles — inclus dans GET list (`available_managers`). */
export type RhAvailableManager = {
    manager_user_id: string;
    manager_name: string;
    manager_email: string;
    role: "manager" | "rh" | "admin" | string;
};

export type RhAssignmentMutationResponse = {
    status?: string;
    workflow?: string;
    operation?: "create" | "update" | "delete";
    action?: string;
    assignment?: RhAssignmentRow | null;
    previous_manager_user_id?: string | null;
    trigger_source?: string;
    meta?: RhAssignmentsMeta;
    message?: string | null;
};

/** POST — body `{ talent_id, manager_user_id }`. */
export type CreateRhAssignmentPayload = {
    talent_id: string;
    manager_user_id: string;
    note?: string | null;
};

/** PATCH `/rh/assignments/:talent_id` — body `{ manager_user_id }`. */
export type UpdateRhAssignmentPayload = {
    manager_user_id: string;
    note?: string | null;
};

export type RhAssignmentsListParams = {
    talent_id?: string;
    manager_user_id?: string;
    status?: "all" | "assigned" | "unassigned";
    search?: string;
    limit?: number;
};

export type RhManagerListItem = {
    id: string;
    full_name: string;
    email: string;
};

export type RhManagersListResponse = {
    status?: string;
    managers: RhManagerListItem[];
    message?: string | null;
};
