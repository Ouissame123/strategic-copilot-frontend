import { Plus, RefreshCw, Search } from "lucide-react";
import { MOBILITY_SURFACE } from "@/components/rh/mobility/mobility-board-theme";
import type { RhManagerFilter } from "@/lib/rh-assignments-display";
import { RH_BTN_PRIMARY, RH_BTN_SECONDARY, RH_INPUT, RH_SELECT, RH_TEXT_MUTED } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type StaffingToolbarProps = {
    search: string;
    onSearchChange: (v: string) => void;
    managerFilter: RhManagerFilter;
    onManagerFilterChange: (v: RhManagerFilter) => void;
    refreshing?: boolean;
    onRefresh: () => void;
    onCreate: () => void;
};

export function StaffingToolbar({
    search,
    onSearchChange,
    managerFilter,
    onManagerFilterChange,
    refreshing,
    onRefresh,
    onCreate,
}: StaffingToolbarProps) {
    return (
        <div
            className={cx(
                "sticky top-0 z-20 -mx-0.5 mb-1 py-2",
                "bg-[#f8fafc]/90 backdrop-blur-md supports-[backdrop-filter]:bg-[#f8fafc]/75",
                "dark:bg-slate-950/90 dark:supports-[backdrop-filter]:bg-slate-950/75",
            )}
        >
            <div
                className={cx(
                    MOBILITY_SURFACE,
                    "flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4",
                )}
            >
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1 sm:max-w-md">
                        <Search
                            size={15}
                            className={cx("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2", RH_TEXT_MUTED)}
                            aria-hidden
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Rechercher talent, manager, poste…"
                            className={cx("w-full border-0 bg-slate-50/80 py-2 pl-9 pr-3 text-sm shadow-none dark:bg-slate-800/60", RH_INPUT)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={managerFilter}
                            onChange={(e) => onManagerFilterChange(e.target.value as RhManagerFilter)}
                            className={cx("min-w-[8.5rem] text-xs", RH_SELECT)}
                            aria-label="Filtre manager"
                        >
                            <option value="all">Tous les talents</option>
                            <option value="with_manager">Avec manager</option>
                            <option value="without_manager">Sans manager</option>
                        </select>
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={refreshing}
                            className={cx("rounded-lg p-2", RH_BTN_SECONDARY)}
                            aria-label="Actualiser"
                            title="Actualiser"
                        >
                            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} aria-hidden />
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onCreate}
                    className={cx(
                        "inline-flex shrink-0 items-center justify-center gap-2 self-end px-4 py-2 text-sm font-semibold lg:self-auto",
                        RH_BTN_PRIMARY,
                    )}
                >
                    <Plus size={16} aria-hidden />
                    Nouvelle affectation
                </button>
            </div>
        </div>
    );
}
