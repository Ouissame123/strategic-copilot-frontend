import { motion } from "motion/react";
import { Search } from "lucide-react";
import type { RhActionRequestType } from "@/api/rh-actions.api";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import type { KpiBucket, PriorityFilter, StatusFilter } from "./rh-requests-utils";
import { cx } from "@/utils/cx";

type RHRequestFiltersProps = {
    filterType: RhActionRequestType | "";
    filterStatus: StatusFilter;
    filterPriority: PriorityFilter;
    searchQuery: string;
    onSearchChange: (v: string) => void;
    onFilterType: (v: RhActionRequestType | "") => void;
    onFilterStatus: (v: StatusFilter) => void;
    onFilterPriority: (v: PriorityFilter) => void;
    onReset: () => void;
    onRefresh: () => void;
    isRefreshing: boolean;
    hasActiveFilters: boolean;
    hideReset?: boolean;
    /** Masque le champ recherche (ex. recherche déplacée au-dessus du tableau). */
    hideSearch?: boolean;
    labels: {
        type: string;
        status: string;
        priority: string;
        all: string;
        reset: string;
        refresh: string;
        search: string;
        searchPlaceholder: string;
    };
    typeOptions: { value: RhActionRequestType; label: string }[];
    statusOptions: { value: KpiBucket; label: string }[];
    priorityOptions: { value: PriorityFilter; label: string }[];
};

export function RHRequestFilters({
    filterType,
    filterStatus,
    filterPriority,
    searchQuery,
    onSearchChange,
    onFilterType,
    onFilterStatus,
    onFilterPriority,
    onReset,
    onRefresh,
    isRefreshing,
    hasActiveFilters,
    hideReset = false,
    hideSearch = false,
    labels,
    typeOptions,
    statusOptions,
    priorityOptions,
}: RHRequestFiltersProps) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
        >
            <div
                className={cx(
                    "grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end",
                )}
            >
                <div className={hideSearch ? "lg:col-span-4" : "lg:col-span-3"}>
                    <NativeSelect
                        label={labels.type}
                        value={filterType}
                        onChange={(e) => onFilterType(e.target.value as RhActionRequestType | "")}
                        selectClassName="rounded-xl border-slate-200 dark:border-slate-700"
                        options={[{ label: labels.all, value: "" }, ...typeOptions.map((x) => ({ label: x.label, value: x.value }))]}
                    />
                </div>
                <div className={hideSearch ? "lg:col-span-4" : "lg:col-span-3"}>
                    <NativeSelect
                        label={labels.status}
                        value={filterStatus}
                        onChange={(e) => onFilterStatus(e.target.value as StatusFilter)}
                        selectClassName="rounded-xl border-slate-200 dark:border-slate-700"
                        options={[
                            { label: labels.all, value: "all" },
                            ...statusOptions.map((x) => ({ label: x.label, value: x.value })),
                        ]}
                    />
                </div>
                <div className={hideSearch ? "lg:col-span-4" : "lg:col-span-3"}>
                    <NativeSelect
                        label={labels.priority}
                        value={filterPriority}
                        onChange={(e) => onFilterPriority(e.target.value as PriorityFilter)}
                        selectClassName="rounded-xl border-slate-200 dark:border-slate-700"
                        options={priorityOptions.map((x) => ({ label: x.label, value: x.value }))}
                    />
                </div>
                {!hideSearch ? (
                    <div className="lg:col-span-3">
                        <label htmlFor="rh-requests-search" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                            {labels.search}
                        </label>
                        <div className="relative">
                            <Search
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                                strokeWidth={2}
                                aria-hidden
                            />
                            <input
                                id="rh-requests-search"
                                type="search"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={labels.searchPlaceholder}
                                className={cx(
                                    "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-xs outline-none transition",
                                    "placeholder:text-slate-400 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/25",
                                    "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
                                )}
                                autoComplete="off"
                            />
                        </div>
                    </div>
                ) : null}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                {hasActiveFilters && !hideReset ? (
                    <Button color="secondary" size="sm" onClick={onReset}>
                        {labels.reset}
                    </Button>
                ) : null}
                <Button color="secondary" size="sm" onClick={onRefresh} isLoading={isRefreshing}>
                    {labels.refresh}
                </Button>
            </div>
        </motion.section>
    );
}
