import { Search } from "lucide-react";
import {
    readSegmentCount,
    TEAM_SEGMENT_FILTERS,
    type TeamSegmentFilter,
} from "@/lib/manager-team-list-utils";
import type { ManagerTeamListCounts } from "@/types/api.types";
import { cx } from "@/utils/cx";

const ACTIVE_SEGMENT_CLASS: Record<string, string> = {
    slate: "bg-slate-100 font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100",
    red: "bg-red-100 font-medium text-red-700 dark:bg-red-950/50 dark:text-red-200",
    orange: "bg-orange-100 font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-200",
    emerald: "bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
};

type TeamSegmentsBarProps = {
    filter: TeamSegmentFilter;
    onFilterChange: (filter: TeamSegmentFilter) => void;
    counts: ManagerTeamListCounts | undefined;
    searchQuery: string;
    onSearchChange: (query: string) => void;
};

export function TeamSegmentsBar({
    filter,
    onFilterChange,
    counts,
    searchQuery,
    onSearchChange,
}: TeamSegmentsBarProps) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
                {TEAM_SEGMENT_FILTERS.map((segment) => {
                    const active = filter === segment.id;
                    const count = readSegmentCount(counts, segment.id);
                    return (
                        <button
                            key={segment.id}
                            type="button"
                            onClick={() => onFilterChange(segment.id)}
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

            <div className="relative ml-auto min-w-[12rem] flex-1 sm:max-w-xs">
                <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Nom ou email…"
                    className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-violet-900/40"
                />
            </div>
        </div>
    );
}
