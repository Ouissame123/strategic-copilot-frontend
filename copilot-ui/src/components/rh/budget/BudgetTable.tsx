import { ChevronRight } from "lucide-react";
import type { BudgetProject } from "@/api/rh-budget.api";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/utils/format";
import { cx } from "@/utils/cx";
import { BORDER_BY_STATUS } from "./budget-utils";
import { BudgetStatusBadge } from "./BudgetStatusBadge";

type BudgetTableProps = {
    projects: BudgetProject[];
    isLoading: boolean;
    onRowClick: (project: BudgetProject) => void;
};

function BudgetTableSkeleton({ count }: { count: number }) {
    return (
        <div className="space-y-2 rounded-md border border-slate-200 p-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ))}
        </div>
    );
}

export function BudgetTable({ projects, isLoading, onRowClick }: BudgetTableProps) {
    if (isLoading) return <BudgetTableSkeleton count={6} />;
    if (projects.length === 0) {
        return (
            <EmptyState size="sm">
                <EmptyState.Header>
                    <EmptyState.Title>Aucun projet pour ce filtre</EmptyState.Title>
                </EmptyState.Header>
            </EmptyState>
        );
    }

    return (
        <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500 dark:bg-slate-800/80">
                    <tr>
                        <th className="px-4 py-2 text-left">Projet</th>
                        <th className="px-4 py-2 text-right">Enveloppe</th>
                        <th className="px-4 py-2 text-right">Consommé</th>
                        <th className="px-4 py-2 text-right">Restant</th>
                        <th className="px-4 py-2 text-right">%</th>
                        <th className="px-4 py-2 text-left">Statut</th>
                        <th className="w-10 px-4 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {projects.map((p) => (
                        <tr
                            key={p.project_id}
                            onClick={() => onRowClick(p)}
                            className={cx(
                                "h-14 cursor-pointer border-b border-slate-100 border-l-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50",
                                BORDER_BY_STATUS[p.budget_status],
                            )}
                        >
                            <td className="px-4">
                                <p className="truncate font-medium">{p.name}</p>
                                <p className="text-xs text-slate-500">
                                    {p.team_count} talent(s) · {p.status}
                                </p>
                            </td>
                            <td className="px-4 text-right tabular-nums">
                                {p.budget_status === "unset" ? "—" : formatCurrency(p.budget_rh_planned, p.currency)}
                            </td>
                            <td className="px-4 text-right tabular-nums">
                                {p.budget_status === "unset" ? "—" : formatCurrency(p.budget_rh_actual, p.currency)}
                            </td>
                            <td
                                className={cx(
                                    "px-4 text-right tabular-nums",
                                    p.budget_rh_remaining < 0 && "font-medium text-red-600",
                                )}
                            >
                                {p.budget_status === "unset" ? "—" : formatCurrency(p.budget_rh_remaining, p.currency)}
                            </td>
                            <td className="px-4 text-right tabular-nums">
                                {p.budget_status === "unset" ? "—" : `${p.consumption_pct}%`}
                            </td>
                            <td className="px-4">
                                <BudgetStatusBadge status={p.budget_status} />
                            </td>
                            <td className="px-4 text-center">
                                <ChevronRight size={14} className="text-slate-400" aria-hidden />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
