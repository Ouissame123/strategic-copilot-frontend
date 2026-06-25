import type { TalentNotificationSeverity } from "@/types/talent-notifications";
import { cx } from "@/utils/cx";

export const NOTIFICATION_SEVERITY_TONES: Record<TalentNotificationSeverity, string> = {
    critical: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
    high: "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/25 dark:text-orange-100",
    medium: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100",
    low: "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100",
};

export function severityToneClass(severity: TalentNotificationSeverity): string {
    return cx("rounded-lg border", NOTIFICATION_SEVERITY_TONES[severity] ?? NOTIFICATION_SEVERITY_TONES.low);
}

export type NotificationsDrawerTab = "unread" | "all";

export const NOTIFICATIONS_DRAWER_TABS: { value: NotificationsDrawerTab; label: string }[] = [
    { value: "unread", label: "Non lues" },
    { value: "all", label: "Toutes" },
];
