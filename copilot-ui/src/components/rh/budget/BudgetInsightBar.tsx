import { AlertCircle, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import type { BudgetStatus, BudgetSummary } from "@/api/rh-budget.api";
import { formatCurrency } from "@/utils/format";
import { INSIGHT_HINT_CLASS } from "./budget-utils";

type BudgetInsightBarProps = {
    summary: BudgetSummary | undefined;
    onFilterClick: (filter: BudgetStatus | "all") => void;
};

export function BudgetInsightBar({ summary, onFilterClick }: BudgetInsightBarProps) {
    if (!summary) return null;

    const hints: {
        tone: keyof typeof INSIGHT_HINT_CLASS;
        icon: typeof AlertTriangle;
        label: string;
        onClick: () => void;
    }[] = [];

    if (summary.projects_exceeded > 0) {
        hints.push({
            tone: "red",
            icon: AlertTriangle,
            label: `${summary.projects_exceeded} dépassé(s)`,
            onClick: () => onFilterClick("exceeded"),
        });
    }
    if (summary.projects_critical > 0) {
        hints.push({
            tone: "orange",
            icon: AlertCircle,
            label: `${summary.projects_critical} critique(s)`,
            onClick: () => onFilterClick("critical"),
        });
    }
    if (summary.projects_unset > 0) {
        hints.push({
            tone: "slate",
            icon: HelpCircle,
            label: `${summary.projects_unset} sans budget`,
            onClick: () => onFilterClick("unset"),
        });
    }
    if (summary.projects_ok > 0) {
        hints.push({
            tone: "emerald",
            icon: CheckCircle,
            label: `${summary.projects_ok} OK`,
            onClick: () => onFilterClick("ok"),
        });
    }

    if (hints.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
            {hints.map((h) => (
                <button
                    key={h.label}
                    type="button"
                    onClick={h.onClick}
                    className={`flex items-center gap-1.5 ${INSIGHT_HINT_CLASS[h.tone]}`}
                >
                    <h.icon size={14} aria-hidden />
                    {h.label}
                </button>
            ))}
            <span className="ml-auto text-xs text-slate-500">
                Total enveloppe : {formatCurrency(summary.total_planned, summary.currency)} · Consommé :{" "}
                {formatCurrency(summary.total_actual, summary.currency)} ({summary.global_consumption_pct}%)
            </span>
        </div>
    );
}
