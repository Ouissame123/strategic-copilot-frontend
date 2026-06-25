import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { SeverityBadge } from "@/components/rh/notifications/SeverityBadge";
import { useMarkNotificationAsRead } from "@/hooks/use-rh-notifications";
import { formatRelativeTimeFr } from "@/lib/rh-request-display";
import {
    getNotificationTypeConfig,
    getSeverityConfig,
    resolveNotificationTarget,
} from "@/lib/notification-mapping";
import type { RhNotification } from "@/types/rh-notifications.types";
import { cx } from "@/utils/cx";
import { useNavigate } from "react-router";

type NotificationCardProps = {
    notification: RhNotification;
    onSelect: (n: RhNotification) => void;
    onBulkToggle?: (id: string) => void;
    isBulkSelected?: boolean;
};

export function NotificationCard({
    notification: n,
    onSelect,
    onBulkToggle,
    isBulkSelected,
}: NotificationCardProps) {
    const typeCfg = getNotificationTypeConfig(n.type);
    const sevCfg = getSeverityConfig(n.severity);
    const TypeIcon = typeCfg.icon;
    const markRead = useMarkNotificationAsRead();
    const navigate = useNavigate();

    const goToTarget = () => navigate(resolveNotificationTarget(n));

    return (
        <article
            data-testid="notification-card"
            aria-labelledby={`notif-${n.id}-title`}
            className={cx(
                "group relative overflow-hidden rounded-md border border-ws-border-subtle bg-ws-card transition-all hover:border-ws-border hover:shadow-sm",
                n.is_read && "opacity-75",
                isBulkSelected && "ring-2 ring-ws-accent/40",
            )}
        >
            <div className={cx("absolute top-0 bottom-0 left-0 w-1", sevCfg.borderCls.replace("border-l-", "bg-"))} />

            <div className="pl-4 pr-3 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                        {onBulkToggle ? (
                            <input
                                type="checkbox"
                                checked={Boolean(isBulkSelected)}
                                onChange={() => onBulkToggle(n.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Sélectionner ${n.title}`}
                                className="mt-1 size-3.5 accent-ws-accent"
                            />
                        ) : null}

                        <TypeIcon className={cx("mt-0.5 size-4 shrink-0", typeCfg.iconCls)} aria-hidden />

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                {!n.is_read ? (
                                    <span
                                        className="inline-block size-1.5 rounded-full bg-ws-accent"
                                        aria-label="Non lu"
                                    />
                                ) : null}
                                <SeverityBadge severity={n.severity} size="sm" />
                                <span className="text-ws-faint">·</span>
                                <span className="text-ws-muted">{typeCfg.label}</span>
                                <span className="text-ws-faint">·</span>
                                <time className="text-ws-muted" dateTime={n.created_at}>
                                    {formatRelativeTimeFr(n.created_at)}
                                </time>
                            </div>
                            <h3 id={`notif-${n.id}-title`} className="mt-1 truncate text-sm font-medium text-ws-primary">
                                {n.title}
                            </h3>
                            {n.message ? (
                                <p className="mt-0.5 line-clamp-2 text-xs text-ws-secondary">{n.message}</p>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <Button color="tertiary" size="sm" onPress={() => onSelect(n)}>
                            Voir
                        </Button>
                        <Button color="tertiary" size="sm" data-icon-only aria-label="Ouvrir la ressource" onPress={goToTarget}>
                            <ExternalLink className="size-3.5" aria-hidden />
                        </Button>
                        {!n.is_read ? (
                            <Button
                                color="tertiary"
                                size="sm"
                                data-icon-only
                                aria-label="Marquer comme lu"
                                isDisabled={markRead.isPending}
                                onPress={() => void markRead.mutateAsync(n.id)}
                            >
                                <Check className="size-3.5" aria-hidden />
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </article>
    );
}
