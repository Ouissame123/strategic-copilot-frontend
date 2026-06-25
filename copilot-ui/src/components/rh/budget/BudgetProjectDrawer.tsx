import { useState } from "react";
import { X } from "lucide-react";
import type { BudgetProject } from "@/api/rh-budget.api";
import { useBudgetHistory, useBudgetProjectDetail } from "@/hooks/useRhBudget";
import { cx } from "@/utils/cx";
import { RH_MODAL_OVERLAY, RH_TEXT_MUTED, RH_TEXT_PRIMARY } from "@/utils/rh-workspace-theme";
import { BudgetEnvelopeForm } from "./BudgetEnvelopeForm";
import { BudgetHistoryList } from "./BudgetHistoryList";

type BudgetProjectDrawerProps = {
    project: BudgetProject;
    onClose: () => void;
};

export function BudgetProjectDrawer({ project, onClose }: BudgetProjectDrawerProps) {
    const [tab, setTab] = useState<"edit" | "history">("edit");
    const detail = useBudgetProjectDetail(project.project_id);
    const history = useBudgetHistory(project.project_id);

    const displayProject = detail.data?.project ?? project;

    return (
        <div className="fixed inset-0 z-[80] flex justify-end" role="presentation">
            <button type="button" className={cx("absolute inset-0", RH_MODAL_OVERLAY)} aria-label="Fermer" onClick={onClose} />
            <aside
                className="relative flex h-full w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                role="dialog"
                aria-modal="true"
                aria-labelledby="budget-project-drawer-title"
            >
                <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <h2 id="budget-project-drawer-title" className={cx("text-base font-bold", RH_TEXT_PRIMARY)}>
                        {project.name}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={() => setTab("edit")}
                        className={cx(
                            "flex-1 px-4 py-2.5 text-sm font-medium",
                            tab === "edit"
                                ? "border-b-2 border-brand-600 text-brand-700"
                                : "text-slate-500 hover:text-slate-700",
                        )}
                    >
                        Enveloppe
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("history")}
                        className={cx(
                            "flex-1 px-4 py-2.5 text-sm font-medium",
                            tab === "history"
                                ? "border-b-2 border-brand-600 text-brand-700"
                                : "text-slate-500 hover:text-slate-700",
                        )}
                    >
                        Historique
                        {typeof history.data?.count === "number" && history.data.count > 0 ? (
                            <span className="ml-1.5 text-xs opacity-60">({history.data.count})</span>
                        ) : null}
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {tab === "edit" ? (
                        <BudgetEnvelopeForm project={displayProject} onSuccess={onClose} />
                    ) : (
                        <BudgetHistoryList adjustments={history.data?.adjustments ?? []} isLoading={history.isLoading} />
                    )}
                </div>
            </aside>
        </div>
    );
}
