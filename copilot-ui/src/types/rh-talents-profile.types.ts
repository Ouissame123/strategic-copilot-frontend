/** WF_RH_Talents_Profile_CRUD — contrat backend strict. */

export type TalentStatus = "active" | "inactive";

export interface TalentProfile {
    talent_id: string;
    user_id: string | null;
    has_portal_access: boolean;
    name: string;
    email: string;
    job_title: string;
    department: string | null;
    seniority_level: string | null;
    status: TalentStatus;
    hire_date: string | null;
    phone: string | null;
    contract_end_date: string | null;
    manager_user_id: string | null;
    manager_name: string | null;
    manager_email: string | null;
    has_manager: boolean;
    created_at: string;
    updated_at: string;
}

export interface TalentCreateInput {
    name: string;
    email: string;
    job_title: string;
    department?: string;
    seniority_level?: string;
    manager_user_id?: string;
    phone?: string;
}

export interface TalentsListFilters {
    status?: TalentStatus;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface TalentsListSummary {
    total: number;
    with_manager: number;
    without_manager: number;
    with_portal: number;
}

export interface TalentsListResponse {
    status: "success";
    workflow?: string;
    operation?: "list";
    enterprise_id?: string;
    count: number;
    items: TalentProfile[];
    talents: TalentProfile[];
    filters_applied: TalentsListFilters;
    summary: TalentsListSummary;
    meta?: { api_version?: string; computed_at?: string };
}

export interface TalentCreateResponse {
    status: "success";
    operation?: "create";
    talent: {
        talent_id: string;
        name: string;
        email: string;
        job_title: string;
        department: string | null;
        seniority_level: string | null;
        manager_user_id: string | null;
        enterprise_id: string;
        created_at: string;
    };
    message: string;
}

export interface TalentToggleResponse {
    status: "success";
    operation?: "toggle_status";
    talent: {
        talent_id: string;
        name: string;
        email: string;
        job_title: string;
        status: TalentStatus;
        updated_at: string;
    };
    message: string;
}

export interface TalentDeleteResponse {
    status: "success";
    operation?: "delete";
    already_inactive: boolean;
    talent: {
        id: string;
        name: string;
        email: string;
        job_title: string;
        new_status: "inactive";
    };
    cascade: {
        assignments_ended: number;
    };
    message: string;
}

export interface TalentErrorResponse {
    status: "error";
    code?: string;
    message: string;
    errors?: string[];
}
