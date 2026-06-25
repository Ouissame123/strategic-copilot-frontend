/** WF_RH_Requests_Decision — champs aplatis (`GET /webhook/rh/requests`, `GET …/:id`). */

export type RhRequestProjectStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled";

export type RhRequestType = "skill_gap" | "reallocation" | "training" | "overload" | "recruitment";

export type RhRequestPriority = "urgent" | "normal" | "high" | "medium" | "low";

export type RhRequestStatus =
    | "pending"
    | "accepted"
    | "rejected"
    | "in_progress"
    | "done"
    | "closed"
    | "cancelled";

export type RhRequest = {
    id: string;
    enterprise_id?: string;
    manager_user_id: string | null;
    manager_name?: string | null;
    /** Alias legacy manager */
    manager_id: string;
    project_id: string | null;
    project_name: string | null;
    project_status: RhRequestProjectStatus | string | null;
    assigned_to?: string | null;
    assigned_to_name?: string | null;
    type: RhRequestType | string;
    type_label?: string | null;
    title: string;
    description: string;
    /** Alias affichage — souvent identique à `description` */
    message: string;
    priority: RhRequestPriority | string;
    status: RhRequestStatus | string;
    status_label: string | null;
    response_message: string | null;
    payload: Record<string, unknown>;
    days_since_creation?: number | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
};

export type RhRequestDecisionMeta = {
    orchestrator_triggered?: boolean;
    recompute_recommended?: boolean;
    estimated_duration_seconds?: number;
    computed_at?: string;
};

export type RhRequestPatchBody = {
    status: RhRequestPatchStatus;
    reason?: string;
    comment?: string;
    assigned_talent_id?: string;
    planned_date?: string;
    budget_approved?: number;
};

export type RhRequestPatchStatus =
    | "accepted"
    | "rejected"
    | "in_progress"
    | "done"
    | "closed";

/** Source affichée inbox RH (manager ou agent IA). */
export type RhActionSource = "manager" | "watchdog" | "strategist" | "analyst" | "matchmaker";
