export type TalentRequestType = "formation" | "mobilite" | "conge" | "feedback" | "autre";
export type TalentRequestPriority = "low" | "normal" | "high" | "urgent";
export type TalentRequestStatus =
    | "pending"
    | "accepted"
    | "rejected"
    | "in_progress"
    | "done"
    | "closed"
    | "cancelled";

export interface TalentRequest {
    id: string;
    request_type: TalentRequestType;
    request_type_label: string;
    title: string;
    description: string | null;
    payload: Record<string, unknown>;
    status: TalentRequestStatus;
    status_label: string;
    priority: TalentRequestPriority;
    manager_user_id: string | null;
    manager_name: string | null;
    manager_email: string | null;
    decided_at: string | null;
    decided_by: string | null;
    decided_by_name: string | null;
    decided_by_role: string | null;
    decision_reason: string | null;
    hr_transferred_at: string | null;
    created_at: string;
    updated_at: string;
    can_cancel?: boolean;
    can_delete?: boolean;
    /** Présent sur la vue manager (`GET /webhook/manager/talent-requests`). */
    talent_id?: string | null;
    talent_name?: string | null;
    talent_email?: string | null;
}

export interface TalentRequestsSummary {
    total: number;
    by_status: Record<TalentRequestStatus, number>;
    by_type: Record<TalentRequestType, number>;
    urgent: number;
}

export interface CreateTalentRequestPayload {
    request_type: TalentRequestType;
    title: string;
    description?: string;
    priority?: TalentRequestPriority;
    payload?: Record<string, unknown>;
}

export interface TalentRequestsFilters {
    status?: TalentRequestStatus | "all";
    request_type?: TalentRequestType | "all";
    priority?: TalentRequestPriority | "all";
    talent_id?: string;
    search?: string;
    limit?: number;
}

export type ManagerTalentRequestDecisionAction = "accept" | "reject" | "transfer_rh";

export interface ManagerTalentRequestDecisionBody {
    action: ManagerTalentRequestDecisionAction;
    decision_reason?: string;
}
