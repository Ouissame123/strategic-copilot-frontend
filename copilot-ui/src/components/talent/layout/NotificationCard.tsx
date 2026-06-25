import { AlertTriangle, Bell, Check, FolderOpen } from "lucide-react";
import type { TalentNotification } from "@/types/talent-notifications";
import { cx } from "@/utils/cx";
import { severityToneClass } from "./talent-notifications-ui";

type NotificationCardProps = {
    notification: TalentNotification;
    onMarkRead?: () => void;
    isMarkingRead?: boolean;
};

export function NotificationCard({ notification, onMarkRead, isMarkingRead }: NotificationCardProps) {
    const Icon = notification.source_type === "alert" ? AlertTriangle : Bell;

    return (
        <div
            className={cx(
                severityToneClass(notification.severity),
                "p-3 transition",
                notification.is_read && "opacity-60",
            )}
        >
            <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Icon className="size-3 shrink-0 opacity-80" aria-hidden />
                        <span className="text-[10px] font-semibold uppercase tracking-wide">
                            {notification.severity_label}
                        </span>
                        <span className="text-[10px] opacity-70">· {notification.age_label}</span>
                        {notification.source_label ? (
                            <span className="text-[10px] opacity-70">· {notification.source_label}</span>
                        ) : null}
                    </div>
                    <p className="truncate text-sm font-medium">{notification.title}</p>
                    {notification.message && notification.message !== notification.title ? (
                        <p className="mt-1 line-clamp-2 text-xs opacity-80">{notification.message}</p>
                    ) : null}
                    {notification.project_name ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs opacity-70">
                            <FolderOpen className="size-3 shrink-0" aria-hidden />
                            {notification.project_name}
                        </p>
                    ) : null}
                </div>
                {onMarkRead ? (
                    <button
                        type="button"
                        onClick={onMarkRead}
                        disabled={isMarkingRead}
                        aria-label="Marquer comme lue"
                        className="shrink-0 rounded p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100 disabled:opacity-40 dark:hover:bg-black/20"
                    >
                        <Check className="size-3.5" aria-hidden />
                    </button>
                ) : null}
            </div>
        </div>
    );
}

export function NotificationsDrawerSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
            ))}
        </div>
    );
}

export function NotificationsDrawerEmpty() {
    return (
        <div className="py-12 text-center text-tertiary">
            <Bell className="mx-auto mb-2 size-8 opacity-40" aria-hidden />
            <p className="text-sm">Aucune notification</p>
        </div>
    );
}
