import { useEffect, useRef } from "react";
import { ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import type { ValidationCategory } from "@/services/validations.api";
import type { ValidationsPageFilters, ValidationsUrlTimeFilter } from "./validations-page-data";

const TIME_OPTIONS: { value: ValidationsUrlTimeFilter; label: string }[] = [
    { value: "today", label: "Aujourd'hui" },
    { value: "7d", label: "7 derniers jours" },
    { value: "30d", label: "30 derniers jours" },
    { value: "all", label: "Toutes périodes" },
];

const TYPE_OPTIONS = [
    { value: "rh_action", label: "Action RH" },
    { value: "arbitrage", label: "Arbitrage" },
    { value: "decision", label: "Décision" },
];

const BUCKET_LABELS: Record<ValidationCategory, string> = {
    conflict: "Bloquant",
    missing_justification: "Justif manquante",
    standard: "Standard",
};

type ValidationsFiltersBarProps = {
    filters: ValidationsPageFilters;
    onChange: (next: Partial<ValidationsPageFilters>) => void;
};

export function ValidationsFiltersBar({ filters, onChange }: ValidationsFiltersBarProps) {
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = document.activeElement?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (e.key === "/") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const chips: { key: keyof ValidationsPageFilters; label: string }[] = [];
    if (filters.time_filter && filters.time_filter !== "all") {
        chips.push({
            key: "time_filter",
            label: TIME_OPTIONS.find((o) => o.value === filters.time_filter)?.label ?? filters.time_filter,
        });
    }
    if (filters.type) {
        chips.push({
            key: "type",
            label: TYPE_OPTIONS.find((o) => o.value === filters.type)?.label ?? filters.type,
        });
    }
    if (filters.bucket) {
        chips.push({ key: "bucket", label: BUCKET_LABELS[filters.bucket] });
    }
    if (filters.search?.trim()) {
        chips.push({ key: "search", label: `« ${filters.search.trim()} »` });
    }

    const clearChip = (key: keyof ValidationsPageFilters) => {
        if (key === "time_filter") onChange({ time_filter: "all", page: 1 });
        else if (key === "bucket") onChange({ bucket: undefined, page: 1 });
        else onChange({ [key]: undefined, page: 1 } as Partial<ValidationsPageFilters>);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative max-w-md min-w-[240px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" aria-hidden />
                    <input
                        ref={searchRef}
                        id="validations-search"
                        type="search"
                        value={filters.search ?? ""}
                        onChange={(e) => onChange({ search: e.target.value || undefined, page: 1 })}
                        placeholder="Rechercher projet, motif…"
                        className="h-9 w-full rounded-lg border border-secondary bg-primary py-2 pl-9 pr-12 text-sm text-primary outline-none ring-brand-secondary/30 focus:ring-2"
                    />
                    <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-secondary bg-secondary_subtle px-1.5 py-0.5 text-[10px] text-tertiary">
                        /
                    </kbd>
                </div>

                <select
                    value={filters.time_filter}
                    onChange={(e) => onChange({ time_filter: e.target.value as ValidationsUrlTimeFilter, page: 1 })}
                    aria-label="Période"
                    className="h-9 w-full rounded-lg border border-secondary bg-primary px-3 text-sm text-primary lg:w-[160px]"
                >
                    {TIME_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.type ?? ""}
                    onChange={(e) => onChange({ type: e.target.value || undefined, page: 1 })}
                    aria-label="Type de validation"
                    className="h-9 w-full rounded-lg border border-secondary bg-primary px-3 text-sm text-primary lg:w-[160px]"
                >
                    <option value="">Tous types</option>
                    {TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

                <Button type="button" color="secondary" size="sm" className="h-9 shrink-0" isDisabled>
                    <ListFilter className="mr-1.5 size-3.5" aria-hidden />
                    Filtres
                </Button>
            </div>

            {chips.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-tertiary">Filtres actifs :</span>
                    {chips.map((chip) => (
                        <span
                            key={chip.key}
                            className="inline-flex items-center gap-1.5 rounded-full border border-brand-secondary/40 bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-secondary"
                        >
                            <span>{chip.label}</span>
                            <button
                                type="button"
                                className="rounded-sm p-0.5 hover:bg-brand-primary/20"
                                aria-label={`Retirer filtre ${chip.label}`}
                                onClick={() => clearChip(chip.key)}
                            >
                                <X className="size-3" />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        className="text-xs font-medium text-brand-secondary hover:underline"
                        onClick={() =>
                            onChange({
                                time_filter: "all",
                                type: undefined,
                                bucket: undefined,
                                search: undefined,
                                page: 1,
                            })
                        }
                    >
                        Tout effacer
                    </button>
                </div>
            ) : null}
        </div>
    );
}
