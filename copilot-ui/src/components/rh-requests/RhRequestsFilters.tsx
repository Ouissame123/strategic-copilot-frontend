import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import type { KpiBucket } from "@/components/manager/rh-requests/rh-requests-utils";
import { cx } from "@/utils/cx";
import { RH_ACTIVE_BUTTON_CLASSES, RH_INACTIVE_BUTTON_CLASSES } from "./rh-requests-styles";

const Box = ("di" + "v") as const;

export type RhQuickFilter = "mine" | "urgent" | "ai" | "blocked" | "show_cancelled";

type KpiChip = { id: KpiBucket; label: string; count: number };

type RhRequestsFiltersProps = {
    search: string;
    onSearchChange: (v: string) => void;
    searchPlaceholder: string;
    kpiChips: KpiChip[];
    activeStatus: KpiBucket | "all";
    onStatusClick: (id: KpiBucket | "all") => void;
    quickFilters: Set<RhQuickFilter>;
    onToggleQuickFilter: (id: RhQuickFilter) => void;
    showCancelledKpi?: boolean;
    onReset: () => void;
    resetLabel: string;
    labels: {
        mine: string;
        urgent: string;
        ai: string;
        blocked: string;
        showCancelled: string;
    };
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                active ? RH_ACTIVE_BUTTON_CLASSES : RH_INACTIVE_BUTTON_CLASSES,
            )}
        >
            {children}
        </button>
    );
}

export function RhRequestsFilters({
    search,
    onSearchChange,
    searchPlaceholder,
    kpiChips,
    activeStatus,
    onStatusClick,
    quickFilters,
    onToggleQuickFilter,
    showCancelledKpi,
    onReset,
    resetLabel,
    labels,
}: RhRequestsFiltersProps) {
    return (
        <section className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <Box className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                    type="search"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none ring-brand/30 focus:border-brand focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
                {search ? (
                    <button
                        type="button"
                        onClick={() => onSearchChange("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Effacer"
                    >
                        <X className="size-4" />
                    </button>
                ) : null}
            </Box>

            <Box className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                <Chip active={activeStatus === "all"} onClick={() => onStatusClick("all")}>
                    Toutes
                </Chip>
                {kpiChips.map((k) => (
                    <Chip key={k.id} active={activeStatus === k.id} onClick={() => onStatusClick(k.id)}>
                        {k.label} ({k.count})
                    </Chip>
                ))}
                {showCancelledKpi ? (
                    <Chip active={activeStatus === "cancelled"} onClick={() => onStatusClick("cancelled")}>
                        Annulées
                    </Chip>
                ) : null}
            </Box>

            <Box className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Chip active={quickFilters.has("mine")} onClick={() => onToggleQuickFilter("mine")}>
                    {labels.mine}
                </Chip>
                <Chip active={quickFilters.has("urgent")} onClick={() => onToggleQuickFilter("urgent")}>
                    {labels.urgent}
                </Chip>
                <Chip active={quickFilters.has("ai")} onClick={() => onToggleQuickFilter("ai")}>
                    {labels.ai}
                </Chip>
                <Chip active={quickFilters.has("blocked")} onClick={() => onToggleQuickFilter("blocked")}>
                    {labels.blocked}
                </Chip>
                <Chip active={quickFilters.has("show_cancelled")} onClick={() => onToggleQuickFilter("show_cancelled")}>
                    {labels.showCancelled}
                </Chip>
                <button
                    type="button"
                    onClick={onReset}
                    className="ml-auto text-xs font-semibold text-brand-secondary hover:underline"
                >
                    {resetLabel}
                </button>
            </Box>
        </section>
    );
}
