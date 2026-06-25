export type TalentNotificationSeverity = "critical" | "high" | "medium" | "low";
export type TalentNotificationSourceType = "notification" | "alert";

export interface TalentNotification {
    id: string;
    source_type: TalentNotificationSourceType;
    source_label: string;
    severity: TalentNotificationSeverity;
    severity_label: string;
    title: string;
    message: string | null;
    status: string;
    project_id: string | null;
    project_name: string | null;
    is_read: boolean;
    can_mark_read: boolean;
    created_at: string;
    age_label: string;
}

export interface TalentNotificationsSummary {
    total_unread: number;
    unread_notifications: number;
    open_alerts: number;
    urgent_count: number;
    has_urgent: boolean;
}
