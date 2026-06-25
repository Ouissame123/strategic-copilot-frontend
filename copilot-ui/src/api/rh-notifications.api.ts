import { httpClient } from "@/lib/http-client";
import type { NotificationsFilters, NotificationsListResponse, RhNotificationsTriggerResult } from "@/types/rh-notifications.types";

const API_BASE = "https://n8nprod.aphelionxinnovations.com";

// ─────────────────────────────────────────────────────────────
// GET /webhook/rh/notifications
// ─────────────────────────────────────────────────────────────
export async function getRhNotifications(filters: NotificationsFilters = {}): Promise<NotificationsListResponse> {
    const params: Record<string, string | number> = {};

    if (filters.limit != null) params.limit = filters.limit;
    if (filters.offset != null) params.offset = filters.offset;
    if (filters.order_by) params.order_by = filters.order_by;
    if (filters.order_dir) params.order_dir = filters.order_dir;
    if (filters.only_unread) params.only_unread = "true";
    if (filters.severity) params.severity = filters.severity;
    if (filters.type) params.type = filters.type;
    if (filters.search?.trim()) params.search = filters.search.trim();

    const { data } = await httpClient.get<NotificationsListResponse>(rhWebhookUrl("/rh/notifications"), { params });
    return data;
}

// ─────────────────────────────────────────────────────────────
// DELETE /webhook/rh-notifications-delete/rh/notifications/:id
// (mark as read — webhookId inclus dans l'URL, c'est volontaire)
// ─────────────────────────────────────────────────────────────
export async function markNotificationAsRead(notificationId: string) {
    const { data } = await httpClient.delete(
        rhWebhookUrl(`/rh-notifications-delete/rh/notifications/${notificationId}`),
    );
    return data;
}

// ─────────────────────────────────────────────────────────────
// POST /webhook/rh/notifications/trigger  (⚠️ deprecated)
// ─────────────────────────────────────────────────────────────
export async function triggerNotificationsScan(): Promise<RhNotificationsTriggerResult> {
    const { data } = await httpClient.post<RhNotificationsTriggerResult>(rhWebhookUrl("/rh/notifications/trigger"));
    return data;
}
