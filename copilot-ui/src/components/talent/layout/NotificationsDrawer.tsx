import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
    NotificationCard,
    NotificationsDrawerEmpty,
    NotificationsDrawerSkeleton,
} from "@/components/talent/layout/NotificationCard";
import {
    NOTIFICATIONS_DRAWER_TABS,
    type NotificationsDrawerTab,
} from "@/components/talent/layout/talent-notifications-ui";
import {
    useTalentNotificationMarkAllRead,
    useTalentNotificationMarkRead,
    useTalentNotificationsList,
} from "@/hooks/useTalentNotifications";
import { cx } from "@/utils/cx";

type NotificationsDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function NotificationsDrawer({ open, onOpenChange }: NotificationsDrawerProps) {
    const [tab, setTab] = useState<NotificationsDrawerTab>("unread");
    const markRead = useTalentNotificationMarkRead();
    const markAllRead = useTalentNotificationMarkAllRead();
    const listQuery = useTalentNotificationsList(tab === "unread", open);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onOpenChange(false);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onOpenChange]);

    if (!open) return null;

    const items = listQuery.data ?? [];
    const hasUnread = items.some((item) => !item.is_read && item.can_mark_read);

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]"
                aria-label="Fermer les notifications"
                onClick={() => onOpenChange(false)}
            />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[420px] flex-col border-l border-secondary bg-primary shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="talent-notifications-drawer-title"
            >
                <header className="shrink-0 border-b border-secondary px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="talent-notifications-drawer-title" className="text-base font-semibold text-primary">
                            Notifications
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => markAllRead.mutate()}
                                disabled={!hasUnread || markAllRead.isPending}
                                className="text-xs font-medium text-brand-secondary hover:underline disabled:cursor-not-allowed disabled:text-tertiary disabled:no-underline"
                            >
                                Tout marquer lu
                            </button>
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="rounded-lg p-2 text-tertiary transition hover:bg-secondary_subtle hover:text-primary"
                                aria-label="Fermer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 inline-flex w-full gap-1 rounded-lg bg-secondary_subtle p-1">
                        {NOTIFICATIONS_DRAWER_TABS.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => setTab(item.value)}
                                className={cx(
                                    "flex-1 rounded-md px-3 py-1.5 text-[12.5px] transition",
                                    tab === item.value
                                        ? "bg-primary font-medium text-primary shadow-xs"
                                        : "text-tertiary hover:text-primary",
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                    {listQuery.isLoading ? <NotificationsDrawerSkeleton /> : null}
                    {!listQuery.isLoading && items.length === 0 ? <NotificationsDrawerEmpty /> : null}
                    {!listQuery.isLoading && items.length > 0 ? (
                        <div className="space-y-2">
                            {items.map((notification) => (
                                <NotificationCard
                                    key={`${notification.source_type}-${notification.id}`}
                                    notification={notification}
                                    isMarkingRead={markRead.isPending}
                                    onMarkRead={
                                        notification.can_mark_read && !notification.is_read
                                            ? () => markRead.mutate(notification.id)
                                            : undefined
                                    }
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
            </aside>
        </>
    );
}
