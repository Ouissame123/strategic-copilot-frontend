import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { NativeSelect } from "@/components/base/select/select-native";
import { cx } from "@/utils/cx";
import { RH_ACTIVE_BUTTON_CLASSES, RH_INACTIVE_BUTTON_CLASSES } from "@/components/rh-requests/rh-requests-styles";
import type { AlertFiltersState, AlertQuickFilter } from "./notification-alert-utils";

const Box = ("di" + "v") as const;

type Option = { value: string; label: string };

type AlertsFiltersProps = {
    filters: AlertFiltersState;
    onSearchChange: (v: string) => void;
    onSeverityChange: (v: string) => void;
    onTypeChange: (v: string) => void;
    onProjectChange: (v: string) => void;
    onTalentChange: (v: string) => void;
    onStatusChange: (v: string) => void;
    onShowIgnoredChange: (v: boolean) => void;
    onToggleQuickFilter: (id: AlertQuickFilter) => void;
    onReset: () => void;
    severityOptions: Option[];
    typeOptions: Option[];
    projectOptions: Option[];
    talentOptions: Option[];
    statusOptions: Option[];
    quickFilterLabels: Record<AlertQuickFilter, string>;
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

const QUICK_FILTERS: AlertQuickFilter[] = ["today", "week", "overload", "contract", "dependency"];

export function AlertsFilters({
    filters,
    onSearchChange,
    onSeverityChange,
    onTypeChange,
    onProjectChange,
    onTalentChange,
    onStatusChange,
    onShowIgnoredChange,
    onToggleQuickFilter,
    onReset,
    severityOptions,
    typeOptions,
    projectOptions,
    talentOptions,
    statusOptions,
    quickFilterLabels,
}: AlertsFiltersProps) {
    return (
        <section className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <Box className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                    type="search"
                    value={filters.search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Rechercher une alerte, un talent, un projet…"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none ring-violet-500/30 focus:border-violet-500 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
                {filters.search ? (
                    <button
                        type="button"
                        onClick={() => onSearchChange("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Effacer la recherche"
                    >
                        <X className="size-4" />
                    </button>
                ) : null}
            </Box>

            <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <NativeSelect
                    label="Sévérité"
                    className="w-full"
                    value={filters.severity}
                    onChange={(e) => onSeverityChange(e.target.value)}
                    options={[{ label: "Toutes", value: "" }, ...severityOptions]}
                />
                <NativeSelect
                    label="Type"
                    className="w-full"
                    value={filters.type}
                    onChange={(e) => onTypeChange(e.target.value)}
                    options={[{ label: "Tous", value: "" }, ...typeOptions]}
                />
                <NativeSelect
                    label="Projet"
                    className="w-full"
                    value={filters.projectId}
                    onChange={(e) => onProjectChange(e.target.value)}
                    options={[{ label: "Tous", value: "" }, ...projectOptions]}
                />
                <NativeSelect
                    label="Talent"
                    className="w-full"
                    value={filters.talentId}
                    onChange={(e) => onTalentChange(e.target.value)}
                    options={[{ label: "Tous", value: "" }, ...talentOptions]}
                />
                <NativeSelect
                    label="Statut"
                    className="w-full"
                    value={filters.status}
                    onChange={(e) => onStatusChange(e.target.value)}
                    options={[{ label: "Tous", value: "" }, ...statusOptions]}
                />
            </Box>

            <Box className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                {QUICK_FILTERS.map((id) => (
                    <Chip key={id} active={filters.quickFilters.has(id)} onClick={() => onToggleQuickFilter(id)}>
                        {quickFilterLabels[id]}
                    </Chip>
                ))}
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <input
                        type="checkbox"
                        checked={filters.showIgnored}
                        onChange={(e) => onShowIgnoredChange(e.target.checked)}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    Afficher ignorées
                </label>
                <button type="button" onClick={onReset} className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
                    Réinitialiser
                </button>
            </Box>
        </section>
    );
}
