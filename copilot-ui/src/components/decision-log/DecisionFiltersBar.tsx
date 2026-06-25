import { useEffect, useRef } from "react";
import { ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { ReasonChip } from "./ReasonChip";


export type DecisionPeriodFilter = "all" | "7d" | "30d" | "90d";

type ProjectOption = { id: string; name: string };

type ReasonTop = { code: string; label: string; count: number };

type DecisionFiltersBarProps = {
    search: string;
    onSearchChange: (value: string) => void;
    filterProject: string;
    onFilterProjectChange: (value: string) => void;
    filterDecision: string;
    onFilterDecisionChange: (value: string) => void;
    filterPeriod: DecisionPeriodFilter;
    onFilterPeriodChange: (value: DecisionPeriodFilter) => void;
    reasonFilter: string | null;
    onReasonFilterChange: (code: string | null) => void;
    reasonsTop: ReasonTop[];
    projects: ProjectOption[];
    filtersActive: boolean;
    onReset: () => void;
    projectLabel: string;
    projectAllLabel: string;
    decisionLabel: string;
    decisionAllLabel: string;
    periodLabel: string;
    resetLabel: string;
};

export function DecisionFiltersBar({
    search,
    onSearchChange,
    filterProject,
    onFilterProjectChange,
    filterDecision,
    onFilterDecisionChange,
    filterPeriod,
    onFilterPeriodChange,
    reasonFilter,
    onReasonFilterChange,
    reasonsTop,
    projects,
    filtersActive,
    onReset,
    projectLabel,
    projectAllLabel,
    decisionLabel,
    decisionAllLabel,
    periodLabel,
    resetLabel,
}: DecisionFiltersBarProps) {
    const searchRef = useRef<HTMLInputElement>(null);
    const filtersRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = document.activeElement?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

            if (e.key === "/") {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === "f" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                filtersRef.current?.querySelector<HTMLSelectElement>("select")?.focus();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const activeDecisionChip =
        filterDecision !== "all"
            ? { label: filterDecision.charAt(0).toUpperCase() + filterDecision.slice(1), key: "decision" as const }
            : null;
    const activeReasonChip = reasonFilter
        ? {
              label: reasonsTop.find((r) => r.code === reasonFilter)?.label || reasonFilter,
              count: reasonsTop.find((r) => r.code === reasonFilter)?.count,
              key: "reason" as const,
          }
        : null;

    const chips = [activeReasonChip, activeDecisionChip].filter(Boolean) as Array<{
        label: string;
        count?: number;
        key: "reason" | "decision";
    }>;

    return (
        <div className="flex flex-col gap-3">
            <div ref={filtersRef} className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative max-w-md flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" aria-hidden />
                    <input
                        ref={searchRef}
                        id="decision-search"
                        type="search"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Rechercher projet, motif, synthèse…"
                        className="h-9 w-full rounded-lg border border-secondary bg-primary py-2 pl-9 pr-12 text-sm text-primary outline-none ring-brand-secondary/30 transition focus:ring-2"
                    />
                    <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-secondary bg-secondary_subtle px-1.5 py-0.5 text-[10px] text-tertiary">
                        /
                    </kbd>
                </div>

                <select
                    value={filterProject}
                    onChange={(e) => onFilterProjectChange(e.target.value)}
                    aria-label={projectLabel}
                    className="h-9 w-full rounded-lg border border-secondary bg-primary px-3 text-sm text-primary lg:w-[180px]"
                >
                    <option value="all">{projectAllLabel}</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>

                <select
                    value={filterDecision}
                    onChange={(e) => onFilterDecisionChange(e.target.value)}
                    aria-label={decisionLabel}
                    className="h-9 w-full rounded-lg border border-secondary bg-primary px-3 text-sm text-primary lg:w-[160px]"
                >
                    <option value="all">{decisionAllLabel}</option>
                    <option value="continue">Continue</option>
                    <option value="adjust">Adjust</option>
                    <option value="stop">Stop</option>
                    <option value="other">Other</option>
                </select>

                <select
                    value={filterPeriod}
                    onChange={(e) => onFilterPeriodChange(e.target.value as DecisionPeriodFilter)}
                    aria-label={periodLabel}
                    className="h-9 w-full rounded-lg border border-secondary bg-primary px-3 text-sm text-primary lg:w-[120px]"
                >
                    <option value="all">Toute période</option>
                    <option value="7d">7 jours</option>
                    <option value="30d">30 jours</option>
                    <option value="90d">90 jours</option>
                </select>

                {filtersActive ? (
                    <Button type="button" color="secondary" size="sm" className="h-9 shrink-0" onClick={onReset}>
                        {resetLabel}
                    </Button>
                ) : (
                    <Button type="button" color="secondary" size="sm" className="h-9 shrink-0" isDisabled>
                        <ListFilter className="mr-1.5 size-3.5" aria-hidden />
                        Filtres
                    </Button>
                )}
            </div>

            {reasonsTop.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-tertiary">Motifs fréquents :</span>
                    {reasonsTop.map((r) => (
                        <ReasonChip
                            key={r.code}
                            code={r.code}
                            label={r.label || r.code}
                            count={r.count}
                            active={reasonFilter === r.code}
                            onClick={() => onReasonFilterChange(reasonFilter === r.code ? null : r.code)}
                            onClear={() => onReasonFilterChange(null)}
                        />
                    ))}
                </div>
            ) : null}

            {chips.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-tertiary">Filtres actifs :</span>
                    {chips.map((chip) => (
                        <span
                            key={chip.key}
                            className="inline-flex items-center gap-1.5 rounded-full border border-brand-secondary/40 bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-secondary"
                        >
                            <span>{chip.label}</span>
                            {chip.count != null ? <span className="tabular-nums text-tertiary">· {chip.count}</span> : null}
                            <button
                                type="button"
                                className="rounded-sm p-0.5 hover:bg-brand-primary/20"
                                aria-label={`Retirer filtre ${chip.label}`}
                                onClick={() => {
                                    if (chip.key === "reason") onReasonFilterChange(null);
                                    else onFilterDecisionChange("all");
                                }}
                            >
                                <X className="size-3" />
                            </button>
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
