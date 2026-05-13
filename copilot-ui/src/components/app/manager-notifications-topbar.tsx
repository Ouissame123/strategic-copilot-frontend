import { Bell01 } from "@untitledui/icons";
import { Button as AriaButton, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Link } from "react-router";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationItem } from "@/types/api.types";
import { cx } from "@/utils/cx";

/** Page liste notifications manager (voir `main.tsx`). Fallback métier : `/workspace/manager/risks`. */
const NOTIFICATIONS_LIST_HREF = "/workspace/manager/notifications";

function isUnreadStatus(status: string | undefined): boolean {
    const s = (status ?? "").toLowerCase();
    if (!s) return false;
    if (["open", "new", "pending", "unread", "active"].includes(s)) return true;
    return !["read", "ack", "acknowledged", "resolved", "closed", "dismissed"].includes(s);
}

function formatRelativeFr(iso: string): string {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "—";
    const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (sec < 45) return "À l’instant";
    const min = Math.floor(sec / 60);
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Il y a ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `Il y a ${d} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function severityPillClass(severity: string): string {
    const s = severity.toLowerCase();
    const map: Record<string, string> = {
        critical: "border-red-200/80 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100",
        high: "border-orange-200/80 bg-orange-50 text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/35 dark:text-orange-100",
        medium: "border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
        low: "border-blue-200/80 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/35 dark:text-blue-100",
    };
    return map[s] ?? "border-secondary bg-secondary_subtle text-secondary";
}

function computeBadge(items: NotificationItem[]): { count: number; tone: "red" | "orange" } {
    const unread = items.filter((n) => isUnreadStatus(n.status));
    if (unread.length > 0) {
        return { count: Math.min(99, unread.length), tone: "red" };
    }
    const urgent = items.filter((n) => ["critical", "high"].includes((n.severity ?? "").toLowerCase()));
    if (urgent.length > 0) {
        return { count: Math.min(99, urgent.length), tone: "orange" };
    }
    return { count: 0, tone: "red" };
}

/**
 * Cloche + popover : données via `useNotifications` (endpoint manager existant).
 */
export function ManagerNotificationsTopbarDropdown() {
    const { data, isPending, isError, isFetching } = useNotifications({ limit: 25 });
    const items = data?.items ?? [];
    const preview = items.slice(0, 5);
    const badge = computeBadge(items);
    const showHardError = isError;

    return (
        <AriaDialogTrigger>
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
                {badge.count > 0 ? (
                    <span
                        className={cx(
                            "absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-primary",
                            badge.tone === "red" ? "bg-red-600" : "bg-orange-500",
                        )}
                    >
                        {badge.count}
                    </span>
                ) : null}
            </AriaButton>
            <AriaPopover
                placement="bottom end"
                offset={8}
                className={({ isEntering, isExiting }) =>
                    cx(
                        "w-[min(calc(100vw-1.5rem),20rem)] origin-(--trigger-anchor-point) rounded-xl border border-secondary bg-primary p-0 shadow-lg ring-1 ring-secondary/60 will-change-transform",
                        isEntering &&
                            "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-1 placement-top:slide-in-from-bottom-1",
                        isExiting && "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-1",
                    )
                }
            >
                <div className="border-b border-secondary/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-primary">Notifications</h2>
                        {isFetching && !isPending ? (
                            <span className="text-[10px] font-medium text-tertiary">Mise à jour…</span>
                        ) : null}
                    </div>
                </div>

                <div className="max-h-[min(60vh,22rem)] overflow-y-auto px-2 py-2">
                    {isPending ? (
                        <p className="px-3 py-6 text-center text-xs text-tertiary">Chargement…</p>
                    ) : showHardError ? (
                        <p className="px-3 py-6 text-center text-xs text-red-600 dark:text-red-400">
                            Impossible de charger les notifications. Vérifiez la connexion ou réessayez plus tard.
                        </p>
                    ) : preview.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-tertiary">Aucune notification récente.</p>
                    ) : (
                        <ul className="space-y-1">
                            {preview.map((n) => (
                                <li key={n.id}>
                                    <div className="rounded-lg border border-transparent px-2 py-2 transition hover:border-secondary/80 hover:bg-secondary_subtle/60">
                                        <div className="flex items-start justify-between gap-2">
                                            <span
                                                className={cx(
                                                    "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                                    severityPillClass(n.severity ?? ""),
                                                )}
                                            >
                                                {n.severity || "—"}
                                            </span>
                                            <span className="shrink-0 text-[10px] text-tertiary">{formatRelativeFr(n.created_at)}</span>
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-xs font-medium text-primary">{n.title || n.message || "Notification"}</p>
                                        {n.title && n.message && n.message !== n.title ? (
                                            <p className="mt-0.5 line-clamp-2 text-[11px] text-secondary">{n.message}</p>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="border-t border-secondary/70 p-2">
                    <Link
                        to={NOTIFICATIONS_LIST_HREF}
                        className="flex w-full items-center justify-center rounded-lg py-2 text-xs font-semibold text-brand-secondary transition hover:bg-brand-primary/10"
                    >
                        Voir toutes
                    </Link>
                </div>
            </AriaPopover>
        </AriaDialogTrigger>
    );
}
