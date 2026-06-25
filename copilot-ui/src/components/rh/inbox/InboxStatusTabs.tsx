import type { RhRequestsSummary } from "@/api/rh-requests-decision.api";
import type { RhRequestStatusBucket } from "@/utils/rh-requests-decision";
import { cx } from "@/utils/cx";

const STATUS_SEGMENTS: {
    id: RhRequestStatusBucket | "all";
    label: string;
    activeClass: string;
}[] = [
    { id: "all", label: "Toutes", activeClass: "bg-ws-muted-surface text-ws-primary font-medium" },
    { id: "pending", label: "À traiter", activeClass: "bg-red-50 text-red-800 font-medium dark:bg-red-950/40 dark:text-red-200" },
    { id: "in_progress", label: "En cours", activeClass: "bg-amber-50 text-amber-900 font-medium dark:bg-amber-950/40 dark:text-amber-200" },
    { id: "accepted", label: "Acceptées", activeClass: "bg-emerald-50 text-emerald-800 font-medium dark:bg-emerald-950/40 dark:text-emerald-200" },
    { id: "rejected", label: "Rejetées", activeClass: "bg-ws-muted-surface text-ws-secondary font-medium" },
];

const MORE_STATUS_OPTIONS: { id: RhRequestStatusBucket; label: string }[] = [
    { id: "done", label: "Terminées" },
    { id: "closed", label: "Clôturées" },
    { id: "cancelled", label: "Annulées" },
];

function summarySegmentCount(summary: RhRequestsSummary, id: RhRequestStatusBucket | "all"): number {
    if (id === "all") return summary.total;
    if (id === "pending") return summary.pending ?? summary.open ?? 0;
    const value = summary[id as keyof RhRequestsSummary];
    return typeof value === "number" ? value : 0;
}

type InboxStatusTabsProps = {
    statusFilter: RhRequestStatusBucket | "all";
    summary: RhRequestsSummary | null | undefined;
    visibleSegmentIds: (RhRequestStatusBucket | "all")[];
    onStatusChange: (status: RhRequestStatusBucket | "all") => void;
};

export function InboxStatusTabs({
    statusFilter,
    summary,
    visibleSegmentIds,
    onStatusChange,
}: InboxStatusTabsProps) {
    const visibleSegments = STATUS_SEGMENTS.filter((s) => visibleSegmentIds.includes(s.id));
    const isMoreStatusActive = MORE_STATUS_OPTIONS.some((o) => o.id === statusFilter);

    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-ws-border-subtle pb-2" role="tablist" aria-label="Filtrer par statut">
            {visibleSegments.map((s) => (
                <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === s.id}
                    onClick={() => onStatusChange(s.id)}
                    className={cx(
                        "rounded-full px-3 py-1 text-sm transition",
                        statusFilter === s.id ? s.activeClass : "text-ws-muted hover:bg-ws-subtle hover:text-ws-secondary",
                    )}
                >
                    {s.label}
                    {summary ? (
                        <span className="ml-1.5 text-xs tabular-nums opacity-60">
                            {summarySegmentCount(summary, s.id)}
                        </span>
                    ) : null}
                </button>
            ))}
            <select
                aria-label="Autres statuts"
                value={isMoreStatusActive ? statusFilter : ""}
                onChange={(e) => {
                    const v = e.target.value as RhRequestStatusBucket;
                    if (v) onStatusChange(v);
                }}
                className={cx(
                    "rounded-full border border-ws-border bg-ws-card px-3 py-1 text-sm outline-none",
                    isMoreStatusActive ? "font-medium text-ws-primary" : "text-ws-muted",
                )}
            >
                <option value="">⋯ Plus</option>
                {MORE_STATUS_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.label}
                        {summary ? ` (${summarySegmentCount(summary, o.id)})` : ""}
                    </option>
                ))}
            </select>
        </div>
    );
}

export { STATUS_SEGMENTS, MORE_STATUS_OPTIONS, summarySegmentCount };
