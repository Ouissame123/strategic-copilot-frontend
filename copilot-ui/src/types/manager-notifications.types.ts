export type ManagerNotificationSeverity = "critical" | "high" | "medium" | "low";

export type ManagerNotificationStatus = "pending" | "sent" | "ack" | "failed";

export type ManagerNotificationIconType =
    | "overload"
    | "compliance"
    | "budget"
    | "delay"
    | "skill_gap"
    | "turnover"
    | "info";

export type ManagerNotificationTimeBucket = "today" | "yesterday" | "this_week" | "older";

export type ManagerNotificationTimeFilter = "unread" | "last_24h" | "all";

export interface ManagerNotification {
    id: string;
    project_id: string | null;
    project_name: string | null;
    severity: ManagerNotificationSeverity;
    title: string;
    message: string;
    status: ManagerNotificationStatus;
    icon_type: ManagerNotificationIconType;
    age_label: string;
    time_bucket: ManagerNotificationTimeBucket;
    occurrence_count: number;
    created_at: string;
    /** UUID risk_alerts — PATCH risk-alerts (legacy). */
    risk_alert_id?: string;
}

export interface ManagerNotifCounts {
    unread_count: number;
    unread_critical: number;
    unread_high: number;
    unread_medium: number;
    unread_low: number;
    unread_24h: number;
    total: number;
}

export interface ManagerNotificationsListResponse {
    status: string;
    notifications: ManagerNotification[];
    counts?: Partial<ManagerNotifCounts>;
}
