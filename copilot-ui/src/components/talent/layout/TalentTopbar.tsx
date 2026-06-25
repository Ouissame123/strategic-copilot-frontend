import { Bell } from "lucide-react";
import { useState } from "react";
import { NotificationsDrawer } from "@/components/talent/layout/NotificationsDrawer";
import { useTalentNotificationsSummary } from "@/hooks/useTalentNotifications";
import { cx } from "@/utils/cx";

/** Cloche notifications talent + drawer. */
export function TalentNotificationsBell() {
    const { data: summary } = useTalentNotificationsSummary();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const unread = summary?.total_unread ?? 0;
    const hasUrgent = summary?.has_urgent === true;
    const badge = unread > 99 ? "99+" : unread > 0 ? String(unread) : null;

    return (
        <>
            <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ""}`}
                className={cx(
                    "relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-secondary bg-primary text-tertiary shadow-xs transition",
                    "hover:border-secondary_hover hover:bg-secondary_subtle hover:text-primary",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                )}
            >
                <Bell className={cx("size-[18px]", hasUrgent && "animate-pulse text-red-600 dark:text-red-400")} aria-hidden />
                {badge ? (
                    <span
                        className={cx(
                            "absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1",
                            "text-[10px] font-semibold text-white",
                            hasUrgent ? "bg-red-600" : "bg-violet-600",
                        )}
                    >
                        {badge}
                    </span>
                ) : null}
            </button>

            <NotificationsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        </>
    );
}

/** @deprecated Utiliser `TalentNotificationsBell` + `ProfileMenu` dans le shell. */
export function TalentTopbar() {
    return <TalentNotificationsBell />;
}
