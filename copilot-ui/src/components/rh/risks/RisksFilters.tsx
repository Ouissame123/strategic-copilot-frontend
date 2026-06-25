import type { RiskType, RisksSummary } from "@/api/rh-risks.api";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

const SEGMENTS: {
    id: "all" | RiskType;
    label: string;
    activeClass: string;
}[] = [
    { id: "all", label: "Tous", activeClass: "bg-slate-100 text-slate-700 font-medium dark:bg-slate-800 dark:text-slate-200" },
    { id: "overload", label: "Surcharge", activeClass: "bg-red-100 text-red-700 font-medium dark:bg-red-950/40 dark:text-red-200" },
    {
        id: "contract_expiring",
        label: "Contrats",
        activeClass: "bg-orange-100 text-orange-700 font-medium dark:bg-orange-950/40 dark:text-orange-200",
    },
    {
        id: "critical_skill",
        label: "Compétences rares",
        activeClass: "bg-amber-100 text-amber-800 font-medium dark:bg-amber-950/40 dark:text-amber-200",
    },
    { id: "no_manager", label: "Sans manager", activeClass: "bg-slate-100 text-slate-700 font-medium dark:bg-slate-800 dark:text-slate-200" },
];

function segmentCountKey(id: "all" | RiskType): keyof RisksSummary {
    if (id === "all") return "total_risks";
    if (id === "overload") return "overload_count";
    if (id === "contract_expiring") return "contract_expiring_30d";
    if (id === "critical_skill") return "critical_skills_count";
    return "no_manager_count";
}

const SELECT_CLASS =
    "rounded-lg border border-secondary bg-primary px-2.5 py-1.5 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

type RisksFiltersProps = {
    riskType: "all" | RiskType;
    onRiskTypeChange: (v: "all" | RiskType) => void;
    severity: "all" | string;
    onSeverityChange: (v: string) => void;
    search: string;
    onSearchChange: (v: string) => void;
    counts: RisksSummary | null | undefined;
    onReset: () => void;
};

export function RisksFilters({
    riskType,
    onRiskTypeChange,
    severity,
    onSeverityChange,
    search,
    onSearchChange,
    counts,
    onReset,
}: RisksFiltersProps) {
    const visibleSegments = SEGMENTS.filter((s) => {
        if (s.id === "all") return true;
        const key = segmentCountKey(s.id);
        const count = counts?.[key] ?? 0;
        return count > 0 || riskType === s.id;
    });

    const hasActiveFilters = Boolean(search.trim()) || severity !== "all" || riskType !== "all";

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
                {visibleSegments.map((s) => {
                    const key = segmentCountKey(s.id);
                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => onRiskTypeChange(s.id)}
                            className={cx(
                                "rounded-full px-3 py-1 text-sm transition",
                                riskType === s.id ? s.activeClass : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800",
                            )}
                        >
                            {s.label}
                            {counts ? <span className="ml-1.5 text-xs opacity-60">({counts[key] ?? 0})</span> : null}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Talent…"
                    aria-label="Rechercher un talent"
                    className="w-64 max-w-full rounded-lg border border-secondary bg-primary px-2.5 py-1.5 text-sm text-primary outline-none placeholder:text-tertiary focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
                />
                <select
                    value={severity}
                    onChange={(e) => onSeverityChange(e.target.value)}
                    aria-label="Sévérité"
                    className={SELECT_CLASS}
                >
                    <option value="all">Sévérité</option>
                    <option value="critical">Critique</option>
                    <option value="high">Élevée</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Faible</option>
                </select>
                {hasActiveFilters ? (
                    <Button color="tertiary" size="sm" className="ml-auto" onPress={onReset}>
                        Reset
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
