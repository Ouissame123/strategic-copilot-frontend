import { Button } from "@/components/base/buttons/button";
import { getRequestTypeLabel } from "@/lib/rh-request-display";

const SELECT_CLASS =
    "rounded-lg border border-secondary bg-primary px-2.5 py-1.5 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

export const RH_REQUEST_TYPE_FILTER_OPTIONS = [
    { value: "all", label: "Tous les types" },
    { value: "recruitment", label: "Recrutement" },
    { value: "skill_gap", label: "Écart compétences" },
    { value: "training", label: "Formation" },
    { value: "reallocation", label: "Réaffectation" },
    { value: "overload", label: "Surcharge" },
] as const;

export const RH_REQUEST_PRIORITY_FILTER_OPTIONS = [
    { value: "all", label: "Toutes priorités" },
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "Haute" },
    { value: "normal", label: "Normale" },
    { value: "medium", label: "Moyenne" },
    { value: "low", label: "Basse" },
] as const;

export type RhRequestPriorityFilter = (typeof RH_REQUEST_PRIORITY_FILTER_OPTIONS)[number]["value"];

type RequestFiltersProps = {
    search: string;
    onSearchChange: (v: string) => void;
    type: string;
    onTypeChange: (v: string) => void;
    priority: RhRequestPriorityFilter;
    onPriorityChange: (v: RhRequestPriorityFilter) => void;
    project: string;
    onProjectChange: (v: string) => void;
    projectOptions: { id: string; name: string }[];
    onReset: () => void;
};

export function RequestFilters({
    search,
    onSearchChange,
    type,
    onTypeChange,
    priority,
    onPriorityChange,
    project,
    onProjectChange,
    projectOptions,
    onReset,
}: RequestFiltersProps) {
    const hasActiveFilters =
        Boolean(search.trim()) || type !== "all" || priority !== "all" || project !== "all";

    return (
        <div className="flex flex-wrap items-center gap-2">
            <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Message, projet…"
                aria-label="Rechercher"
                data-inbox-search="true"
                className="w-64 max-w-full rounded-lg border border-secondary bg-primary px-2.5 py-1.5 text-sm text-primary outline-none placeholder:text-tertiary focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
            />
            <select
                value={type}
                onChange={(e) => onTypeChange(e.target.value)}
                aria-label="Type"
                className={SELECT_CLASS}
            >
                {RH_REQUEST_TYPE_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.value === "all" ? opt.label : getRequestTypeLabel(opt.value, opt.label)}
                    </option>
                ))}
            </select>
            <select
                value={priority}
                onChange={(e) => onPriorityChange(e.target.value as RhRequestPriorityFilter)}
                aria-label="Priorité"
                className={SELECT_CLASS}
            >
                {RH_REQUEST_PRIORITY_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <select
                value={project}
                onChange={(e) => onProjectChange(e.target.value)}
                aria-label="Projet"
                className={SELECT_CLASS}
            >
                <option value="all">Projet</option>
                {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                ))}
            </select>
            {hasActiveFilters ? (
                <Button color="tertiary" size="sm" className="ml-auto" onPress={onReset}>
                    Réinitialiser
                </Button>
            ) : null}
        </div>
    );
}
