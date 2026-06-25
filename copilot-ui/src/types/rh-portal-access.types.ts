export interface UnlinkedTalent {
    talent_id: string;
    name: string;
    email: string;
    job_title: string;
    department: string | null;
    seniority_level: string | null;
    status: "active";
    phone: string | null;
    contract_end_date: string | null;
    manager_user_id: string | null;
    manager_name: string | null;
    manager_email: string | null;
    has_manager: boolean;
    created_at: string;
    updated_at: string;
}

export interface OnboardTalentInput {
    name: string;
    email: string;
    password: string;
    job_title: string;
    department?: string;
    seniority_level?: string;
    manager_user_id?: string;
    phone?: string;
}

export interface GrantAccessInput {
    password: string;
}

export interface PortalUser {
    id: string;
    full_name: string;
    email: string;
    role: "talent";
    status: "active";
    created_at: string;
}

export interface OnboardResponse {
    status: "success";
    workflow?: "WF_RH_Talent_Portal_Access";
    operation: "onboard";
    user: PortalUser;
    talent: {
        talent_id: string;
        name: string;
        email: string;
        job_title: string;
        department: string | null;
        seniority_level: string | null;
        manager_user_id: string | null;
        user_id: string;
        enterprise_id: string;
        created_at: string;
    };
    message: string;
    login_info: { email: string; portal_url: string; note: string };
}

export interface GrantAccessResponse {
    status: "success";
    workflow?: "WF_RH_Talent_Portal_Access";
    operation: "grant_portal_access";
    user: PortalUser;
    talent: {
        talent_id: string;
        name: string;
        email: string;
        job_title: string;
        user_id: string;
        manager_user_id: string | null;
    };
    message: string;
    login_info: { email: string; portal_url: string; note: string };
}

export interface UnlinkedListResponse {
    status: "success";
    workflow?: "WF_RH_Talent_Portal_Access";
    operation?: "list_unlinked";
    enterprise_id: string;
    count: number;
    items: UnlinkedTalent[];
    talents: UnlinkedTalent[];
    filters_applied: { search: string | null; limit: number };
}

export type PortalAccessErrorCode =
    | "MISSING_BEARER"
    | "INVALID_TOKEN"
    | "TOKEN_EXPIRED"
    | "FORBIDDEN"
    | "NO_ENTERPRISE"
    | "VALIDATION_FAILED"
    | "INVALID_ID"
    | "WEAK_PASSWORD"
    | "TALENT_NOT_FOUND"
    | "ALREADY_HAS_ACCESS"
    | "EMAIL_TAKEN"
    | "ONBOARD_FAILED"
    | "GRANT_FAILED"
    | string;

export interface PortalAccessError {
    status: "error";
    workflow?: "WF_RH_Talent_Portal_Access";
    code: PortalAccessErrorCode;
    message: string;
    errors?: string[];
}

export type PortalAccessSuccessResponse = OnboardResponse | GrantAccessResponse;
