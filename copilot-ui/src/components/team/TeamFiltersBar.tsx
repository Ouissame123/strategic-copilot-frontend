import { RotateCcw, Search } from "lucide-react";
import { TALENT_CARD, TALENT_LABEL } from "@/components/talent/talent-detail-shared";
import type { TeamIpiFilter, TeamStatusFilter } from "@/components/team/team-list-utils";

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

const selectClass = `${inputClass} pr-8`;

const chipClass = (active: boolean) =>
    active
        ? "border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

export interface TeamFiltersBarProps {
    search: string;
    onSearchChange: (value: string) => void;
    contractEndingOnly: boolean;
    onContractEndingChange: (value: boolean) => void;
    overloadedOnly: boolean;
    onOverloadedToggle: () => void;
    statusFilter: TeamStatusFilter;
    onStatusFilterChange: (value: TeamStatusFilter) => void;
    ipiFilter: TeamIpiFilter;
    onIpiFilterChange: (value: TeamIpiFilter) => void;
    onReset: () => void;
    activeFiltersCount?: number;
}

export function TeamFiltersBar({
    search,
    onSearchChange,
    contractEndingOnly,
    onContractEndingChange,
    overloadedOnly,
    onOverloadedToggle,
    statusFilter,
    onStatusFilterChange,
    ipiFilter,
    onIpiFilterChange,
    onReset,
    activeFiltersCount = 0,
}: TeamFiltersBarProps) {
    return (
        <section className={`${TALENT_CARD} p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={TALENT_LABEL}>Filtres</p>
                {activeFiltersCount > 0 ? (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
                        {activeFiltersCount} actif{activeFiltersCount > 1 ? "s" : ""}
                    </span>
                ) : null}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <label className="relative lg:col-span-2">
                    <span className="sr-only">Rechercher</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Nom ou email…"
                        className={`${inputClass} pl-9`}
                    />
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900">
                    <input
                        type="checkbox"
                        checked={contractEndingOnly}
                        onChange={(e) => onContractEndingChange(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 dark:text-slate-200">Contrat proche</span>
                </label>

                <button type="button" onClick={onOverloadedToggle} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${chipClass(overloadedOnly)}`}>
                    Surchargés
                </button>

                <select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value as TeamStatusFilter)}
                    className={selectClass}
                    aria-label="Filtrer par statut"
                >
                    <option value="all">Statut — Tous</option>
                    <option value="green">Sains</option>
                    <option value="orange">À surveiller</option>
                    <option value="red">Risque élevé</option>
                </select>

                <select
                    value={ipiFilter}
                    onChange={(e) => onIpiFilterChange(e.target.value as TeamIpiFilter)}
                    className={selectClass}
                    aria-label="Filtrer par IPI"
                >
                    <option value="all">IPI — Tous</option>
                    <option value="low">IPI &lt; 4</option>
                    <option value="mid">IPI 4–7</option>
                    <option value="high">IPI &gt; 7</option>
                </select>

                <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Reset
                </button>
            </div>
        </section>
    );
}
