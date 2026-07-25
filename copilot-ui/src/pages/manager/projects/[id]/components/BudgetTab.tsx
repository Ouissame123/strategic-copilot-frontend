import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { TextArea } from "@/components/base/textarea/textarea";
import {
    usePatchProjectBudget,
    useProjectBudget,
    useProjectBudgetHistory,
    useResetProjectBudget,
} from "@/hooks/useProjectBudget";
import {
    budgetChangeTypeDotClass,
    budgetChangeTypeLabel,
    budgetProgressBarClass,
    budgetZoneBadgeClass,
    formatBudgetEur,
    formatRelativeDate,
    isBudgetAmountValid,
    isProjectBudgetFrozen,
    parseBudgetInput,
} from "@/lib/project-budget-utils";
import { useMissionControlT } from "../use-mission-control-i18n";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { cx } from "@/utils/cx";

type BudgetTabProps = {
    projectId: string;
    projectStatus: string;
};

export function BudgetTab({ projectId, projectStatus }: BudgetTabProps) {
    const { mc } = useMissionControlT();
    const budgetQuery = useProjectBudget(projectId, true);
    const historyQuery = useProjectBudgetHistory(projectId, true);
    const patchBudget = usePatchProjectBudget(projectId);
    const resetBudget = useResetProjectBudget(projectId);

    const budget = budgetQuery.data?.budget;
    const currency = budget?.currency ?? "EUR";

    const [amountInput, setAmountInput] = useState("");
    const [reason, setReason] = useState("");
    const [resetConfirm, setResetConfirm] = useState(false);

    useEffect(() => {
        if (budget) {
            setAmountInput(formatBudgetEur(budget.budget_rh_planned));
            setReason("");
        }
    }, [budget?.budget_rh_planned, projectId]);

    if (budgetQuery.isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {mc("loadingShort")}
            </div>
        );
    }

    if (budgetQuery.isError || !budget) {
        return (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
                <p className="text-sm text-rose-600">{mc("budget.loadError")}</p>
                <button
                    type="button"
                    onClick={() => void budgetQuery.refetch()}
                    className="text-sm text-primary-600 underline"
                >
                    {mc("actions.refresh")}
                </button>
            </div>
        );
    }

    const parsedAmount = parseBudgetInput(amountInput);
    const canEdit = !budget.is_frozen && !isProjectBudgetFrozen(projectStatus);
    const amountChanged = parsedAmount != null && parsedAmount !== budget.budget_rh_planned;
    const canSubmit = canEdit && amountChanged && reason.trim().length >= 5 && isBudgetAmountValid(parsedAmount);

    const consumedPct = Math.min(100, Math.max(0, budget.consumption_pct));

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{mc("budget.title")}</h2>
                    <p className="text-sm text-slate-500">{mc("budget.subtitle")}</p>
                </div>
                <span className={cx("rounded-full border px-2.5 py-1 text-xs font-medium", budgetZoneBadgeClass(budget.zone))}>
                    {budget.badge}
                </span>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <BudgetKpi label={mc("budget.planned")} value={formatCurrency(budget.budget_rh_planned, currency)} />
                <BudgetKpi label={mc("budget.actual")} value={formatCurrency(budget.budget_rh_actual, currency)} />
                <BudgetKpi
                    label={mc("budget.remaining")}
                    value={formatCurrency(budget.budget_rh_remaining, currency)}
                    highlight={budget.budget_rh_remaining < 0 ? "danger" : undefined}
                />
                <BudgetKpi label={mc("budget.consumption")} value={`${budget.consumption_pct} %`} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{mc("budget.progressLabel")}</span>
                    <span>{consumedPct} %</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                        className={budgetProgressBarClass(budget.zone)}
                        style={{ width: `${consumedPct}%` }}
                        role="progressbar"
                        aria-valuenow={consumedPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    />
                </div>
            </div>

            {budgetQuery.data?.breakdown && budgetQuery.data.breakdown.length > 0 ? (
                <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                        {mc("budget.breakdownTitle")}
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                                    <th className="px-4 py-2 font-medium">{mc("budget.colTalent")}</th>
                                    <th className="px-4 py-2 font-medium">{mc("budget.colAllocation")}</th>
                                    <th className="px-4 py-2 font-medium">{mc("budget.colPlanned")}</th>
                                    <th className="px-4 py-2 font-medium">{mc("budget.colActual")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {budgetQuery.data.breakdown.map((line) => (
                                    <tr key={line.talent_id} className="border-b border-slate-50 dark:border-slate-800/60">
                                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                                            {line.talent_name}
                                        </td>
                                        <td className="px-4 py-2.5 tabular-nums text-slate-600">{line.allocation_pct} %</td>
                                        <td className="px-4 py-2.5 tabular-nums text-slate-600">
                                            {formatCurrency(line.cost_planned, currency)}
                                        </td>
                                        <td className="px-4 py-2.5 tabular-nums text-slate-600">
                                            {formatCurrency(line.cost_actual, currency)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {mc("budget.editTitle")}
                    </h3>

                    {!canEdit ? (
                        <p className="text-sm italic text-slate-500">{mc("budget.frozenHint")}</p>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="budget-planned" className="mb-1 block text-xs font-medium text-slate-600">
                                    {mc("budget.newPlanned")} <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="budget-planned"
                                        type="text"
                                        inputMode="decimal"
                                        value={amountInput}
                                        onChange={(e) => setAmountInput(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                                    />
                                    <span className="shrink-0 text-xs text-slate-500">{currency}</span>
                                </div>
                                {amountChanged && parsedAmount != null ? (
                                    <p
                                        className={cx(
                                            "mt-1 text-xs",
                                            parsedAmount > budget.budget_rh_planned ? "text-emerald-600" : "text-orange-600",
                                        )}
                                    >
                                        Δ {parsedAmount > budget.budget_rh_planned ? "+" : ""}
                                        {formatCurrency(parsedAmount - budget.budget_rh_planned, currency)}
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <label htmlFor="budget-reason" className="mb-1 block text-xs font-medium text-slate-600">
                                    {mc("budget.reason")} <span className="text-red-500">*</span>
                                </label>
                                <TextArea
                                    id="budget-reason"
                                    value={reason}
                                    onChange={setReason}
                                    placeholder={mc("budget.reasonPlaceholder")}
                                    rows={3}
                                />
                            </div>

                            <button
                                type="button"
                                disabled={!canSubmit || patchBudget.isPending}
                                onClick={() => {
                                    if (parsedAmount == null) return;
                                    patchBudget.mutate({
                                        budget_rh_planned: parsedAmount,
                                        reason,
                                        currency,
                                    });
                                }}
                                className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {patchBudget.isPending ? mc("budget.saving") : mc("budget.save")}
                            </button>
                        </div>
                    )}

                    {canEdit ? (
                        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                            {!resetConfirm ? (
                                <button
                                    type="button"
                                    onClick={() => setResetConfirm(true)}
                                    className="inline-flex items-center gap-1.5 text-xs text-orange-700 hover:underline"
                                >
                                    <RotateCcw size={14} aria-hidden />
                                    {mc("budget.resetBtn")}
                                </button>
                            ) : (
                                <div className="space-y-2 rounded-lg bg-orange-50 p-3 text-sm dark:bg-orange-950/30">
                                    <p className="text-orange-800 dark:text-orange-200">{mc("budget.resetConfirm")}</p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={resetBudget.isPending}
                                            onClick={() => resetBudget.mutate(undefined, { onSuccess: () => setResetConfirm(false) })}
                                            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                                        >
                                            {mc("budget.resetConfirmBtn")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setResetConfirm(false)}
                                            className="rounded-md px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            {mc("tasks.cancel")}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                        {mc("budget.historyTitle")}
                        {historyQuery.data?.count ? (
                            <span className="ml-1.5 text-xs font-normal text-slate-400">({historyQuery.data.count})</span>
                        ) : null}
                    </h3>

                    {historyQuery.isLoading ? (
                        <div className="space-y-3 p-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-14 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                            ))}
                        </div>
                    ) : (historyQuery.data?.adjustments.length ?? 0) === 0 ? (
                        <p className="p-4 text-sm text-slate-500">{mc("budget.historyEmpty")}</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {historyQuery.data?.adjustments.map((entry) => (
                                <BudgetHistoryRow key={entry.adjustment_id} entry={entry} />
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

function BudgetKpi({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string;
    highlight?: "danger";
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p
                className={cx(
                    "mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100",
                    highlight === "danger" && "text-red-600",
                )}
            >
                {value}
            </p>
        </div>
    );
}

function BudgetHistoryRow({ entry }: { entry: import("@/types/manager-project-budget.types").ManagerProjectBudgetAdjustment }) {
    const rel = formatRelativeDate(entry.adjusted_at);
    return (
        <li className="space-y-1.5 p-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className={cx("size-2 shrink-0 rounded-full", budgetChangeTypeDotClass(entry.change_type))} />
                    <span className="text-xs font-medium text-slate-600">{budgetChangeTypeLabel(entry.change_type)}</span>
                </div>
                <span
                    className={cx(
                        "text-sm font-medium tabular-nums",
                        entry.delta > 0 ? "text-emerald-700" : entry.delta < 0 ? "text-orange-700" : "text-slate-700",
                    )}
                    title={rel.absolute}
                >
                    {entry.delta > 0 ? "+" : ""}
                    {formatCurrency(entry.delta, entry.currency)}
                </span>
            </div>
            <p className="text-xs text-slate-500">
                {formatCurrency(entry.amount_before, entry.currency)} →{" "}
                <strong>{formatCurrency(entry.amount_after, entry.currency)}</strong>
            </p>
            {entry.reason ? <p className="text-sm text-slate-700 dark:text-slate-300">{entry.reason}</p> : null}
            <p className="text-xs text-slate-400">
                {entry.adjusted_by_name} · {formatShortDate(entry.adjusted_at)} ({rel.relative})
            </p>
        </li>
    );
}
