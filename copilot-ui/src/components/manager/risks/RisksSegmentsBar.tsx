import { Search } from "lucide-react";
import {
    readSegmentCount,
    RISKS_SEGMENT_FILTERS,
    RISKS_STATUS_FILTERS,
    type ManagerRisksCounts,
    type RisksSegmentFilter,
    type RisksStatusFilter,
} from "@/lib/manager-risks-list-utils";
import type { ProjectListItem } from "@/types/api.types";
import { cx } from "@/utils/cx";

const ACTIVE_SEGMENT_CLASS: Record<string, string> = {
    slate: "bg-slate-100 font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100",
    red: "bg-red-100 font-medium text-red-700 dark:bg-red-950/50 dark:text-red-200",
    orange: "bg-orange-100 font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-200",
    violet: "bg-violet-100 font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-200",
};

type RisksSegmentsBarProps = {
    segmentFilter: RisksSegmentFilter;
    onSegmentChange: (filter: RisksSegmentFilter) => void;
    statusFilter: RisksStatusFilter;
    onStatusChange: (filter: RisksStatusFilter) => void;
    counts: ManagerRisksCounts | undefined;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    projectFilter: string;
    onProjectChange: (projectId: string) => void;
    projects: ProjectListItem[];
};

export function RisksSegmentsBar({
    segmentFilter,
    onSegmentChange,
    statusFilter,
    onStatusChange,
    counts,
    searchQuery,
    onSearchChange,
    projectFilter,
    onProjectChange,
    projects,
}: RisksSegmentsBarProps) {
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    {RISKS_SEGMENT_FILTERS.map((segment) => {
                        const active = segmentFilter === segment.id;
                        const count = readSegmentCount(counts, segment.id);
                        return (
                            <button
                                key={segment.id}
                                type="button"
                                onClick={() => onSegmentChange(segment.id)}
                                className={cx(
                                    "rounded-full px-3 py-1 text-sm transition",
                                    active
                                        ? ACTIVE_SEGMENT_CLASS[segment.tone]
                                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                                )}
                            >
                                {segment.label}
                                {typeof count === "number" ? (
                                    <span className="ml-1.5 text-xs opacity-60 tabular-nums">({count})</span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>

                <div className="relative ml-auto min-w-[10rem] flex-1 sm:max-w-[14rem]">
                    <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
                        aria-hidden
                    />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Projet, talent…"
                        className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                </div>

                <select
                    value={projectFilter}
                    onChange={(e) => onProjectChange(e.target.value)}
                    className="min-w-[9rem] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    aria-label="Filtrer par projet"
                >
                    <option value="">Tous projets</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
                {RISKS_STATUS_FILTERS.map((status) => {
                    const active = statusFilter === status.id;
                    return (
                        <button
                            key={status.id}
                            type="button"
                            onClick={() => onStatusChange(status.id)}
                            className={cx(
                                "rounded-full px-2.5 py-0.5 text-xs font-medium transition",
                                active
                                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
                            )}
                        >
                            {status.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
