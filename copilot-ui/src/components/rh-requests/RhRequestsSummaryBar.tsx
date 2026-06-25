import { AlertTriangle, Clock } from "lucide-react";
import type { RhRequestsSummary } from "@/api/rh-requests-decision.api";
import type { RhRequestStatusBucket } from "@/utils/rh-requests-decision";
import { cx } from "@/utils/cx";

type RhRequestsSummaryBarProps = {
    summary: RhRequestsSummary | null | undefined;
    loading?: boolean;
    onFilterClick: (status: RhRequestStatusBucket | "all") => void;
    onUrgentClick?: () => void;
    onStaleClick?: () => void;
};

function StatChip({
    label,
    value,
    tone = "neutral",
    onClick,
}: {
    label: string;
    value: number;
    tone?: "neutral" | "pending" | "success" | "danger" | "warning";
    onClick?: () => void;
}) {
    const toneClass = {
        neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        pending: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
        success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
        danger: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
        warning: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    }[tone];

    const inner = (
        <>
            <span className="text-lg font-semibold tabular-nums">{value}</span>
            <span className="text-xs opacity-80">{label}</span>
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={cx(
                    "flex min-w-[4.5rem] flex-col items-center rounded-lg px-3 py-2 transition hover:opacity-90",
                    toneClass,
                )}
            >
                {inner}
            </button>
        );
    }

    return (
        <div className={cx("flex min-w-[4.5rem] flex-col items-center rounded-lg px-3 py-2", toneClass)}>
            {inner}
        </div>
    );
}

export function RhRequestsSummaryBar({
    summary,
    loading,
    onFilterClick,
    onUrgentClick,
    onStaleClick,
}: RhRequestsSummaryBarProps) {
    if (loading) {
        return (
            <div className="flex flex-wrap gap-2 rounded-lg border border-secondary/60 bg-secondary_subtle/30 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 w-20 animate-pulse rounded-lg bg-secondary_subtle" />
                ))}
            </div>
        );
    }

    if (!summary) return null;

    const pending = summary.pending ?? summary.open ?? 0;
    const urgent = summary.urgent ?? 0;
    const stale = summary.stale_14d ?? 0;
    const done7d = summary.done_7d ?? 0;

    return (
        <div className="space-y-2 rounded-lg border border-secondary/60 bg-secondary_subtle/20 p-3 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-2">
                <StatChip label="Total" value={summary.total} onClick={() => onFilterClick("all")} />
                <StatChip
                    label="À traiter"
                    value={pending}
                    tone="pending"
                    onClick={() => onFilterClick("pending")}
                />
                <StatChip
                    label="Acceptées"
                    value={summary.accepted ?? 0}
                    tone="success"
                    onClick={() => onFilterClick("accepted")}
                />
                <StatChip
                    label="Rejetées"
                    value={summary.rejected ?? 0}
                    tone="danger"
                    onClick={() => onFilterClick("rejected")}
                />
                {summary.in_progress > 0 ? (
                    <StatChip
                        label="En cours"
                        value={summary.in_progress}
                        tone="warning"
                        onClick={() => onFilterClick("in_progress")}
                    />
                ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
                {urgent > 0 ? (
                    <button
                        type="button"
                        onClick={onUrgentClick}
                        className="inline-flex items-center gap-1.5 font-medium text-red-700 hover:underline dark:text-red-300"
                    >
                        <AlertTriangle size={14} aria-hidden />
                        {urgent} urgent{urgent > 1 ? "s" : ""}
                    </button>
                ) : null}
                {stale > 0 ? (
                    <button
                        type="button"
                        onClick={onStaleClick}
                        className="inline-flex items-center gap-1.5 font-medium text-amber-700 hover:underline dark:text-amber-300"
                    >
                        <Clock size={14} aria-hidden />
                        {stale} stale &gt;14j
                    </button>
                ) : null}
                {done7d > 0 ? (
                    <span className="ml-auto text-xs text-emerald-700 dark:text-emerald-300">
                        ✓ {done7d} traitée{done7d > 1 ? "s" : ""} (7j)
                    </span>
                ) : null}
            </div>
        </div>
    );
}

/** @deprecated Utiliser `RhRequestsSummaryBar`. */
export { RhRequestsSummaryBar as RequestsInsightBar };
