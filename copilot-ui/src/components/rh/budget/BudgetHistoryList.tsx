import type { BudgetAdjustment } from "@/api/rh-budget.api";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { cx } from "@/utils/cx";

type BudgetHistoryListProps = {
    adjustments: BudgetAdjustment[];
    isLoading?: boolean;
};

export function BudgetHistoryList({ adjustments, isLoading }: BudgetHistoryListProps) {
    if (isLoading) {
        return (
            <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                ))}
            </div>
        );
    }

    if (adjustments.length === 0) {
        return (
            <EmptyState size="sm">
                <EmptyState.Header>
                    <EmptyState.Title>Aucun ajustement</EmptyState.Title>
                </EmptyState.Header>
            </EmptyState>
        );
    }

    return (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {adjustments.map((a) => (
                <li key={a.adjustment_id} className="space-y-1 p-4">
                    <div className="flex items-center justify-between">
                        <span
                            className={cx(
                                "font-medium tabular-nums",
                                a.delta > 0 ? "text-emerald-700" : a.delta < 0 ? "text-orange-700" : "text-slate-700",
                            )}
                        >
                            {a.delta > 0 ? "+" : ""}
                            {formatCurrency(a.delta, a.currency)}
                        </span>
                        <span className="text-xs text-slate-500">{formatShortDate(a.adjusted_at)}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                        {formatCurrency(a.amount_before, a.currency)} →{" "}
                        <strong>{formatCurrency(a.amount_after, a.currency)}</strong>
                    </p>
                    <p className="text-sm">{a.reason}</p>
                    <p className="text-xs text-slate-400">par {a.adjusted_by_name}</p>
                </li>
            ))}
        </ul>
    );
}
