import type { ReactNode } from "react";
import { cx } from "@/utils/cx";
import type { RHRequestCardRow } from "./rh-request-card";
import { RhRequestsDataTable, type RhRequestRowModel, type RhRequestsDataTableLabels } from "./rh-requests-data-table";
import type { StatusFilter } from "./rh-requests-utils";

export type RhRequestsTableFilterBarCopy = {
    searchPlaceholder: string;
    empty: string;
    emptyFiltered: string;
};

export type RhRequestsTableFilterLabels = {
    type: string;
    status: string;
    priority: string;
    all: string;
    reset: string;
};

type RhRequestsTableSectionProps = {
    rowCount: number;
    filteredCount: number;
    search: string;
    onSearchChange: (v: string) => void;
    filterType: string;
    onFilterType: (v: string) => void;
    filterStatus: StatusFilter;
    onFilterStatus: (v: StatusFilter) => void;
    filterPriority: string;
    onFilterPriority: (v: string) => void;
    onResetTableFilters: () => void;
    typeFilterOptions: { value: string; label: string }[];
    statusFilterOptions: { value: StatusFilter; label: string }[];
    priorityFilterOptions: { value: string; label: string }[];
    filterLabels: RhRequestsTableFilterLabels;
    tableData: RhRequestRowModel[];
    tableLabels: RhRequestsDataTableLabels;
    tr: (k: string) => string;
    copy: RhRequestsTableFilterBarCopy;
    filterFingerprint: string;
    /** Bandeau KPI (même callbacks filtres) — rendu au-dessus des filtres. */
    kpiSlot?: ReactNode;
    onViewDetails: (row: RHRequestCardRow) => void;
    onCancel: (row: RHRequestCardRow) => void;
    isCancelling: boolean;
    highlightedActionId: string | null;
};

const controlClass = cx(
    "min-w-0 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary placeholder:text-placeholder outline-none",
    "focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
);

export function RhRequestsTableSection({
    rowCount,
    filteredCount,
    search,
    onSearchChange,
    filterType,
    onFilterType,
    filterStatus,
    onFilterStatus,
    filterPriority,
    onFilterPriority,
    onResetTableFilters,
    typeFilterOptions,
    statusFilterOptions,
    priorityFilterOptions,
    filterLabels,
    tableData,
    tableLabels,
    tr,
    copy,
    filterFingerprint,
    kpiSlot,
    onViewDetails,
    onCancel,
    isCancelling,
    highlightedActionId,
}: RhRequestsTableSectionProps) {
    const showEmpty = tableData.length === 0;
    const emptyMessage = rowCount > 0 && filteredCount === 0 ? copy.emptyFiltered : copy.empty;

    return (
        <div className="space-y-4">
            <section className="rounded-xl border border-secondary bg-primary p-4">
                {kpiSlot ? <div className="mb-4 border-b border-secondary pb-4">{kpiSlot}</div> : null}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={copy.searchPlaceholder}
                        aria-label={copy.searchPlaceholder}
                        autoComplete="off"
                        className={cx(controlClass, "xl:col-span-2")}
                    />
                    <select
                        className={controlClass}
                        value={filterType}
                        onChange={(e) => onFilterType(e.target.value)}
                        aria-label={filterLabels.type}
                    >
                        {typeFilterOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                    <select
                        className={controlClass}
                        value={filterStatus}
                        onChange={(e) => onFilterStatus(e.target.value as StatusFilter)}
                        aria-label={filterLabels.status}
                    >
                        {statusFilterOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                    <select
                        className={controlClass}
                        value={filterPriority}
                        onChange={(e) => onFilterPriority(e.target.value)}
                        aria-label={filterLabels.priority}
                    >
                        {priorityFilterOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onResetTableFilters}
                        className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-secondary_subtle"
                    >
                        {filterLabels.reset}
                    </button>
                </div>
            </section>

            {showEmpty ? (
                <div className="rounded-xl border border-dashed border-secondary bg-primary px-4 py-8 text-center">
                    <p className="text-sm text-fg-tertiary">{emptyMessage}</p>
                </div>
            ) : (
                <RhRequestsDataTable
                    data={tableData}
                    labels={tableLabels}
                    tr={tr}
                    onViewDetails={onViewDetails}
                    onCancel={onCancel}
                    isCancelling={isCancelling}
                    pageSize={10}
                    highlightedActionId={highlightedActionId}
                    filterFingerprint={filterFingerprint}
                />
            )}
        </div>
    );
}
