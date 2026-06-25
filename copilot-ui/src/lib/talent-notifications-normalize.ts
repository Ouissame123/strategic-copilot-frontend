import type { TalentNotification, TalentNotificationsSummary } from "@/types/talent-notifications";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function arr<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeTalentNotificationsList(raw: unknown): TalentNotification[] {
    const root = unwrapN8nRoot(raw);
    return arr<TalentNotification>(root.items ?? root.notifications ?? root.data);
}

export function normalizeTalentNotificationsSummary(raw: unknown): TalentNotificationsSummary {
    const root = unwrapN8nRoot(raw);
    const summary = asRecord(root.summary ?? root);
    return {
        total_unread: Number(summary.total_unread ?? 0),
        unread_notifications: Number(summary.unread_notifications ?? 0),
        open_alerts: Number(summary.open_alerts ?? 0),
        urgent_count: Number(summary.urgent_count ?? 0),
        has_urgent: Boolean(summary.has_urgent),
    };
}
