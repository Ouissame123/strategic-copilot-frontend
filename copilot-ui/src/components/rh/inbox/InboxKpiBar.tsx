import type { RhRequestsSummary } from "@/api/rh-requests-decision.api";
import type { RhRequestStatusBucket } from "@/utils/rh-requests-decision";
import { cx } from "@/utils/cx";
import { LiveStatusDot } from "./LiveStatusDot";

type InboxKpiBarProps = {
    summary: RhRequestsSummary | null | undefined;
    loading?: boolean;
    lastUpdatedAt?: Date | null;
    onFilterClick: (status: RhRequestStatusBucket | "all") => void;
    onUrgentClick?: () => void;
    onStaleClick?: () => void;
    onInProgressClick?: () => void;
};

type KpiCellProps = {
    value: number;
    label: string;
    tone?: "neutral" | "warning" | "success" | "muted" | "critical" | "info";
    pulse?: boolean;
    hidden?: boolean;
    onClick?: () => void;
};

function KpiCell({ value, label, tone = "neutral", pulse, hidden, onClick }: KpiCellProps) {
    if (hidden) return null;

    const toneBg = {
        neutral: "bg-ws-card text-ws-primary",
        warning: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
        success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
        muted: "bg-ws-muted-surface text-ws-secondary",
        critical: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
        info: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
    }[tone];

    const inner = (
        <>
            <span className={cx("text-lg font-semibold tabular-nums font-kpi-mono", pulse && value > 0 && "animate-pulse")}>
                {value}
            </span>
            <span className="text-[11px] text-ws-muted">{label}</span>
        </>
    );

    const cls = cx(
        "flex flex-col items-center justify-center px-3 py-2.5 transition",
        toneBg,
        onClick && "cursor-pointer hover:bg-ws-subtle",
    );

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={cls}>
                {inner}
            </button>
        );
    }
    return <div className={cls}>{inner}</div>;
}

export function InboxKpiBar({
    summary,
    loading,
    lastUpdatedAt,
    onFilterClick,
    onUrgentClick,
    onStaleClick,
    onInProgressClick,
}: InboxKpiBarProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ws-border-subtle bg-ws-border sm:grid-cols-4 lg:grid-cols-7">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-ws-muted-surface" />
                ))}
            </div>
        );
    }

    if (!summary) return null;

    const pending = summary.pending ?? summary.open ?? 0;
    const urgent = summary.urgent ?? 0;
    const stale = summary.stale_14d ?? 0;
    const inProgress = summary.in_progress ?? 0;

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ws-border-subtle bg-ws-border sm:grid-cols-4 lg:grid-cols-7">
                <KpiCell value={summary.total} label="Total" onClick={() => onFilterClick("all")} />
                <KpiCell
                    value={pending}
                    label="À traiter"
                    tone="warning"
                    pulse={pending > 0}
                    onClick={() => onFilterClick("pending")}
                />
                <KpiCell
                    value={inProgress}
                    label="En cours"
                    tone="info"
                    hidden={inProgress === 0}
                    onClick={onProgressClick(onInProgressClick, onFilterClick)}
                />
                <KpiCell
                    value={summary.accepted ?? 0}
                    label="Acceptées"
                    tone="success"
                    onClick={() => onFilterClick("accepted")}
                />
                <KpiCell
                    value={summary.rejected ?? 0}
                    label="Rejetées"
                    tone="muted"
                    onClick={() => onFilterClick("rejected")}
                />
                <KpiCell
                    value={urgent}
                    label="Urgents"
                    tone="critical"
                    hidden={urgent === 0}
                    onClick={onUrgentClick}
                />
                <KpiCell
                    value={stale}
                    label="Stale 14j"
                    tone="warning"
                    hidden={stale === 0}
                    onClick={onStaleClick}
                />
            </div>
            <div className="flex justify-end">
                <LiveStatusDot lastUpdate={lastUpdatedAt} />
            </div>
        </div>
    );
}

function onProgressClick(
    onInProgressClick: (() => void) | undefined,
    onFilterClick: (status: RhRequestStatusBucket | "all") => void,
): () => void {
    return () => {
        if (onInProgressClick) onInProgressClick();
        else onFilterClick("in_progress");
    };
}
