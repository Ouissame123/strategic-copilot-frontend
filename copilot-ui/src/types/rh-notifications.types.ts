/** WF_RH_Notifications — ÉTAPE 7 (PDF strict). */

export type NotificationSeverity = "critical" | "high" | "medium" | "low";

export type NotificationType =
    | "urgent_request"
    | "talent_at_risk"
    | "contract_ending"
    | "skill_gap_critical"
    | "budget_overrun"
    | string;

export interface RhNotification {
    id: string;
    source_table?: "notifications" | "rh_notifications" | string;
    severity: NotificationSeverity;
    title: string;
    message: string | null;
    is_read: boolean;
    read_at: string | null;
    type: NotificationType;
    metadata: Record<string, unknown> | null;
    entity_id: string | null;
    entity_type: "talent" | "project" | "assignment" | "rh_action" | string | null;
    project_id?: string | null;
    talent_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationsPagination {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
    next_offset: number | null;
    prev_offset: number | null;
    page: number;
    total_pages: number;
}

export interface NotificationsSummary {
    unread_count: number;
    critical_unread: number;
    high_unread: number;
    medium_unread: number;
    by_type: {
        urgent_requests: number;
        talents_at_risk: number;
        contracts_ending: number;
        skill_gaps: number;
        budget_overruns: number;
        [key: string]: number;
    };
}

export interface NotificationsListResponse {
    success: boolean;
    status?: string;
    workflow?: string;
    operation?: string;
    enterprise_id?: string;
    items: RhNotification[];
    notifications: RhNotification[];
    count: number;
    pagination: NotificationsPagination;
    filters_applied: Record<string, unknown>;
    summary: NotificationsSummary;
    meta?: { api_version?: string; computed_at?: string };
}

export interface NotificationsFilters {
    limit?: number;
    offset?: number;
    order_by?: "created_at" | "severity" | "updated_at";
    order_dir?: "asc" | "desc";
    only_unread?: boolean;
    severity?: NotificationSeverity | null;
    type?: NotificationType | null;
    search?: string | null;
}

export type NotificationsReadTab = "all" | "unread" | "read";

export interface RhNotificationsTriggerResult {
    success: boolean;
    message: string;
    triggered_at?: string;
    created?: {
        urgent_requests: number;
        talents_at_risk: number;
        contracts_ending: number;
        skill_gaps: number;
        budget_overruns: number;
        total: number;
    };
    deprecation_warning?: {
        deprecated: boolean;
        reason?: string;
        migration_target?: string;
        will_be_removed?: string;
    };
}
