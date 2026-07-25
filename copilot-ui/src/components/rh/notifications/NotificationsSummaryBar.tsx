import type { NotificationsSummary } from "@/types/rh-notifications.types";
import type { NotificationSeverity } from "@/types/rh-notifications.types";
import { cx } from "@/utils/cx";

type NotificationsSummaryBarProps = {
    summary: NotificationsSummary | null | undefined;
    loading?: boolean;
    onUnreadClick: () => void;
    onCriticalClick: () => void;
    onHighClick: () => void;
    onMediumClick: () => void;
    onUrgentClick: () => void;
    onRiskClick: () => void;
};

function KpiCell({
    value,
    label,
    tone = "neutral",
    pulse,
    onClick,
}: {
    value: number;
    label: string;
    tone?: "neutral" | "warning" | "critical" | "info";
    pulse?: boolean;
    onClick?: () => void;
}) {
    const toneBg = {
        neutral: "bg-ws-card text-ws-primary",
        warning: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
        critical: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
        info: "bg-primary-50 text-primary-800 dark:bg-primary-950/40 dark:text-primary-100",
    }[tone];

    const inner = (
        <>
            <span className={cx("text-lg font-semibold tabular-nums font-kpi-mono", pulse && value > 0 && "animate-pulse")}>
                {value}
            </span>
            <span className="text-[11px] text-ws-muted">{label}</span>
        </>
    );

    const cls = cx("flex flex-col items-center justify-center px-3 py-2.5 transition", toneBg, onClick && "cursor-pointer hover:bg-ws-subtle");

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={cls} aria-label={`Filtrer : ${label}`}>
                {inner}
            </button>
        );
    }
    return <div className={cls}>{inner}</div>;
}

export function NotificationsSummaryBar({
    summary,
    loading,
    onUnreadClick,
    onCriticalClick,
    onHighClick,
    onMediumClick,
    onUrgentClick,
    onRiskClick,
}: NotificationsSummaryBarProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ws-border-subtle bg-ws-border sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-ws-muted-surface" />
                ))}
            </div>
        );
    }

    if (!summary) return null;

    const riskCount = (summary.by_type.talents_at_risk ?? 0) + (summary.by_type.contracts_ending ?? 0);

    return (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ws-border-subtle bg-ws-border sm:grid-cols-3 lg:grid-cols-6">
            <KpiCell
                value={summary.unread_count}
                label="Non-lues"
                tone="warning"
                pulse={summary.unread_count > 0}
                onClick={onUnreadClick}
            />
            <KpiCell value={summary.critical_unread} label="Critiques" tone="critical" onClick={onCriticalClick} />
            <KpiCell value={summary.high_unread} label="Élevées" tone="warning" onClick={onHighClick} />
            <KpiCell value={summary.medium_unread} label="Moyennes" tone="info" onClick={onMediumClick} />
            <KpiCell value={summary.by_type.urgent_requests ?? 0} label="Demandes" tone="critical" onClick={onUrgentClick} />
            <KpiCell value={riskCount} label="Risques talent" tone="warning" onClick={onRiskClick} />
        </div>
    );
}

export type { NotificationSeverity };
