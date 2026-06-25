export interface UsersStats {
    managers_active: number;
    rh_active: number;
    talent_accounts_active: number;
    disabled: number;
    total_active: number;
}

export interface TalentsStats {
    active: number;
    inactive: number;
    with_portal: number;
    without_portal: number;
    without_manager: number;
    portal_coverage_pct: number;
}

export interface Activity7dStats {
    users_created: number;
    talents_created: number;
}

export interface AccountsStats {
    users: UsersStats;
    talents: TalentsStats;
    activity_7d: Activity7dStats;
}

export interface AccountsStatsResponse {
    status: "success";
    workflow?: "WF_RH_Accounts_Audit_View";
    operation: "stats";
    enterprise_id: string;
    stats: AccountsStats;
    meta?: { api_version?: string; computed_at?: string };
}

export type OrphanedIssue = "talent_without_account" | "account_without_talent";

export interface OrphanedItem {
    talent_id: string;
    name: string;
    email: string;
    job_title: string | null;
    status: string;
    created_at: string;
    issue: OrphanedIssue;
}

export interface OrphanedSummary {
    talents_without_account: number;
    accounts_without_talent: number;
    total_orphaned: number;
}

export interface OrphanedResponse {
    status: "success";
    workflow?: "WF_RH_Accounts_Audit_View";
    operation: "orphaned";
    enterprise_id: string;
    count: number;
    summary: OrphanedSummary;
    items: OrphanedItem[];
}

export type AuditEntityType = "user" | "talent";
export type AuditEventType = "created" | "updated" | "disabled" | "deactivated";

export interface AuditEvent {
    entity_type: AuditEntityType;
    entity_id: string;
    name: string;
    email: string;
    role: string | null;
    status: string;
    event_type: AuditEventType;
    created_at: string;
    updated_at: string;
}

export interface AuditListFilters {
    since_days?: number;
    limit?: number;
    offset?: number;
    search?: string;
}

export interface AuditListResponse {
    status: "success";
    workflow?: "WF_RH_Accounts_Audit_View";
    operation: "audit";
    enterprise_id: string;
    filters_applied: {
        since_days: number;
        limit: number;
        offset: number;
        search: string | null;
    };
    count: number;
    items: AuditEvent[];
    events: AuditEvent[];
    meta?: { description?: string; computed_at?: string };
}
