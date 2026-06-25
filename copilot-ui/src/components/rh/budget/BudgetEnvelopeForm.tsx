import { useEffect, useState } from "react";
import type { BudgetProject } from "@/api/rh-budget.api";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { useUpdateBudgetEnvelope } from "@/hooks/useRhBudget";
import { useAuth } from "@/providers/auth-provider";
import { formatCurrency } from "@/utils/format";
import { cx } from "@/utils/cx";
import { RH_INPUT, RH_TEXT_MUTED } from "@/utils/rh-workspace-theme";

type BudgetEnvelopeFormProps = {
    project: BudgetProject;
    onSuccess: () => void;
};

export function BudgetEnvelopeForm({ project, onSuccess }: BudgetEnvelopeFormProps) {
    const [amount, setAmount] = useState(project.budget_rh_planned);
    const [reason, setReason] = useState("");
    const update = useUpdateBudgetEnvelope();
    const { user } = useAuth();

    useEffect(() => {
        setAmount(project.budget_rh_planned);
        setReason("");
    }, [project.project_id, project.budget_rh_planned]);

    const isManager = user?.role === "manager";
    const canSubmit =
        !isManager &&
        reason.trim().length >= 5 &&
        amount >= 0 &&
        amount !== project.budget_rh_planned;

    return (
        <div className="space-y-4 p-4">
            <div className="space-y-1 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                <p>
                    Enveloppe actuelle :{" "}
                    <strong>{formatCurrency(project.budget_rh_planned, project.currency)}</strong>
                </p>
                <p>
                    Consommé : <strong>{formatCurrency(project.budget_rh_actual, project.currency)}</strong> (
                    {project.consumption_pct}%)
                </p>
                <p>
                    Restant : <strong>{formatCurrency(project.budget_rh_remaining, project.currency)}</strong>
                </p>
            </div>

            {isManager ? (
                <p className={cx("text-xs italic", RH_TEXT_MUTED)}>
                    Lecture seule (rôle manager). Seul le RH peut modifier l&apos;enveloppe.
                </p>
            ) : (
                <>
                    <div>
                        <label htmlFor="budget-envelope-amount" className="mb-1 block text-xs font-medium text-slate-600">
                            Nouvelle enveloppe <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                id="budget-envelope-amount"
                                type="number"
                                min={0}
                                step={100}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className={cx("flex-1 px-2.5 py-1.5 text-sm", RH_INPUT)}
                            />
                            <span className="text-xs text-slate-500">{project.currency}</span>
                        </div>
                    </div>

                    {amount !== project.budget_rh_planned ? (
                        <p
                            className={cx(
                                "text-xs",
                                amount > project.budget_rh_planned ? "text-emerald-600" : "text-orange-600",
                            )}
                        >
                            Δ {amount > project.budget_rh_planned ? "+" : ""}
                            {formatCurrency(amount - project.budget_rh_planned, project.currency)}
                        </p>
                    ) : null}

                    <div>
                        <label htmlFor="budget-envelope-reason" className="mb-1 block text-xs font-medium text-slate-600">
                            Raison <span className="text-red-500">*</span>
                        </label>
                        <p className={cx("mb-1 text-[11px]", RH_TEXT_MUTED)}>Min 5 caractères (audit RGPD)</p>
                        <TextArea
                            id="budget-envelope-reason"
                            value={reason}
                            onChange={setReason}
                            placeholder="Ex: ré-évaluation suite à scope reduction Q3"
                            rows={3}
                        />
                    </div>

                    <Button
                        color="primary"
                        size="md"
                        className="w-full"
                        isDisabled={!canSubmit || update.isPending}
                        isLoading={update.isPending}
                        onClick={() =>
                            update.mutate(
                                {
                                    project_id: project.project_id,
                                    budget_rh_planned: amount,
                                    reason,
                                    currency: project.currency,
                                },
                                { onSuccess },
                            )
                        }
                    >
                        Enregistrer l&apos;ajustement
                    </Button>
                </>
            )}
        </div>
    );
}
