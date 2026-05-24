/** WF_Manager_RH_Actions — GET/POST /webhook/api/rh/actions · PATCH /webhook/c8bae94d-…/api/rh/actions/:id. */

export type RhActionRequestType = "skill_gap" | "reallocation" | "training" | "overload" | "recruitment";

export type RhActionPriority = "urgent" | "normal" | "low";

export type RhActionPatchStatus = "accepted" | "refused" | "cancelled" | "closed" | "done";

export type RhActionItem = {
    id: string;
    enterprise_id: string;
    manager_id: string;
    project_id: string | null;
    type: RhActionRequestType | string;
    message: string;
    priority: RhActionPriority | string;
    status: string;
    assigned_to: string | null;
    response_message: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
};

export type RhActionsListResponse = {
    status: string;
    workflow: string;
    action: string;
    count: number;
    items: RhActionItem[];
};

export type RhActionCreateResponse = {
    status: string;
    workflow: string;
    action: string;
    data: RhActionItem | Record<string, unknown>;
};

export type PostRhActionBody = {
    project_id?: string | null;
    assigned_to?: string | null;
    type: RhActionRequestType;
    message: string;
    priority: RhActionPriority;
};

export type PatchRhActionBody = {
    status?: RhActionPatchStatus;
    response_message?: string;
    assigned_to?: string;
};
