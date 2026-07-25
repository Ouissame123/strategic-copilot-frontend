import { useCallback, useState } from "react";
import { Bell01, BellOff01 } from "@untitledui/icons";
import { Button as AriaButton, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { managerNotificationsApi } from "@/api/manager-notifications.api";
import {
    managerNotificationsQueryKeys,
    useManagerNotificationCounts,
    useManagerNotificationsList,
} from "@/hooks/use-manager-notifications-bell";
import { isManagerNotificationUnread } from "@/lib/manager-notifications-normalize";
import type { ManagerNotification, ManagerNotificationSeverity } from "@/types/manager-notifications.types";
import { cx } from "@/utils/cx";

const NOTIFICATIONS_PAGE_HREF = "/workspace/manager/risques-alertes";

const SEVERITY_DOT: Record<ManagerNotificationSeverity, string> = {
    critical: "bg-red-500",
    high: "bg-amber-500",
    medium: "bg-amber-400",
    low: "bg-slate-400",
};

export function ManagerNotificationsTopbarDropdown() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [ackingId, setAckingId] = useState<string | null>(null);
    const [ackingAll, setAckingAll] = useState(false);

    const countsQuery = useManagerNotificationCounts();
    const listQuery = useManagerNotificationsList({ time_filter: "all", limit: 30 }, open);

    const counts = countsQuery.data;
    const notifications = listQuery.data ?? [];
    const unreadCount = counts?.unread_count ?? 0;
    const badgeTone = counts && counts.unread_critical > 0 ? "red" : "orange";

    const handleAck = useCallback(
        async (notif: ManagerNotification) => {
            if (!isManagerNotificationUnread(notif.status)) return;
            setAckingId(notif.id);
            try {
                await managerNotificationsApi.ackOne(notif.id);
                qc.setQueryData(
                    managerNotificationsQueryKeys.list({ time_filter: "all", limit: 30 }),
                    (prev: ManagerNotification[] | undefined) =>
                        prev?.map((n) => (n.id === notif.id ? { ...n, status: "ack" as const } : n)),
                );
                qc.setQueryData(managerNotificationsQueryKeys.counts(), (prev: typeof counts) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        unread_count: Math.max(0, prev.unread_count - 1),
                        unread_critical:
                            notif.severity === "critical" ? Math.max(0, prev.unread_critical - 1) : prev.unread_critical,
                        unread_high: notif.severity === "high" ? Math.max(0, prev.unread_high - 1) : prev.unread_high,
                    };
                });
            } finally {
                setAckingId(null);
            }
        },
        [qc],
    );

    const handleAckAll = useCallback(async () => {
        setAckingAll(true);
        try {
            await managerNotificationsApi.ackAll();
            qc.setQueryData(
                managerNotificationsQueryKeys.list({ time_filter: "all", limit: 30 }),
                (prev: ManagerNotification[] | undefined) => prev?.map((n) => ({ ...n, status: "ack" as const })),
            );
            qc.setQueryData(managerNotificationsQueryKeys.counts(), (prev: typeof counts) =>
                prev
                    ? {
                          ...prev,
                          unread_count: 0,
                          unread_critical: 0,
                          unread_high: 0,
                          unread_medium: 0,
                          unread_low: 0,
                      }
                    : prev,
            );
        } finally {
            setAckingAll(false);
        }
    }, [qc]);

    return (
        <AriaDialogTrigger isOpen={open} onOpenChange={setOpen}>
            <AriaButton
                aria-label="Notifications"
                className={({ isPressed, isHovered, isFocusVisible }) =>
                    cx(
                        "relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-secondary/80 bg-primary text-secondary shadow-sm outline-none transition",
                        (isHovered || isPressed) && "border-secondary bg-secondary_subtle text-primary",
                        isFocusVisible && "ring-2 ring-brand-solid/35 ring-offset-2 ring-offset-primary",
                    )
                }
            >
                <Bell01 className="size-[1.125rem] shrink-0 stroke-2" aria-hidden />
                {unreadCount > 0 ? (
                    <span
                        className={cx(
                            "absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-primary",
                            badgeTone === "red" ? "bg-red-600" : "bg-amber-500",
                        )}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                ) : null}
            </AriaButton>
            <AriaPopover
                placement="bottom end"
                offset={8}
                className={({ isEntering, isExiting }) =>
                    cx(
                        "w-[min(calc(100vw-1.5rem),24rem)] origin-(--trigger-anchor-point) rounded-xl border border-secondary bg-primary p-0 shadow-lg ring-1 ring-secondary/60 will-change-transform",
                        isEntering &&
                            "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-1 placement-top:slide-in-from-bottom-1",
                        isExiting && "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-1",
                    )
                }
            >
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-secondary/70 bg-primary px-4 py-3">
                    <h2 className="text-sm font-semibold text-primary">
                        Notifications
                        {unreadCount > 0 ? (
                            <span className="ml-1.5 text-[11px] font-normal text-tertiary">({unreadCount} non lues)</span>
                        ) : null}
                    </h2>
                    <button
                        type="button"
                        onClick={() => void handleAckAll()}
                        disabled={ackingAll || unreadCount === 0}
                        className="text-[11px] font-medium text-violet-700 hover:text-violet-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-300"
                    >
                        {ackingAll ? "…" : "Tout lire"}
                    </button>
                </div>

                <div className="max-h-[min(60vh,22rem)] overflow-y-auto">
                    {listQuery.isLoading ? (
                        <p className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-tertiary">
                            <Loader2 size={14} className="animate-spin" aria-hidden />
                            Chargement…
                        </p>
                    ) : listQuery.isError ? (
                        <p className="px-3 py-8 text-center text-xs text-red-600 dark:text-red-400">
                            Impossible de charger les notifications.
                        </p>
                    ) : notifications.length === 0 ? (
                        <div className="px-3 py-10 text-center text-xs text-tertiary">
                            <BellOff01 className="mx-auto mb-2 size-7 opacity-60" aria-hidden />
                            Aucune notification
                        </div>
                    ) : (
                        <ul>
                            {notifications.map((n) => {
                                const unread = isManagerNotificationUnread(n.status);
                                const isActioning = ackingId === n.id;
                                return (
                                    <li key={n.id}>
                                        <button
                                            type="button"
                                            disabled={!unread || Boolean(ackingId)}
                                            onClick={() => unread && void handleAck(n)}
                                            className={cx(
                                                "flex w-full gap-2.5 border-b border-secondary/60 px-4 py-3 text-left transition",
                                                unread ? "bg-secondary_subtle/50 hover:bg-secondary_subtle" : "bg-primary",
                                                isActioning && "opacity-50",
                                                !unread && "cursor-default",
                                            )}
                                        >
                                            <span
                                                className={cx(
                                                    "mt-1.5 size-2 shrink-0 rounded-full",
                                                    unread ? SEVERITY_DOT[n.severity] : "bg-secondary",
                                                )}
                                                aria-hidden
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="mb-1 flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[9px] font-bold uppercase tracking-wide text-secondary">
                                                        {n.severity}
                                                    </span>
                                                    {n.occurrence_count > 1 ? (
                                                        <span className="rounded bg-secondary_subtle px-1 py-0.5 text-[9px] text-tertiary">
                                                            ×{n.occurrence_count}
                                                        </span>
                                                    ) : null}
                                                    <span className="ml-auto text-[10px] text-tertiary">{n.age_label}</span>
                                                </span>
                                                <span
                                                    className={cx(
                                                        "block text-xs leading-snug text-primary",
                                                        unread && "font-medium",
                                                    )}
                                                >
                                                    {n.title}
                                                </span>
                                                {n.message && n.message !== n.title ? (
                                                    <span className="mt-0.5 block truncate text-[11px] text-secondary">
                                                        {n.message}
                                                    </span>
                                                ) : null}
                                                {n.project_name ? (
                                                    <span className="mt-0.5 block text-[10px] text-tertiary">{n.project_name}</span>
                                                ) : null}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="sticky bottom-0 border-t border-secondary/70 bg-primary p-2">
                    <Link
                        to={NOTIFICATIONS_PAGE_HREF}
                        onClick={() => setOpen(false)}
                        className="flex w-full items-center justify-center rounded-lg py-2 text-xs font-semibold text-brand-secondary transition hover:bg-brand-primary/10"
                    >
                        Voir toutes →
                    </Link>
                </div>
            </AriaPopover>
        </AriaDialogTrigger>
    );
}
