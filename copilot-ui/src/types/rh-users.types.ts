export type UserRole = "manager" | "rh" | "admin";
export type UserStatus = "active" | "disabled";

export interface RhUser {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    managed_talents_count: number;
    created_at: string;
    updated_at: string;
}

export interface RhUsersSummary {
    total: number;
    managers: number;
    rh: number;
    admins: number;
}

export interface RhUsersListFilters {
    role?: UserRole;
    status?: UserStatus;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface RhUsersListResponse {
    status: "success";
    workflow?: "WF_RH_Users_Management";
    operation?: "list";
    enterprise_id: string;
    count: number;
    items: RhUser[];
    users: RhUser[];
    filters_applied: {
        role: UserRole | null;
        status: UserStatus;
        search: string | null;
        limit: number;
        offset: number;
    };
    summary: RhUsersSummary;
}

export interface RhUserCreateInput {
    full_name: string;
    email: string;
    password: string;
    role: "manager" | "rh";
}

export interface RhUserCreateResponse {
    status: "success";
    operation: "create";
    user: RhUser & { enterprise_id: string };
    message: string;
}

export type RhUserPatchAction = "change_password" | "toggle_status";

export interface RhUserPatchInput {
    action: RhUserPatchAction;
    new_password?: string;
}

export interface RhUserPatchResponse {
    status: "success";
    operation: "change_password" | "toggle_status";
    user: {
        id: string;
        full_name: string;
        email: string;
        role: UserRole;
        status: UserStatus;
        updated_at: string;
    };
    sessions_revoked: number;
    message: string;
}

export interface RhUserDeleteResponse {
    status: "success";
    operation: "delete";
    already_disabled: boolean;
    user: {
        id: string;
        full_name: string;
        email: string;
        role: UserRole;
        new_status: "disabled";
    };
    cascade: {
        sessions_revoked: number;
        talents_unassigned: number;
    };
    message: string;
}

export type RhUsersErrorCode =
    | "MISSING_BEARER"
    | "INVALID_TOKEN"
    | "TOKEN_EXPIRED"
    | "FORBIDDEN"
    | "NO_ENTERPRISE"
    | "VALIDATION_FAILED"
    | "INVALID_ID"
    | "EMAIL_TAKEN"
    | "USER_NOT_FOUND"
    | "SELF_DELETE_FORBIDDEN"
    | "WEAK_PASSWORD"
    | string;
