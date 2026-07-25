import type { HTMLAttributes } from "react";
import { Bell01 } from "@untitledui/icons";
import { useManagerNotificationCounts } from "@/hooks/use-manager-notifications-bell";
import { cx } from "@/utils/cx";

/** Icône cloche sidebar manager — badge compteur (poll 60s via React Query). */
export function ManagerRisksAlertesNavIcon(props: HTMLAttributes<HTMLOrSVGElement>) {
    const { className, ...rest } = props;
    const { data: counts } = useManagerNotificationCounts();
    const unread = counts?.unread_count ?? 0;
    const critical = counts?.unread_critical ?? 0;

    return (
        <span className={cx("relative inline-flex items-center justify-center overflow-visible", className)} {...rest}>
            <Bell01 aria-hidden className="size-full shrink-0 text-fg-quaternary transition-inherit-all" />
            {unread > 0 ? (
                <span
                    className={cx(
                        "pointer-events-none absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-secondary",
                        critical > 0 ? "bg-red-600" : "bg-amber-500",
                    )}
                >
                    {unread > 99 ? "99+" : unread}
                </span>
            ) : null}
        </span>
    );
}
