import { Search } from "lucide-react";
import type { BudgetStatus, BudgetSummary } from "@/api/rh-budget.api";
import { cx } from "@/utils/cx";
import { SEGMENTS, SEGMENT_ACTIVE_CLASS, segmentCount } from "./budget-utils";

type BudgetFiltersProps = {
    filter: BudgetStatus | "all";
    onFilterChange: (filter: BudgetStatus | "all") => void;
    search: string;
    onSearchChange: (search: string) => void;
    counts: BudgetSummary | undefined;
};

export function BudgetFilters({ filter, onFilterChange, search, onSearchChange, counts }: BudgetFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {SEGMENTS.map((s) => (
                <button
                    key={s.id}
                    type="button"
                    onClick={() => onFilterChange(s.id)}
                    className={cx(
                        "rounded-full px-3 py-1 text-sm transition",
                        filter === s.id ? SEGMENT_ACTIVE_CLASS[s.tone] : "text-slate-600 hover:bg-slate-100",
                    )}
                >
                    {s.label}
                    {counts ? (
                        <span className="ml-1.5 text-xs opacity-60">({segmentCount(counts, s.id)})</span>
                    ) : null}
                </button>
            ))}
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
                <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-hidden
                />
                <input
                    type="search"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Projet…"
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
            </div>
        </div>
    );
}
