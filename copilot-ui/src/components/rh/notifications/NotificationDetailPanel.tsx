import { X } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { SeverityBadge } from "@/components/rh/notifications/SeverityBadge";
import { useMarkNotificationAsRead } from "@/hooks/use-rh-notifications";
import { formatRelativeTimeFr } from "@/lib/rh-request-display";
import {
    formatNotificationMetadata,
    getNotificationTypeConfig,
    resolveNotificationTarget,
} from "@/lib/notification-mapping";
import type { RhNotification } from "@/types/rh-notifications.types";
import { cx } from "@/utils/cx";

type NotificationDetailPanelProps = {
    open: boolean;
    notification: RhNotification | null;
    onClose: () => void;
};

export function NotificationDetailPanel({ open, notification, onClose }: NotificationDetailPanelProps) {
    const markRead = useMarkNotificationAsRead();
    const navigate = useNavigate();
    const typeCfg = notification ? getNotificationTypeConfig(notification.type) : null;
    const TypeIcon = typeCfg?.icon;
    const metaRows = notification ? formatNotificationMetadata(notification.metadata) : [];

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open || !notification) return null;

    const target = resolveNotificationTarget(notification);

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 animate-inbox-fade-in bg-black/30"
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="rh-notif-panel-title"
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[480px] flex-col border-l border-ws-border bg-ws-card shadow-lg animate-inbox-slide-in"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ws-border-subtle px-5 py-4">
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            {TypeIcon ? <TypeIcon className={cx("size-4", typeCfg?.iconCls)} aria-hidden /> : null}
                            <SeverityBadge severity={notification.severity} size="sm" />
                            <span className="text-xs text-ws-muted">{typeCfg?.label}</span>
                            <span
                                className={cx(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                    notification.is_read
                                        ? "bg-ws-muted-surface text-ws-muted"
                                        : "bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-200",
                                )}
                            >
                                {notification.is_read ? "Lue" : "Non lue"}
                            </span>
                        </div>
                        <h2 id="rh-notif-panel-title" className="text-sm font-semibold text-ws-primary">
                            {notification.title}
                        </h2>
                        <p className="text-xs text-ws-muted">
                            Détecté {formatRelativeTimeFr(notification.created_at)} · Source Agent Watchdog
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-ws-muted hover:bg-ws-subtle hover:text-ws-primary"
                        aria-label="Fermer"
                    >
                        <X className="size-5" aria-hidden />
                    </button>
                </header>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                    {notification.message ? (
                        <section>
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ws-faint">Message</h3>
                            <p className="mt-2 text-sm leading-relaxed text-ws-secondary">{notification.message}</p>
                        </section>
                    ) : null}

                    {metaRows.length > 0 ? (
                        <section>
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ws-faint">Détails</h3>
                            <dl className="mt-2 space-y-2 text-sm">
                                {metaRows.map((row) => (
                                    <div key={row.key} className="flex gap-2">
                                        <dt className="w-28 shrink-0 capitalize text-ws-muted">{row.key}</dt>
                                        <dd className="min-w-0 text-ws-secondary">{row.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ) : null}
                </div>

                <footer className="flex shrink-0 flex-wrap gap-2 border-t border-ws-border-subtle p-4">
                    <Button color="secondary" size="sm" onPress={() => navigate(target)}>
                        Voir la ressource
                    </Button>
                    {!notification.is_read ? (
                        <Button
                            color="primary"
                            size="sm"
                            isLoading={markRead.isPending}
                            onPress={() =>
                                void markRead.mutateAsync(notification.id).then(() => onClose())
                            }
                        >
                            Marquer comme lu
                        </Button>
                    ) : null}
                    <Button color="tertiary" size="sm" onPress={onClose}>
                        Fermer
                    </Button>
                </footer>
            </aside>
        </>
    );
}
