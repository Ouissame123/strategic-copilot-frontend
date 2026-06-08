export type RhStaffRole = "manager" | "rh";

export type RhTalentSeniority = "junior" | "mid" | "senior";

export type RhTalentContractType = "CDI" | "CDD" | "Freelance";

export interface RhStaffAccount {
    id: string;
    full_name: string;
    email: string;
    role: RhStaffRole;
    status?: string;
    managed_talents_count: number;
    created_at?: string;
}

export interface RhTalentAccount {
    id: string;
    name: string;
    email: string;
    job_title: string;
    department?: string;
    seniority?: RhTalentSeniority | string;
    contract_type?: RhTalentContractType | string;
    manager_user_id?: string;
    manager_name?: string;
    has_manager: boolean;
    phone?: string;
    status?: string;
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
}

export interface RhCreateTalentAccountResponse {
    status: string;
    talent: RhTalentAccount;
}

export interface RhDeleteUserCascade {
    sessions_revoked: number;
    talents_unassigned: number;
}

export interface RhDeleteStaffAccountResponse {
    status: string;
    user: RhStaffAccount;
    cascade?: RhDeleteUserCascade;
}

export interface RhDeleteTalentAccountResponse {
    status: string;
    talent: RhTalentAccount;
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
