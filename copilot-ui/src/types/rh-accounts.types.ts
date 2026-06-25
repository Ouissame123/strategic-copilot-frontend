export type RhStaffRole = "manager" | "rh" | "admin";

export type RhTalentSeniority = "junior" | "mid" | "senior";

export type RhTalentContractType = "CDI" | "CDD" | "Freelance";

export interface RhStaffAccount {
    id: string;
    full_name: string;
    email: string;
    role: RhStaffRole;
    status?: "active" | "disabled" | string;
    managed_talents_count: number;
    created_at?: string;
    updated_at?: string;
}

export interface RhTalentAccount {
    id: string;
    talent_id?: string;
    name: string;
    email: string;
    job_title: string;
    department?: string | null;
    seniority?: RhTalentSeniority | string;
    seniority_level?: string | null;
    contract_type?: RhTalentContractType | string;
    contract_end_date?: string | null;
    hire_date?: string | null;
    manager_user_id?: string | null;
    manager_name?: string | null;
    manager_email?: string | null;
    has_manager: boolean;
    phone?: string | null;
    user_id?: string | null;
    has_portal_access?: boolean;
    status?: "active" | "inactive" | string;
    created_at?: string;
    updated_at?: string;
}

export type RhDeletedAccountKind = "staff" | "talent";

export interface RhDeletedAccount {
    id: string;
    kind: RhDeletedAccountKind;
    name: string;
    email: string;
    role?: string;
    job_title?: string;
    deleted_at?: string;
}

export interface RhAccountsListParams {
    role?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface RhStaffAccountsSummary {
    total: number;
    managers: number;
    rh: number;
    admins?: number;
}

export interface RhStaffAccountsListResponse {
    status: string;
    count: number;
    users: RhStaffAccount[];
    summary?: RhStaffAccountsSummary;
}

export interface RhTalentAccountsSummary {
    total: number;
    with_manager: number;
    without_manager: number;
}

export interface RhTalentAccountsListResponse {
    status: string;
    count: number;
    talents: RhTalentAccount[];
    summary?: RhTalentAccountsSummary;
}

export interface CreateRhStaffAccountBody {
    full_name: string;
    email: string;
    password: string;
    role: RhStaffRole;
}

export interface CreateRhTalentAccountBody {
    name: string;
    email: string;
    job_title: string;
    department?: string;
    seniority?: RhTalentSeniority;
    contract_type?: RhTalentContractType;
    manager_user_id?: string;
    phone?: string;
}

export interface RhCreateStaffAccountResponse {
    status: string;
    user: RhStaffAccount;
    message?: string;
}

export interface RhCreateTalentAccountResponse {
    status: string;
    talent: RhTalentAccount;
}

export interface RhDeleteUserCascade {
    sessions_revoked: number;
    talents_unassigned: number;
    unassigned_talents?: Array<{ id: string; name: string }>;
}

export interface RhDeleteTalentCascade {
    assignments_ended: number;
    ended_assignments?: Array<{ id: string; project_id: string }>;
}

export interface RhDeleteStaffAccountResponse {
    status: string;
    user: RhStaffAccount;
    cascade?: RhDeleteUserCascade;
    message?: string;
}

export interface RhDeleteTalentAccountResponse {
    status: string;
    talent: RhTalentAccount;
    cascade?: RhDeleteTalentCascade;
    message?: string;
}

export type RhAccountsTabId = "staff" | "talents" | "deleted";

export type RhStaffPatchAction = { action: "change_password"; new_password: string } | { action: "toggle_status" };

export type RhTalentPatchAction = { action: "toggle_status" };

export interface RhPatchStaffAccountResponse {
    status: string;
    user?: RhStaffAccount;
    message?: string;
}

export interface RhPatchTalentAccountResponse {
    status: string;
    talent?: RhTalentAccount;
    message?: string;
}

/** Séniorité renvoyée par GET `/webhook/rh/talents/unlinked`. */
export type RhUnlinkedTalentSeniority = "Junior" | "Mid" | "Senior" | "Lead";

/** Talent actif sans compte utilisateur — WF_RH_Accounts_CRUD_v1 `list_unlinked_talents`. */
export interface RhUnlinkedTalent {
    talent_id: string;
    name: string;
    email: string;
    job_title: string;
    department: string | null;
    seniority_level: RhUnlinkedTalentSeniority | null;
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

export interface RhUnlinkedTalentsListParams {
    search?: string;
    limit?: number;
}

export interface RhUnlinkedTalentsResponse {
    status: "success";
    count: number;
    filters: { search: string | null; limit: number };
    talents: RhUnlinkedTalent[];
}

/** Talent sans compte — liste modal « Talent existant » (wf-rh-list-talents-v1). */
export interface RhExistingTalentListItem {
    talent_id: string;
    name: string;
    email?: string;
    job_title?: string;
    department?: string;
    seniority_level?: string;
    manager_user_id?: string;
    phone?: string;
}
