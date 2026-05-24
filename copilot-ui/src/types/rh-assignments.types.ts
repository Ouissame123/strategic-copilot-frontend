/** WF_RH_Assignments — GET/POST `/rh/assignments`, GET `/rh/managers` */

export type RhAssignmentRow = {
    /** Clé stable : `talent_id` si le backend ne renvoie pas d'id d'affectation. */
    id: string;
    talent_id?: string | null;
    talent_name?: string | null;
    talent_email?: string | null;
    job_title?: string | null;
    manager_user_id?: string | null;
    manager_name?: string | null;
    manager_email?: string | null;
    has_manager?: boolean | null;
    updated_at?: string | null;
};

export type RhAssignmentsListResponse = {
    status?: string;
    assignments: RhAssignmentRow[];
    message?: string | null;
};

export type RhAssignmentMutationResponse = {
    status?: string;
    assignment?: RhAssignmentRow | null;
    message?: string | null;
};

/** POST /rh/assignments */
export type CreateRhAssignmentPayload = {
    talent_id: string;
    manager_user_id: string;
};

export type RhAssignmentsListParams = {
    status?: "all" | "active" | "planned";
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
