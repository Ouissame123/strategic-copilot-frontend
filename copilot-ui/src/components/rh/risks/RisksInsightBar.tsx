import { AlertTriangle, Clock, Target, TrendingUp } from "lucide-react";
import type { RisksSummary } from "@/api/rh-risks.api";
import type { RiskType } from "@/api/rh-risks.api";

const HINT_CLASS = {
    red: "text-red-700 hover:underline dark:text-red-400",
    orange: "text-orange-700 hover:underline dark:text-orange-400",
    amber: "text-amber-700 hover:underline dark:text-amber-400",
} as const;

type RisksInsightBarProps = {
    summary: RisksSummary | null | undefined;
    onFilterRiskType: (riskType: "all" | RiskType) => void;
};

export function RisksInsightBar({ summary, onFilterRiskType }: RisksInsightBarProps) {
    if (!summary) return null;

    const hints: {
        tone: keyof typeof HINT_CLASS;
        icon: typeof AlertTriangle;
        label: string;
        onClick: () => void;
    }[] = [];

    const critical = summary.critical_count ?? 0;
    const contract7d = summary.contract_expiring_7d ?? 0;
    const criticalSkills = summary.critical_skills_count ?? 0;
    const overload = summary.overload_count ?? 0;

    if (critical > 0) {
        hints.push({
            tone: "red",
            icon: AlertTriangle,
            label: `${critical} critique${critical > 1 ? "s" : ""}`,
            onClick: () => onFilterRiskType("all"),
        });
    }
    if (contract7d > 0) {
        hints.push({
            tone: "orange",
            icon: Clock,
            label: `${contract7d} contrat${contract7d > 1 ? "s" : ""} <7j`,
            onClick: () => onFilterRiskType("contract_expiring"),
        });
    }
    if (criticalSkills > 0) {
        hints.push({
            tone: "amber",
            icon: Target,
            label: `${criticalSkills} compétence${criticalSkills > 1 ? "s" : ""} rare${criticalSkills > 1 ? "s" : ""}`,
            onClick: () => onFilterRiskType("critical_skill"),
        });
    }
    if (overload > 0) {
        hints.push({
            tone: "orange",
            icon: TrendingUp,
            label: `${overload} surchargé${overload > 1 ? "s" : ""}`,
            onClick: () => onFilterRiskType("overload"),
        });
    }

    if (hints.length === 0) {
        return <p className="mt-2 text-xs text-slate-500">✓ Aucun risque RH critique détecté.</p>;
    }

    return (
        <div className="flex flex-wrap items-center gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
            {hints.map((h) => (
                <button
                    key={h.label}
                    type="button"
                    onClick={h.onClick}
                    className={`flex items-center gap-1.5 ${HINT_CLASS[h.tone]}`}
                >
                    <h.icon size={14} aria-hidden />
                    {h.label}
                </button>
            ))}
            {typeof summary.risk_ratio_pct === "number" ? (
                <span className="ml-auto text-xs text-slate-500">{summary.risk_ratio_pct}% des talents actifs en risque</span>
            ) : null}
        </div>
    );
}
