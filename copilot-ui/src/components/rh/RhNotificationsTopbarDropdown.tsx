/**
 * Cloche notifications RH — GET/DELETE via `rh-dashboard.api` (WF_RH_Notifications).
 */
import { Bell } from "lucide-react";
import { useState } from "react";
import { Button as AriaButton, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useRhNotificationsTopbar } from "@/hooks/use-rh-notifications";
import type { RhNotification, RhNotificationSeverity } from "@/types/rh-dashboard.types";
import { RH_TEXT_MUTED, RH_TEXT_PRIMARY, RH_TEXT_SECONDARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

const NOTIF_TYPE_LABEL: Record<string, string> = {
    urgent_requests: "Demande urgente",
    urgent_request: "Demande urgente",
    talents_at_risk: "Talent à risque",
    talent_at_risk: "Talent à risque",
    contracts_ending: "Fin de contrat",
    contract_ending: "Fin de contrat",
    skill_gaps: "Compétence",
    skill_gap_critical: "Compétence",
    budget_overruns: "Budget",
    budget_overrun: "Budget",
};

function formatRelativeFr(iso: string): string {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "—";
    const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (sec < 45) return "À l'instant";
    const min = Math.floor(sec / 60);
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Il y a ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `Il y a ${d} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function severityStyles(severity: RhNotificationSeverity): {
    pill: string;
    row: string;
} {
    const map: Record<RhNotificationSeverity, { pill: string; row: string }> = {
        critical: {
            pill: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
            row: "border-rose-200/80 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20",
        },
        high: {
            pill: "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100",
            row: "border-orange-200/80 bg-orange-50/40 dark:border-orange-900/40 dark:bg-orange-950/15",
        },
        medium: {
            pill: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
            row: "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900/40",
        },
        low: {
            pill: "bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
            row: "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900/40",
        },
    };
    return map[severity] ?? map.medium;
}

function notificationDetailHref(n: RhNotification): string | null {
    if (n.talent_id) return `/workspace/rh/employees?talentId=${encodeURIComponent(n.talent_id)}`;
    if (n.project_id) return `/workspace/rh/manager-requests`;
    return null;
}

function RhNotificationRow({
    notification: n,
    onMarkRead,
    busy,
}: {
    notification: RhNotification;
    onMarkRead: (id: string) => Promise<void>;
    busy: boolean;
}) {
    const styles = severityStyles(n.severity);
    const detailHref = notificationDetailHref(n);
    const typeLabel = NOTIF_TYPE_LABEL[n.type] ?? n.type.replace(/_/g, " ");

    return (
        <li
            className={cx(
                "rounded-lg border px-3 py-2.5 transition",
                styles.row,
                !n.is_read && "ring-1 ring-inset ring-violet-200/60 dark:ring-violet-800/40",
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span className={cx("rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase", styles.pill)}>
                    {n.severity}
                </span>
                <span className={cx("shrink-0 text-[10px]", RH_TEXT_MUTED)}>{formatRelativeFr(n.created_at)}</span>
            </div>
            <p className={cx("mt-1.5 text-xs font-semibold leading-snug", RH_TEXT_PRIMARY)}>{n.title}</p>
            {n.message ? <p className={cx("mt-0.5 line-clamp-2 text-[11px] leading-snug", RH_TEXT_SECONDARY)}>{n.message}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cx("text-[10px]", RH_TEXT_MUTED)}>{typeLabel}</span>
                <span
                    className={cx(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        n.is_read ? "bg-slate-100 text-slate-500 dark:bg-slate-800" : "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200",
                    )}
                >
                    {n.is_read ? "Lu" : "Non lu"}
                </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
                {!n.is_read ? (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onMarkRead(n.id)}
                        className="text-[11px] font-semibold text-violet-700 hover:underline disabled:opacity-50 dark:text-violet-300"
                    >
                        Marquer comme lu
                    </button>
                ) : null}
                {detailHref ? (
                    <Link to={detailHref} className="text-[11px] font-semibold text-sky-700 hover:underline dark:text-sky-300">
                        Voir détail
                    </Link>
                ) : null}
            </div>
        </li>
    );
}

export function RhNotificationsTopbarDropdown() {
    const { user } = useAuth();
    const enterpriseId = user?.enterpriseId;
    const {
        notifications,
        unreadCount,
        isLoading,
        isFetching,
        isError,
        markRead,
        markAllRead,
        isMarkingAllRead,
        isMarkingRead,
    } = useRhNotificationsTopbar(enterpriseId);

    const [actionError, setActionError] = useState<string | null>(null);
    const badgeCount = Math.min(99, unreadCount);

    const handleMarkRead = async (id: string) => {
        setActionError(null);
        try {
            await markRead(id);
        } catch (e: unknown) {
            setActionError(e instanceof Error ? e.message : "Échec du marquage");
        }
    };

    const handleMarkAll = async () => {
        setActionError(null);
        try {
            await markAllRead();
        } catch (e: unknown) {
            setActionError(e instanceof Error ? e.message : "Échec du marquage global");
        }
    };

    return (
        <AriaDialogTrigger>
            <AriaButton
                aria-label={`Notifications${badgeCount > 0 ? `, ${badgeCount} non lues` : ""}`}
                className={({ isPressed, isHovered, isFocusVisible }) =>
                    cx(
                        "relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm outline-none transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                        (isHovered || isPressed) && "border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800",
                        isFocusVisible && "ring-2 ring-violet-500/35 ring-offset-2",
                    )
                }
            >
                <Bell className="size-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
                {badgeCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                        {badgeCount}
                    </span>
                ) : null}
            </AriaButton>
            <AriaPopover
                placement="bottom end"
                offset={8}
                className={({ isEntering, isExiting }) =>
                    cx(
                        "z-50 w-[min(calc(100vw-1.5rem),22rem)] origin-(--trigger-anchor-point) rounded-xl border border-slate-200 bg-white p-0 shadow-xl ring-1 ring-slate-200/80 will-change-transform dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-700/80",
                        isEntering &&
                            "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-1",
                        isExiting && "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-1",
                    )
                }
            >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <h2 className={cx("text-sm font-semibold", RH_TEXT_PRIMARY)}>Notifications</h2>
                    {isFetching && !isLoading ? (
                        <span className={cx("text-[10px]", RH_TEXT_MUTED)}>Mise à jour…</span>
                    ) : null}
                </div>

                <div className="max-h-[min(60vh,24rem)] overflow-y-auto px-2 py-2">
                    {isLoading ? (
                        <p className={cx("px-3 py-8 text-center text-xs", RH_TEXT_MUTED)}>Chargement…</p>
                    ) : isError ? (
                        <p className="px-3 py-8 text-center text-xs text-rose-600 dark:text-rose-400">
                            Impossible de charger les notifications.
                        </p>
                    ) : notifications.length === 0 ? (
                        <p className={cx("px-3 py-8 text-center text-xs", RH_TEXT_MUTED)}>Aucune notification</p>
                    ) : (
                        <ul className="space-y-2">
                            {notifications.map((n) => (
                                <RhNotificationRow
                                    key={n.id}
                                    notification={n}
                                    onMarkRead={handleMarkRead}
                                    busy={isMarkingRead || isMarkingAllRead}
                                />
                            ))}
                        </ul>
                    )}
                    {actionError ? <p className="px-3 py-2 text-center text-[11px] text-rose-600">{actionError}</p> : null}
                </div>

                <div className="space-y-1 border-t border-slate-100 p-2 dark:border-slate-800">
                    <button
                        type="button"
                        disabled={isMarkingAllRead || unreadCount === 0 || isLoading}
                        onClick={() => void handleMarkAll()}
                        className="flex w-full items-center justify-center rounded-lg py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-950/30"
                    >
                        Tout marquer comme lu
                    </button>
                </div>
            </AriaPopover>
        </AriaDialogTrigger>
    );
}
